import { useState, useRef, useEffect } from 'react';
import GenericCard from '../../../../components/ui/genericCard/GenericCard';
import GenericButton from '../../../../components/ui/genericButton/GenericButton';
// SE ACTUALIZAN LOS ICONOS: Añadimos FileText, Download y Loader2 para el listado de documentos recibidos
import { BookOpen, Upload, CheckCircle, Inbox, FileText, Download, Loader2 } from 'lucide-react';
import type { EnrollmentInfo } from '../../../../services/courseTypes';
// SE IMPORTAN LOS MÉTODOS REALES DE TU DOCUMENTSERVICE.TS Y EL API CLIENT
import {
    getReceivedDocumentsByCourse,
    getSentDocumentsByCourse,
    downloadDocumentSecure
} from '../../../../services/documentService';
import { apiClient } from '../../../../services/apiClient'; // CORRECCIÓN: Importamos apiClient para la llamada directa
// CORRECCIÓN: Importación estricta aislada de tipo para evitar el error verbatimModuleSyntax
import type { DocumentMetadata } from '../../../../services/documentService';


interface CourseAssignmentPanelProps {
    activeCourseId: number | undefined | null;
    enrolledList: EnrollmentInfo[];
}

/**
 * Panel de Seguimiento de Asignatura (Tareas y Exámenes) [ADR-47].
 * Replica la lógica de selección de asignatura reactiva del StudentStatsPanel.
 */
