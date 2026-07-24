import React from 'react';
import { Users, FileText, Download, Award, Loader2, AlertCircle, CheckCircle, GraduationCap, MessageSquare, Send } from 'lucide-react';
import GenericCard from '../../../../components/ui/genericCard/GenericCard';
import GenericButton from '../../../../components/ui/genericButton/GenericButton';
import { useGradingCenter } from './useGradingCenter';
import { downloadDocumentSecure } from '../../../../services/documentService';
import type { TaughtCourse } from '../../../../services/userDomains';

interface GradingCenterProps {
    courseId: number | null;
    availableCourses: TaughtCourse[];
    onCourseChange: (courseId: number | null) => void;
}

export const GradingCenter: React.FC<GradingCenterProps> = ({
    courseId,
    availableCourses,
    onCourseChange
}) => {
    const {
        students,
        selectedStudent,
        studentDocuments,
        loadingData,
        loadingDocs,
        isSubmitting,
        errorMessage,
        successMessage,
        evaluationTitle,
        setEvaluationTitle,
        score,
        setScore,
        feedback,
        setFeedback,
        selectedFile,
        isUploadingDocument,
        handleFileSelection,
        handleSendDocument,
        handleSelectStudentById,
        handleGradeSubmit
    } = useGradingCenter(courseId);

    const selectedCourseValue = courseId ? String(courseId) : '';
    const selectedStudentValue = selectedStudent ? String(selectedStudent.userId) : '';

    return (
        <div className="space-y-4">
            <GenericCard className="space-y-3">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <Users size={16} className="text-blue-600" />
                    Selectores de trabajo
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1">
                        <label htmlFor="professor-course-selector" className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                            Asignatura del profesor
                        </label>
                        <select
                            id="professor-course-selector"
                            value={selectedCourseValue}
                            onChange={(event) => {
                                const value = event.target.value;
                                onCourseChange(value ? Number(value) : null);
                            }}
                            className="w-full text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg p-2 focus:outline-none focus:border-blue-400"
                        >
                            <option value="">Selecciona una asignatura</option>
                            {availableCourses.map((course) => (
                                <option key={course.id} value={course.id}>
                                    {course.title}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-1">
                        <label htmlFor="professor-student-selector" className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                            Alumno de la asignatura seleccionada
                        </label>
                        <select
                            id="professor-student-selector"
                            value={selectedStudentValue}
                            disabled={!courseId || loadingData || students.length === 0}
                            onChange={(event) => {
                                const value = event.target.value;
                                if (!value) return;
                                void handleSelectStudentById(Number(value));
                            }}
                            className="w-full text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg p-2 focus:outline-none focus:border-blue-400 disabled:bg-slate-100 disabled:text-slate-400"
                        >
                            <option value="">{!courseId ? 'Primero selecciona asignatura' : 'Selecciona un alumno'}</option>
                            {students.map((student) => (
                                <option key={student.userId} value={student.userId}>
                                    {student.username} ({student.email})
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </GenericCard>

            {/* CAJAS DE ALERTA PARA ERRORES O PROCESOS EXITOSOS */}
            {errorMessage && (
                <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-lg flex items-center gap-2">
                    <AlertCircle size={14} className="shrink-0" />
                    <p className="truncate">{errorMessage}</p>
                </div>
            )}
            {successMessage && (
                <div className="p-2.5 bg-green-50 border border-green-200 text-green-700 text-xs font-semibold rounded-lg flex items-center gap-2">
                    <CheckCircle size={14} className="shrink-0" />
                    <p className="truncate">{successMessage}</p>
                </div>
            )}

            <GenericCard className="space-y-3">
                <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                    <FileText size={18} className="text-blue-600" />
                    Envio y recepcion de trabajos y examenes
                </h2>

                {!courseId || !selectedStudent ? (
                    <div className="border border-dashed border-slate-200 rounded-lg p-4 text-xs text-slate-500 text-center">
                        Selecciona una asignatura y un alumno para habilitar el envio y la recepcion de documentos.
                    </div>
                ) : (
                    <div className="space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <label htmlFor="professor-doc-upload" className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                    Documento (PDF)
                                </label>
                                <input
                                    id="professor-doc-upload"
                                    type="file"
                                    accept="application/pdf,.pdf"
                                    onChange={(event) => handleFileSelection(event.target.files?.[0] ?? null)}
                                    className="w-full text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg p-1.5"
                                />
                                {selectedFile && (
                                    <p className="text-[10px] text-slate-500 truncate">Archivo preparado: {selectedFile.name}</p>
                                )}
                            </div>

                            <div className="flex items-end">
                                <GenericButton
                                    type="button"
                                    onClick={() => void handleSendDocument()}
                                    disabled={!selectedFile || isUploadingDocument}
                                    variant="primary"
                                    label={isUploadingDocument ? 'Enviando documento...' : 'Enviar al alumno seleccionado'}
                                    icon={isUploadingDocument ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                                    className="w-full justify-center text-xs! font-bold! py-2!"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                Recepcion de entregas del alumno seleccionado
                            </p>
                            <div className="max-h-36 overflow-y-auto pr-1 bg-white border border-slate-200 rounded-lg p-1.5 space-y-1.5">
                                {loadingDocs ? (
                                    <div className="flex items-center gap-1.5 justify-center py-2 text-slate-400">
                                        <Loader2 size={12} className="animate-spin text-blue-600" />
                                        <span className="text-[10px]">Cargando archivos...</span>
                                    </div>
                                ) : studentDocuments.length === 0 ? (
                                    <p className="text-[10px] text-slate-400 italic text-center py-2">
                                        El alumno seleccionado no ha entregado archivos todavia.
                                    </p>
                                ) : (
                                    studentDocuments.map((doc) => (
                                        <div key={doc.documentid} className="flex justify-between items-center p-1.5 bg-slate-50 rounded border border-slate-100 text-[11px]">
                                            <span className="font-semibold text-slate-600 truncate max-w-[70%]">{doc.originalname}</span>
                                            <GenericButton
                                                type="button"
                                                onClick={() => downloadDocumentSecure(doc.documentid, doc.originalname)}
                                                variant="white"
                                                icon={<Download size={11} className="text-blue-600" />}
                                                className="p-1! bg-white border border-slate-200 rounded cursor-pointer"
                                            />
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </GenericCard>

            <GenericCard className="space-y-3">
                <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                    <Award size={18} className="text-blue-600" />
                    Calificaciones
                </h2>

                {!selectedStudent ? (
                    <div className="border border-dashed border-slate-200 rounded-lg p-4 text-xs text-slate-500 text-center">
                        Selecciona un alumno para habilitar el envio de notas.
                    </div>
                ) : (
                    <form onSubmit={handleGradeSubmit} className="space-y-3">
                        <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                            <p className="text-[11px] font-bold text-slate-700">
                                Envio de nota para: <span className="text-blue-600">{selectedStudent.username}</span>
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <label htmlFor="eval-title" className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Tipo Evaluacion</label>
                                <select
                                    id="eval-title"
                                    value={evaluationTitle}
                                    onChange={(e) => setEvaluationTitle(e.target.value)}
                                    className="w-full text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg p-1.5 focus:outline-none focus:border-blue-400"
                                >
                                    <option value="Trabajo Académico Escrito">Trabajo Escrito</option>
                                    <option value="Examen Final">Examen Final</option>
                                </select>
                            </div>

                            <div className="space-y-1">
                                <label htmlFor="eval-score" className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Calificacion (0-10)</label>
                                <input
                                    id="eval-score"
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    max="10"
                                    required
                                    placeholder="Ej: 8.5"
                                    value={score}
                                    onChange={(e) => setScore(e.target.value)}
                                    className="w-full text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg p-1.5 focus:outline-none focus:border-blue-400"
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label htmlFor="eval-feedback" className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                                <MessageSquare size={12} /> Feedback del profesor
                            </label>
                            <textarea
                                id="eval-feedback"
                                placeholder="Introduce la justificacion de la nota..."
                                value={feedback}
                                onChange={(e) => setFeedback(e.target.value)}
                                className="w-full text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg p-2 focus:outline-none focus:border-blue-400 resize-none min-h-20"
                            />
                        </div>

                        <GenericButton
                            type="submit"
                            disabled={isSubmitting}
                            variant="primary"
                            label={isSubmitting ? 'Enviando nota...' : 'Enviar calificacion'}
                            icon={isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <GraduationCap size={14} />}
                            className="w-full justify-center text-xs! font-bold! py-2!"
                        />
                    </form>
                )}
            </GenericCard>
        </div>
    );
};
