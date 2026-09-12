import { useState, useRef, useEffect, useCallback } from 'react';
import GenericCard from '../../../../components/ui/genericCard/GenericCard';
import GenericButton from '../../../../components/ui/genericButton/GenericButton';
// SE ACTUALIZAN LOS ICONOS: Añadimos FileText, Download y Loader2 para el listado de documentos recibidos
import { BookOpen, Upload, CheckCircle, Inbox, FileText, Download, Loader2, Send } from 'lucide-react';
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

const DEFAULT_ASSIGNMENT_EVALUATION_TYPE = 'EXAMEN';

/**
 * Panel de Seguimiento de Asignatura (Tareas y Exámenes) [ADR-47].
 * Replica la lógica de selección de asignatura reactiva del StudentStatsPanel.
 */
export const CourseAssignmentPanel = ({ activeCourseId, enrolledList }: CourseAssignmentPanelProps) => {
    // Estado reactivo local para el selector de asignaturas [Copiado de StudentStatsPanel]
    const [localSelectedId, setLocalSelectedId] = useState<number | null>(null);

    // Identificar el ID del curso actualmente bajo análisis en la interfaz
    const currentSelectedId = localSelectedId || activeCourseId;

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
    const [panelSuccess, setPanelSuccess] = useState<string>('');

    // REFERENCIA Y ESTADO: Control del archivo físico adjunto y feedback visual
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    // CICLO REACTIVO: Recupera los archivos reales de la asignatura seleccionada
    const fetchCourseDocuments = useCallback(async () => {
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
            console.error("Error al sincronizar documentos del curso:", error);
            setDocumentList([]);
            setPanelError("No se pudieron cargar los documentos. Inténtalo de nuevo.");
            setTimeout(() => setPanelError(''), 5000);
        } finally {
            setLoadingDocuments(false);
        }
    }, [activeTab, currentSelectedId]);

    useEffect(() => {
        void fetchCourseDocuments();
    }, [fetchCourseDocuments]);


    // Función para simular el click sobre el input oculto al pulsar la dropzone
    const handleBoxClick = () => {
        if (isUploading) return;
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    // CONEXIÓN REAL: Transmite el archivo seleccionado únicamente al pulsar enviar.
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
            setPanelSuccess('');

            const formData = new FormData();
            formData.append('file', fileToSend);
            formData.append('courseId', currentSelectedId.toString());
            formData.append('evaluationType', DEFAULT_ASSIGNMENT_EVALUATION_TYPE);

            // Llamamos al nuevo endpoint especializado y seguro
            await apiClient.post('/api/v1/documents/upload/assignment', formData);

            await fetchCourseDocuments();

            setSelectedFile(null);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
            setPanelError('');
            setPanelSuccess(`Documento enviado correctamente: ${fileToSend.name}.`);
        } catch (err: unknown) {
            console.error("Fallo en la subida del documento:", err);

            // CORRECCIÓN UX: Si el servidor rechaza el archivo, lo eliminamos de la memoria local
            setSelectedFile(null);
            if (fileInputRef.current) {
                fileInputRef.current.value = ''; // Limpia el input HTML para permitir re-seleccionar
            }

            const errorData = err as { response?: { data?: { error?: string } } };
            const serverMessage = errorData.response?.data?.error || "Error al transmitir el documento al servidor.";

            setPanelError(serverMessage);
            setPanelSuccess('');

            // TEMPORIZADOR AUTOMÁTICO: Borra la advertencia de la pantalla tras 7 segundos (7000 ms)
            setTimeout(() => {
                setPanelError('');
            }, 5000);
        }
        finally {
            setIsUploading(false);
        }
    };


    // Almacena temporalmente el archivo seleccionado por el estudiante.
    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (files && files.length > 0) {
            const file = files[0];
            setSelectedFile(file);
            setPanelError('');
            setPanelSuccess('');
        }
    };

    const handleManualSend = async () => {
        if (!selectedFile) {
            setPanelError('Selecciona un archivo antes de enviarlo.');
            return;
        }

        await handleUploadSubmit(selectedFile);
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
        <GenericCard className="h-full flex flex-col shadow-sm border-slate-100 pb-2">
            {/* CABECERA PRINCIPAL UNIFICADA CON SELECTOR INTEGRADO */}
            <div className="flex items-center gap-2 mb-6 shrink-0">
                <div className="bg-blue-50 p-2 rounded-lg">
                    <BookOpen className="text-blue-600" size={18} />
                </div>
                <div className="flex-1 min-w-0">
                    <h2 className="text-base font-bold text-slate-800 leading-tight truncate uppercase">
                        EXAMENES
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
                    {panelSuccess && (
                        <div className="p-2 bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-semibold rounded-lg shrink-0 flex items-center gap-2">
                            <CheckCircle size={14} className="shrink-0" />
                            <span>{panelSuccess}</span>
                        </div>
                    )}

                    {/* BOTONERA DE PESTAÑAS (TABS) INTERACTIVAS */}
                    <div className="flex bg-slate-100 p-1 rounded-xl shrink-0 max-w-xs gap-1">
                        <GenericButton
                            type="button"
                            onClick={() => setActiveTab('RECEIVED')}
                            variant="white"
                            icon={<Inbox size={14} />}
                            label="Recibidos"
                            className={`flex-1 justify-center gap-2 py-1.5 px-3 text-xs! font-bold! rounded-lg! transition-all! cursor-pointer ${activeTab === 'RECEIVED'
                                ? 'bg-white text-blue-600 shadow-sm'
                                : 'text-slate-500 hover:text-slate-800'
                                }`}
                        />
                        <GenericButton
                            type="button"
                            onClick={() => setActiveTab('SENT')}
                            variant="white"
                            icon={<Send size={14} />}
                            label="Enviados"
                            className={`flex-1 justify-center gap-2 py-1.5 px-3 text-xs! font-bold! rounded-lg! transition-all! cursor-pointer ${activeTab === 'SENT'
                                ? 'bg-white text-blue-600 shadow-sm'
                                : 'text-slate-500 hover:text-slate-800'
                                }`}
                        />
                    </div>
                    {/* CONTENEDOR PRINCIPAL DEL FLUJO DOCUMENTAL */}
                    <div className="flex-1 min-h-0">

                        {/* SECCIÓN CONMUTABLE DE DOCUMENTOS */}
                        <div className="space-y-4 h-full flex flex-col min-h-0">
                            {activeTab === 'SENT' ? (
                                <div className="flex h-full min-h-0 flex-col space-y-3">
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleFileChange}
                                        accept="application/pdf,.pdf"
                                        className="hidden"
                                        disabled={isUploading}
                                    />

                                    <div
                                        onClick={handleBoxClick}
                                        className={`border-2 border-dashed border-slate-200 rounded-lg p-2.5 text-center hover:bg-slate-50/50 transition-colors group ${isUploading ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
                                            }`}
                                    >
                                        {isUploading ? (
                                            <>
                                                <Loader2 className="h-5 w-5 text-blue-500 animate-spin mx-auto mb-1" />
                                                <p className="text-[10px] text-slate-600 font-bold">Transmitiendo payload seguro...</p>
                                                <p className="text-[9px] text-slate-400 mt-0.5">Sincronizando con el servidor Spring Boot</p>
                                            </>
                                        ) : selectedFile ? (
                                            <>
                                                <CheckCircle className="h-5 w-5 text-emerald-500 mx-auto mb-1" />
                                                <p className="text-[11px] text-slate-700 font-bold truncate max-w-full px-1.5">{selectedFile.name}</p>
                                                <p className="text-[9px] text-slate-500 font-semibold mt-0.5">Archivo seleccionado para enviar</p>
                                            </>
                                        ) : (
                                            <>
                                                <Upload className="h-5 w-5 text-slate-400 mx-auto mb-1 group-hover:text-blue-500 transition-colors" />
                                                {/* Mensaje principal integrado y unificado */}
                                                <p className="text-[10px] text-slate-800 font-black uppercase tracking-wider mb-0.5">
                                                    Enviar examen
                                                </p>
                                                <p className="text-[9px] text-slate-500 font-semibold">
                                                    Selecciona o suelta tu documento aquí
                                                </p>
                                                <p className="text-[8px] text-slate-400 mt-0.5">
                                                    Formatos admitidos: PDF, DOCX (Máx. 10MB)
                                                </p>
                                            </>
                                        )}
                                    </div>

                                    <GenericButton
                                        type="button"
                                        onClick={() => void handleManualSend()}
                                        disabled={isUploading || !selectedFile}
                                        variant="primary"
                                        icon={isUploading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                                        label={isUploading ? 'Enviando...' : 'Enviar examen'}
                                        className="w-full justify-center gap-2 py-2! text-xs! font-bold! rounded-xl!"
                                    />

                                    <div className="pt-2 border-t border-slate-100 space-y-2 flex-1 min-h-0 flex flex-col">
                                        <div className="flex items-center justify-between">
                                            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Tus envíos</p>
                                            <span className="text-[10px] text-slate-400 font-medium">
                                                {documentList.length} documentos
                                            </span>
                                        </div>

                                        {loadingDocuments ? (
                                            <div className="flex-1 min-h-0 flex flex-col justify-center items-center text-slate-400 p-4 bg-slate-50/50 border border-dashed border-slate-200 rounded-xl">
                                                <Loader2 size={18} className="animate-spin mb-2 text-blue-600" />
                                                <p className="text-[11px] font-medium text-slate-500">Recuperando tus envíos...</p>
                                            </div>
                                        ) : documentList.length === 0 ? (
                                            <div className="flex-1 min-h-0 p-5 bg-slate-50/50 border border-dashed border-slate-200 rounded-xl text-center flex flex-col justify-center">
                                                <Send size={18} className="text-slate-300 mx-auto mb-1.5" />
                                                <p className="text-xs font-bold text-slate-400 italic">
                                                    Todavía no has enviado documentos en esta asignatura.
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="flex-1 min-h-0 space-y-2 overflow-y-auto pr-1 custom-scrollbar">
                                                {documentList.map((doc) => (
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
                                                                    Para: {doc.receiver?.username || 'Profesor'}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wide">
                                                            ENVIADO
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
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