export const CourseAssignmentPanel = ({ activeCourseId, enrolledList }: CourseAssignmentPanelProps) => {
    // Estado reactivo local para el selector de asignaturas [Copiado de StudentStatsPanel]
    const [localSelectedId, setLocalSelectedId] = useState<number | null>(null);

    // Identificar el ID del curso actualmente bajo análisis en la interfaz
    const currentSelectedId = localSelectedId || activeCourseId;

    // Estados operacionales para controlar el tipo de documento y las notas
    const [evaluationType, setEvaluationType] = useState<string>('TRABAJO');
    const [grade] = useState<string>('--');

    // =========================================================================
    // --- ESTADO DE PESTAÑAS CLONADO EXACTAMENTE DE DOCUMENTMANAGER ---
    // =========================================================================
    const [activeTab, setActiveTab] = useState<'RECEIVED' | 'SENT'>('SENT');

    // =========================================================================
    // --- NUEVOS ESTADOS OPERATIVOS PARA LA GESTIÓN DE ARCHIVOS DEL CURSO ---
    // =========================================================================
    const [documentList, setDocumentList] = useState<DocumentMetadata[]>([]);
    const [loadingDocuments, setLoadingDocuments] = useState<boolean>(false);
    const [isUploading, setIsUploading] = useState<boolean>(false);
    const [downloadingId, setDownloadingId] = useState<number | null>(null);
    const [panelError, setPanelError] = useState<string>('');

    // REFERENCIA Y ESTADO: Control del archivo físico adjunto y feedback visual
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    // CICLO REACTIVO: Recupera los archivos reales de la asignatura seleccionada
    useEffect(() => {
        const fetchCourseDocuments = async () => {
            if (!currentSelectedId) return;
            try {
                setLoadingDocuments(true);
                setPanelError('');

                let docs: DocumentMetadata[] = [];
                if (activeTab === 'RECEIVED') {
                    docs = await getReceivedDocumentsByCourse(currentSelectedId);
                } else {
                    docs = await getSentDocumentsByCourse(currentSelectedId);
                }
                setDocumentList(docs);
            } catch (error) {
                // CORRECCIÓN UX: Registramos el error en consola para depuración, 
                // pero evitamos alarmar al usuario con un banner rojo al entrar o conmutar.
                console.error("Error al sincronizar documentos del curso:", error);
            } finally {
                setLoadingDocuments(false);
            }
        };

        fetchCourseDocuments();
    }, [currentSelectedId, activeTab]);


    // Función para simular el click sobre el input oculto al pulsar la dropzone
    const handleBoxClick = () => {
        if (isUploading) return;
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    // CONEXIÓN REAL: Transmite el archivo de forma automática utilizando apiClient
    const handleUploadSubmit = async (fileToSend: File) => {
        if (!fileToSend) {
            setPanelError("Por favor, selecciona un archivo válido.");
            return;
        }

        if (!currentSelectedId) {
            setPanelError("No hay ninguna asignatura activa seleccionada.");
            return;
        }

        try {
            setIsUploading(true);
            setPanelError('');

            const formData = new FormData();
            formData.append('file', fileToSend);
            formData.append('courseId', currentSelectedId.toString());
            formData.append('evaluationType', evaluationType); // Envía "TRABAJO" o "EXAMEN"

            // Llamamos al nuevo endpoint especializado y seguro
            await apiClient.post('/api/v1/documents/upload/assignment', formData);

            setPanelError('');
        } catch (err: unknown) {
            console.error("Fallo en la subida automática:", err);

            // CORRECCIÓN UX: Si el servidor rechaza el archivo, lo eliminamos de la memoria local
            setSelectedFile(null);
            if (fileInputRef.current) {
                fileInputRef.current.value = ''; // Limpia el input HTML para permitir re-seleccionar
            }

            const errorData = err as { response?: { data?: { error?: string } } };
            const serverMessage = errorData.response?.data?.error || "Error al transmitir el documento al servidor.";

            setPanelError(serverMessage);

            // TEMPORIZADOR AUTOMÁTICO: Borra la advertencia de la pantalla tras 7 segundos (7000 ms)
            setTimeout(() => {
                setPanelError('');
            }, 5000);
        }
        finally {
            setIsUploading(false);
        }
    };


    // Almacena temporalmente el archivo seleccionado por el estudiante y lo envía
    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (files && files.length > 0) {
            const file = files[0];
            setSelectedFile(file);
            setPanelError('');

            // Dispara la subida inmediata y automática
            handleUploadSubmit(file);
        }
    };
    // DESCARGA SEGURA ANTI-IDOR REUTILIZADA DE TU DOCUMENTSERVICE.TS
    const handleDownloadSubmit = async (documentId: number, originalName: string) => {
        if (downloadingId !== null) return;
        try {
            setDownloadingId(documentId);
            setPanelError('');

            // 1. Ejecuta la descarga física del archivo
            await downloadDocumentSecure(documentId, originalName);

            // 2. CONEXIÓN DE ALARMA: Notifica al backend para apagar el punto rojo de la campana
            await apiClient.patch(`/api/v1/documents/${documentId}/read`);

            // 3. Opcional: Aquí podrías disparar una función global 'refreshNotificationCount()' 
            // si usas un Contexto o Zustand para que la campana se entere en el acto.

        } catch (error) {
            console.error("Error en la descarga segura de la asignatura:", error);
            setPanelError("No dispones de una matrícula o autorización legítima para descargar este recurso.");
        } finally {
            setDownloadingId(null);
        }
    };

    return (
        <GenericCard className="h-full flex flex-col shadow-sm border-slate-200 pb-2">
            {/* CABECERA PRINCIPAL UNIFICADA CON SELECTOR INTEGRADO */}
            <div className="flex items-center gap-2 mb-6 shrink-0">
                <div className="bg-indigo-50 p-2 rounded-lg">
                    <BookOpen className="text-indigo-600" size={18} />
                </div>
                <div className="flex-1 min-w-0">
                    <h2 className="text-base font-bold text-slate-800 leading-tight truncate uppercase">
                        ASIGNATURAS
                    </h2>
                </div>

                {/* SELECTOR REACTIVO CLONADO DE STUDENTSTATSPANEL */}
                {enrolledList && enrolledList.length > 0 && (
                    <select
                        value={currentSelectedId || ''}
                        onChange={(e) => setLocalSelectedId(Number(e.target.value))}
                        className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-slate-700 outline-hidden cursor-pointer hover:bg-slate-100 transition-colors max-w-45 truncate shrink-0"
                    >
                        {enrolledList.map((enroll) => (
                            <option key={enroll.enrollmentid} value={enroll.course?.course_id}>
                                {enroll.course?.title}
                            </option>
                        ))}
                    </select>
                )}
            </div>
            {/* CONTENEDOR DE LA INTERFAZ DE ACTIVIDADES */}
            {currentSelectedId ? (
                <div className="flex flex-col flex-1 space-y-4 min-h-0">

                    {/* ALERT BOX CONTROLADO DE ERRORES DEL PANEL */}
                    {panelError && (
                        <div className="p-2 bg-red-50 border border-red-200 text-red-700 text-[11px] font-semibold rounded-lg shrink-0">
                            {panelError}
                        </div>
                    )}

                    {/* BOTONERA DE PESTAÑAS (TABS) INTERACTIVAS CONMUTABLE */}
                    <div className="flex flex-col bg-slate-100 p-1 rounded-xl shrink-0 max-w-xs space-y-1">
                        <GenericButton
                            type="button"
                            // Si el estado es 'SENT', cambia a 'RECEIVED'. Si es 'RECEIVED', regresa a 'SENT'
                            onClick={() => setActiveTab(activeTab === 'SENT' ? 'RECEIVED' : 'SENT')}
                            variant="white"
                            icon={<Inbox size={14} />}
                            // El texto cambia de forma dinámica según la vista en la que se encuentre el alumno
                            label={activeTab === 'SENT' ? "Ver Trabajo / Examen Recibido" : "Volver a Enviar Trabajo / Examen"}
                            className="w-full justify-start gap-2 py-1.5 px-3 text-xs! font-bold! rounded-lg! transition-all! cursor-pointer bg-white text-blue-600 shadow-sm"
                        />
                    </div>
                    {/* REJILLA DE CONTENIDOS DE DOS COLUMNAS */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start flex-1 min-h-0">

                        {/* SECCIÓN IZQUIERDA CONMUTABLE */}
                        <div className="space-y-4 border-r pr-0 md:pr-6 border-slate-100 h-full flex flex-col min-h-0">
                            {activeTab === 'SENT' ? (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <select
                                            value={evaluationType}
                                            disabled={isUploading}
                                            onChange={(e) => setEvaluationType(e.target.value)}
                                            className="w-full border border-gray-200 p-3 rounded-xl bg-gray-50 outline-hidden transition-all focus:ring-2 focus:ring-blue-500 text-sm font-semibold text-slate-700 cursor-pointer disabled:opacity-50"
                                        >
                                            <option value="TRABAJO">Trabajo Académico Escrito</option>
                                            <option value="EXAMEN">Examen Final del Curso</option>
                                        </select>
                                    </div>

                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleFileChange}
                                        accept=".pdf,.docx"
                                        className="hidden"
                                        disabled={isUploading}
                                    />

                                    <div
                                        onClick={handleBoxClick}
                                        className={`border-2 border-dashed border-slate-200 rounded-xl p-5 text-center hover:bg-slate-50/50 transition-colors group ${isUploading ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
                                            }`}
                                    >
                                        {isUploading ? (
                                            <>
                                                <Loader2 className="h-7 w-7 text-blue-500 animate-spin mx-auto mb-2" />
                                                <p className="text-xs text-slate-600 font-bold">Transmitiendo payload seguro...</p>
                                                <p className="text-[10px] text-slate-400 mt-0.5">Sincronizando con el servidor Spring Boot</p>
                                            </>
                                        ) : selectedFile ? (
                                            <>
                                                <CheckCircle className="h-7 w-7 text-emerald-500 mx-auto mb-2" />
                                                <p className="text-xs text-slate-700 font-bold truncate max-w-full px-2">{selectedFile.name}</p>
                                                <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">¡Archivo cargado en memoria!</p>
                                            </>
                                        ) : (
                                            <>
                                                <Upload className="h-7 w-7 text-slate-400 mx-auto mb-2 group-hover:text-indigo-500 transition-colors" />
                                                {/* Mensaje principal integrado y unificado */}
                                                <p className="text-xs text-slate-800 font-black uppercase tracking-wider mb-1">
                                                    Enviar Trabajo / Examen
                                                </p>
                                                <p className="text-[11px] text-slate-500 font-semibold">
                                                    Selecciona o suelta tu documento aquí
                                                </p>
                                                <p className="text-[9px] text-slate-400 mt-0.5">
                                                    Formatos admitidos: PDF, DOCX (Máx. 10MB)
                                                </p>
                                            </>
                                        )}
                                    </div>
                                </div>
                            ) : (

                                /* LISTADO REAL DE RECIBIDOS CON SCROLL GEOMÉTRICO ASOCIADO */
                                <div className="flex-1 flex flex-col min-h-0 space-y-2 overflow-y-auto pr-1 custom-scrollbar">
                                    {loadingDocuments ? (
                                        <div className="h-full flex flex-col justify-center items-center text-slate-400 p-4">
                                            <Loader2 size={20} className="animate-spin mb-2 text-blue-600" />
                                            <p className="text-[11px] font-medium text-slate-500">Recuperando expedientes del curso...</p>
                                        </div>
                                    ) : documentList.length === 0 ? (
                                        <div className="p-6 bg-slate-50/50 border border-dashed border-slate-200 rounded-xl text-center flex flex-col justify-center h-full">
                                            <Inbox size={24} className="text-slate-300 mx-auto mb-1.5" />
                                            <p className="text-xs font-bold text-slate-400 italic">
                                                Tu bandeja de recibidos está vacía para esta asignatura.
                                            </p>
                                        </div>
                                    ) : (
                                        documentList.map((doc) => (
                                            <div
                                                key={doc.documentid}
                                                className="flex justify-between items-center p-2.5 bg-white border border-slate-100 hover:border-slate-200 rounded-lg shadow-sm transition-all shrink-0"
                                            >
                                                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                                    <FileText size={16} className="text-slate-400 shrink-0" />
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-xs font-bold text-slate-700 truncate" title={doc.originalname}>
                                                            {doc.originalname}
                                                        </p>
                                                        <p className="text-[10px] text-slate-400 font-medium">
                                                            De: {doc.sender?.username || 'Profesor'}
                                                        </p>
                                                    </div>
                                                </div>
                                                <GenericButton
                                                    type="button"
                                                    onClick={() => handleDownloadSubmit(doc.documentid, doc.originalname)}
                                                    disabled={downloadingId !== null}
                                                    variant="text"
                                                    ariaLabel="Descargar documento seguro"
                                                    icon={downloadingId === doc.documentid ? <Loader2 size={14} className="animate-spin text-blue-600" /> : <Download size={14} />}
                                                    className="p-1.5! text-slate-500! hover:text-blue-600! hover:bg-blue-50! rounded-md! transition-colors! cursor-pointer! ml-2! shrink-0! bg-transparent! shadow-none!"
                                                />
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>

                        {/* SECCIÓN DERECHA: Ventana de Calificaciones Separadas */}
                        <div className="flex flex-col h-full bg-slate-50/40 border border-slate-100 rounded-xl p-5 justify-center space-y-4 shrink-0">
                            <span className="text-[10px] font-black tracking-wider text-slate-400 uppercase text-center block border-b pb-2">
                                CALIFICACIONES
                            </span>

                            {/* Nota de Trabajos */}
                            <div className="flex items-center justify-between bg-white border border-slate-100 p-3 rounded-lg shadow-xs">
                                <span className="text-xs font-bold text-slate-600">Nota de Trabajos:</span>
                                <span className="text-lg font-black text-indigo-600">{grade}</span>
                            </div>

                            {/* Nota de Examen Final */}
                            <div className="flex items-center justify-between bg-white border border-slate-100 p-3 rounded-lg shadow-xs">
                                <span className="text-xs font-bold text-slate-600">Examen Final:</span>
                                <span className="text-lg font-black text-emerald-600">--</span>
                            </div>
                        </div>

                    </div>
                </div>
            ) : (
                <div className="text-center p-8 bg-slate-50 border border-dashed border-slate-200 rounded-xl my-auto">
                    <p className="text-[11px] text-slate-400 font-medium italic">
                        Selecciona una asignatura activa para gestionar el depósito de expedientes y calificaciones.
                    </p>
                </div>
            )}
        </GenericCard>
    );
};
