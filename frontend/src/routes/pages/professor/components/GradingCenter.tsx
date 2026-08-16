import React from 'react';
import { Users, FileText, Download, Award, Loader2, AlertCircle, CheckCircle, GraduationCap, MessageSquare, Send } from 'lucide-react';
import GenericCard from '../../../../components/ui/genericCard/GenericCard';
import GenericButton from '../../../../components/ui/genericButton/GenericButton';
import { PROFESSOR_FEEDBACK_MAX_LENGTH, useGradingCenter } from './useGradingCenter';
import { downloadDocumentSecure } from '../../../../services/documentService';
import type { TaughtCourse } from '../../../../services/userDomains';

interface GradingCenterProps {
    courseId: number | null;
    availableCourses: TaughtCourse[];
    onCourseChange: (courseId: number | null) => void;
    autoFocusDocuments?: boolean;
    focusStudentUserId?: number | null;
    focusDocumentId?: number | null;
}

export const GradingCenter: React.FC<GradingCenterProps> = ({
    courseId,
    availableCourses,
    onCourseChange,
    autoFocusDocuments = false,
    focusStudentUserId = null,
    focusDocumentId = null,
}) => {
    const {
        students,
        selectedStudent,
        studentDocuments,
        loadingData,
        loadingDocs,
        isSubmitting,
        gradeSubmitFeedbackStatus,
        errorMessage,
        successMessage,
        evaluationTitle,
        setEvaluationTitle,
        score,
        setScore,
        feedback,
        setFeedback,
        finalExamWeight,
        setFinalExamWeight,
        calculatorMessage,
        calculatorMessageType,
        calculatorSnapshot,
        selectedFile,
        isUploadingDocument,
        handleFileSelection,
        handleSendDocument,
        handleSelectStudentById,
        handleCalculateFinalGrade,
        handleGradeSubmit
    } = useGradingCenter(courseId);

    const [highlightedDocumentId, setHighlightedDocumentId] = React.useState<number | null>(null);
    const highlightTimeoutRef = React.useRef<number | null>(null);
    const rowRefs = React.useRef<Record<number, HTMLDivElement | null>>({});

    React.useEffect(() => {
        if (!autoFocusDocuments || !courseId || students.length === 0 || selectedStudent) {
            return;
        }

        const preferredStudent =
            (focusStudentUserId ? students.find((student) => student.userId === focusStudentUserId) : undefined)
            ?? students[0];

        if (!preferredStudent) {
            return;
        }

        void handleSelectStudentById(preferredStudent.userId);
    }, [autoFocusDocuments, courseId, focusStudentUserId, handleSelectStudentById, selectedStudent, students]);

    React.useEffect(() => {
        if (!autoFocusDocuments || loadingDocs || studentDocuments.length === 0) {
            return;
        }

        const targetDoc =
            (focusDocumentId ? studentDocuments.find((doc) => doc.documentid === focusDocumentId) : undefined)
            ?? studentDocuments.find((doc) => !doc.isRead)
            ?? studentDocuments[0];
        if (!targetDoc) {
            return;
        }

        setHighlightedDocumentId(targetDoc.documentid);
        rowRefs.current[targetDoc.documentid]?.scrollIntoView({ behavior: 'smooth', block: 'center' });

        if (highlightTimeoutRef.current) {
            window.clearTimeout(highlightTimeoutRef.current);
        }

        highlightTimeoutRef.current = window.setTimeout(() => {
            setHighlightedDocumentId((prev) => (prev === targetDoc.documentid ? null : prev));
        }, 2600);
    }, [autoFocusDocuments, focusDocumentId, loadingDocs, studentDocuments]);

    React.useEffect(() => {
        return () => {
            if (highlightTimeoutRef.current) {
                window.clearTimeout(highlightTimeoutRef.current);
            }
        };
    }, []);

    const selectedCourseValue = courseId ? String(courseId) : '';
    const selectedStudentValue = selectedStudent ? String(selectedStudent.userId) : '';
    const gradeSubmitButtonFeedbackClass = gradeSubmitFeedbackStatus === 'success'
        ? '!bg-emerald-600 hover:!bg-emerald-700'
        : gradeSubmitFeedbackStatus === 'error'
            ? '!bg-red-600 hover:!bg-red-700'
            : '';
    const calculatorMessageClass = calculatorMessageType === 'success'
        ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
        : calculatorMessageType === 'info'
            ? 'bg-amber-50 border-amber-200 text-amber-700'
            : 'bg-red-50 border-red-200 text-red-700';

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
                    Envío y recepción de exámenes
                </h2>

                {!courseId ? (
                    <div className="border border-dashed border-slate-200 rounded-lg p-4 text-xs text-slate-500 text-center">
                        Selecciona una asignatura para habilitar el envio y la recepcion de documentos.
                    </div>
                ) : (
                    <div className="space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="space-y-1 md:col-span-2">
                                <label htmlFor="professor-doc-upload" className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                    Examen (PDF o vídeo)
                                </label>
                                <input
                                    id="professor-doc-upload"
                                    type="file"
                                    accept="application/pdf,.pdf"
                                    onChange={(event) => handleFileSelection(event.target.files?.[0] ?? null)}
                                    className="w-full text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg p-1.5"
                                />
                                {selectedFile && (
                                    <div className="mt-2 flex flex-col items-center gap-1 rounded-lg border border-emerald-100 bg-emerald-50/50 px-2 py-2">
                                        <CheckCircle className="text-emerald-500" size={20} />
                                        <p className="text-[11px] font-bold text-slate-700 truncate max-w-full">Archivo preparado: {selectedFile.name}</p>
                                        <p className="text-[10px] font-semibold text-slate-500">Archivo seleccionado para enviar</p>
                                    </div>
                                )}
                            </div>

                            <div className="flex items-end md:col-span-2">
                                <GenericButton
                                    type="button"
                                    onClick={() => void handleSendDocument()}
                                    disabled={!selectedFile || isUploadingDocument || !selectedStudent}
                                    variant="primary"
                                    label={isUploadingDocument ? 'Enviando examen...' : 'Enviar examen al alumno seleccionado'}
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
                                        <div
                                            key={doc.documentid}
                                            ref={(node) => {
                                                rowRefs.current[doc.documentid] = node;
                                            }}
                                            data-testid={`grading-document-row-${doc.documentid}`}
                                            className={`flex justify-between items-center p-1.5 rounded border text-[11px] transition-colors ${highlightedDocumentId === doc.documentid
                                                ? 'bg-amber-50/60 border-amber-300'
                                                : 'bg-slate-50 border-slate-100'
                                                }`}
                                        >
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
                                    <option value="Nota Final Asignatura">Nota Final Asignatura</option>
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
                                <MessageSquare size={12} /> Aclaracion del profesor
                            </label>
                            <textarea
                                id="eval-feedback"
                                placeholder="Introduce la justificacion de la nota..."
                                value={feedback}
                                onChange={(e) => setFeedback(e.target.value.slice(0, PROFESSOR_FEEDBACK_MAX_LENGTH))}
                                maxLength={PROFESSOR_FEEDBACK_MAX_LENGTH}
                                className="w-full text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg p-2 focus:outline-none focus:border-blue-400 resize-none min-h-20"
                            />
                            <p className="text-[10px] text-slate-400 text-right">
                                {feedback.length}/{PROFESSOR_FEEDBACK_MAX_LENGTH}
                            </p>
                        </div>

                        <GenericButton
                            type="submit"
                            disabled={isSubmitting}
                            variant="primary"
                            label={isSubmitting ? 'Enviando nota...' : 'Enviar calificacion'}
                            icon={isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <GraduationCap size={14} />}
                            className={`w-full justify-center text-xs! font-bold! py-2! ${gradeSubmitButtonFeedbackClass}`}
                        />
                    </form>
                )}
            </GenericCard>

            <GenericCard className="space-y-3">
                <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                    <Award size={18} className="text-indigo-600" />
                    Calculadora nota final
                </h2>

                {!selectedStudent ? (
                    <div className="border border-dashed border-slate-200 rounded-lg p-4 text-xs text-slate-500 text-center">
                        Selecciona un alumno para habilitar la calculadora de nota final.
                    </div>
                ) : (
                    <div className="space-y-3">
                        <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                            <p className="text-[11px] font-bold text-slate-700">
                                Cálculo asistido para: <span className="text-indigo-600">{selectedStudent.username}</span>
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div className="rounded-lg border border-slate-100 bg-white p-2.5">
                                <p className="text-[10px] font-black uppercase tracking-wide text-slate-500 mb-1">Media trabajos</p>
                                <span className="text-sm font-black text-slate-800">
                                    {calculatorSnapshot.workAverage !== null ? `${calculatorSnapshot.workAverage.toFixed(1)} / 10` : 'Sin trabajos'}
                                </span>
                            </div>

                            <div className="rounded-lg border border-slate-100 bg-white p-2.5">
                                <p className="text-[10px] font-black uppercase tracking-wide text-slate-500 mb-1">Examen final</p>
                                <span className="text-sm font-black text-slate-800">
                                    {calculatorSnapshot.examGrade !== null ? `${calculatorSnapshot.examGrade.toFixed(1)} / 10` : 'Sin examen'}
                                </span>
                            </div>

                            <div className="rounded-lg border border-slate-100 bg-white p-2.5">
                                <p className="text-[10px] font-black uppercase tracking-wide text-slate-500 mb-1">Trabajos detectados</p>
                                <span className="text-sm font-black text-slate-800">{calculatorSnapshot.workGrades.length}</span>
                            </div>
                        </div>

                        {calculatorMessage && (
                            <div className={`p-2.5 border rounded-lg text-xs font-semibold ${calculatorMessageClass}`}>
                                {calculatorMessage}
                            </div>
                        )}

                        {calculatorSnapshot.examGrade !== null && (
                            <div className="rounded-lg border border-indigo-100 bg-indigo-50/60 p-3 space-y-1.5">
                                <p className="text-[10px] font-black uppercase tracking-wide text-indigo-700">
                                    Previsualización de la fórmula
                                </p>

                                {calculatorSnapshot.workAverage !== null ? (
                                    <p className="text-xs font-semibold text-slate-700">
                                        Nota final = trabajos {100 - Number(finalExamWeight)}% + examen {Number(finalExamWeight)}%
                                    </p>
                                ) : (
                                    <p className="text-xs font-semibold text-slate-700">
                                        Nota final = examen 100%
                                    </p>
                                )}

                                <p className="text-[11px] text-slate-600">
                                    {calculatorSnapshot.workAverage !== null
                                        ? `${calculatorSnapshot.workAverage.toFixed(1)} x ${(100 - Number(finalExamWeight))}% + ${calculatorSnapshot.examGrade.toFixed(1)} x ${Number(finalExamWeight)}%`
                                        : `${calculatorSnapshot.examGrade.toFixed(1)} x 100%`
                                    }
                                </p>
                            </div>
                        )}

                        {calculatorSnapshot.workGrades.length > 0 ? (
                            <div className="space-y-1">
                                <label htmlFor="final-exam-weight" className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                    Peso del examen en la nota final (40%-100%)
                                </label>
                                <input
                                    id="final-exam-weight"
                                    type="number"
                                    min="40"
                                    max="100"
                                    step="1"
                                    value={finalExamWeight}
                                    onChange={(event) => setFinalExamWeight(event.target.value)}
                                    className="w-full text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg p-1.5 focus:outline-none focus:border-blue-400"
                                />
                                <p className="text-[10px] text-slate-400">
                                    El porcentaje restante hasta 100% se aplicará automáticamente a la media de trabajos.
                                </p>
                            </div>
                        ) : (
                            <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/60 p-3 text-[11px] text-slate-500">
                                Si no hay trabajos registrados, la calculadora utilizará directamente la nota del examen y no pedirá porcentaje.
                            </div>
                        )}

                        <GenericButton
                            type="button"
                            onClick={handleCalculateFinalGrade}
                            variant="primary"
                            label="Calcular nota final"
                            icon={<GraduationCap size={14} />}
                            className="w-full justify-center text-xs! font-bold! py-2!"
                        />
                    </div>
                )}
            </GenericCard>
        </div>
    );
};
