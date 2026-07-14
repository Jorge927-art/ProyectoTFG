import { useState, useRef } from 'react';
import GenericCard from '../../../../components/ui/genericCard/GenericCard';
import GenericButton from '../../../../components/ui/genericButton/GenericButton';
// MODIFICACIÓN DE ICONOS COMPLETA: Añadimos Inbox y Send clonados de DocumentManager
import { BookOpen, Upload, CheckCircle, Inbox, Send } from 'lucide-react';
import type { EnrollmentInfo } from '../../../../services/courseTypes';

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
    // Controla si se visualiza el envío ('SENT') o la recepción del profesor ('RECEIVED')
    const [activeTab, setActiveTab] = useState<'RECEIVED' | 'SENT'>('SENT');

    // REFERENCIA Y ESTADO: Control del archivo físico adjunto y feedback visual
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    // Función para simular el click sobre el input oculto al pulsar la dropzone
    const handleBoxClick = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    // Almacena temporalmente el archivo seleccionado por el estudiante
    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (files && files.length > 0) {
            setSelectedFile(files[0]);
        }
    };

    return (
        <GenericCard className="h-90 flex flex-col shadow-sm border-slate-200">
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

                    {/* BOTONERA DE PESTAÑAS (TABS) INTERACTIVAS VERTICALES */}
                    <div className="flex flex-col bg-slate-100 p-1 rounded-xl shrink-0 max-w-xs space-y-1">
                        <GenericButton
                            type="button"
                            onClick={() => setActiveTab('SENT')}
                            variant="white"
                            icon={<Send size={14} />}
                            label="Enviar Trabajo / Examen"
                            className={`w-full justify-start gap-2 py-1.5 px-3 text-xs! font-bold! rounded-lg! transition-all! cursor-pointer ${activeTab === 'SENT'
                                ? 'bg-white text-blue-600 shadow-sm'
                                : 'text-slate-500 hover:text-slate-800'
                                }`}
                        />
                        <GenericButton
                            type="button"
                            onClick={() => setActiveTab('RECEIVED')}
                            variant="white"
                            icon={<Inbox size={14} />}
                            label="Ver Trabajo / Examen Recibido"
                            className={`w-full justify-start gap-2 py-1.5 px-3 text-xs! font-bold! rounded-lg! transition-all! cursor-pointer ${activeTab === 'RECEIVED'
                                ? 'bg-white text-blue-600 shadow-sm'
                                : 'text-slate-500 hover:text-slate-800'
                                }`}
                        />
                    </div>

                    {/* REJILLA DE CONTENIDODS DE DOS COLUMNAS */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start flex-1 min-h-0">

                        {/* SECCIÓN IZQUIERDA CONMUTABLE */}
                        <div className="space-y-4 border-r pr-0 md:pr-6 border-slate-100 h-full flex flex-col justify-between">
                            {activeTab === 'SENT' ? (
                                <div className="space-y-4 flex-1">
                                    <div className="flex items-center justify-between">
                                        <select
                                            value={evaluationType}
                                            onChange={(e) => setEvaluationType(e.target.value)}
                                            className="w-full border border-gray-200 p-3 rounded-xl bg-gray-50 outline-hidden transition-all focus:ring-2 focus:ring-blue-500 text-sm font-semibold text-slate-700 cursor-pointer"
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
                                    />

                                    <div
                                        onClick={handleBoxClick}
                                        className="border-2 border-dashed border-slate-200 rounded-xl p-5 text-center hover:bg-slate-50/50 transition-colors cursor-pointer group"
                                    >
                                        {selectedFile ? (
                                            <>
                                                <CheckCircle className="h-7 w-7 text-emerald-500 mx-auto mb-2" />
                                                <p className="text-xs text-slate-700 font-bold truncate max-w-full px-2">{selectedFile.name}</p>
                                                <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">¡Archivo cargado en memoria!</p>
                                            </>
                                        ) : (
                                            <>
                                                <Upload className="h-7 w-7 text-slate-400 mx-auto mb-2 group-hover:text-indigo-500 transition-colors" />
                                                <p className="text-xs text-slate-600 font-bold">Selecciona o suelta tu documento aquí</p>
                                                <p className="text-[10px] text-slate-400 mt-0.5">Formatos admitidos: PDF, DOCX (Máx. 10MB)</p>
                                            </>
                                        )}
                                    </div>

                                    <GenericButton
                                        label={`Enviar ${evaluationType === 'TRABAJO' ? 'Trabajo' : 'Examen'}`}
                                        variant="primary"
                                        className="w-full justify-center! py-2! text-xs! font-bold!"
                                        onClick={() => console.log('Procesando subida del archivo:', selectedFile?.name)}
                                    />
                                </div>
                            ) : (
                                /* BANDEJA DE RECIBIDOS IMPLÍCITA DE ESTA ASIGNATURA */
                                <div className="flex-1 flex flex-col justify-center items-center p-6 border border-dashed border-slate-200 rounded-xl bg-slate-50/50 text-center">
                                    <Inbox size={24} className="text-slate-400 mb-2" />
                                    <p className="text-xs font-bold text-slate-700">Bandeja de Recibidos</p>
                                    <p className="text-[10px] text-slate-400 mt-1 max-w-xs">Aquí aparecerán las correcciones transmitidas por tu profesor en este curso.</p>
                                </div>
                            )}
                        </div>

                        {/* SECCIÓN DERECHA: Ventana de Calificaciones Separadas */}
                        <div className="flex flex-col h-full bg-slate-50/40 border border-slate-100 rounded-xl p-5 justify-center space-y-4">
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
