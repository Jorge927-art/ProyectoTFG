import { useCourseManagement } from './useCourseManagement';

type CourseManagementModalProps = {
    courseId: number | null;
    isOpen: boolean;
    onClose: () => void;
    onSyncCount?: (courseId: number, count: number) => void;
};

type LegacyStudentShape = {
    studentId?: number;
    fullName?: string;
    averageScore?: number;
    progressPercentage?: number;
    userId?: number;
    username?: string;
    email?: string;
    individualGrade?: number;
    groupAverage?: number;
};

const toDisplayName = (student: unknown): string => {
    if (typeof student !== 'object' || student === null) return 'Estudiante sin nombre';
    const candidate = student as { fullName?: string; username?: string };
    return (candidate.fullName ?? candidate.username ?? 'Estudiante sin nombre').trim();
};

const toDisplayEmail = (student: unknown): string => {
    if (typeof student !== 'object' || student === null) return 'Sin correo registrado';
    const candidate = student as { email?: string };
    const rawEmail = (candidate.email ?? '').trim();
    return rawEmail.length > 0 ? `✉${rawEmail}` : 'Sin correo registrado';
};

const toDisplayGrade = (student: unknown): string => {
    if (typeof student !== 'object' || student === null) return '0.0 / 10';
    const candidate = student as { averageScore?: number; individualGrade?: number };
    const grade = candidate.averageScore ?? candidate.individualGrade ?? 0;
    return `${grade.toFixed(1)} / 10`;
};

const toDisplayProgress = (student: unknown): string => {
    if (typeof student !== 'object' || student === null) return '0%';
    const candidate = student as { progressPercentage?: number; groupAverage?: number };
    if (typeof candidate.progressPercentage === 'number') {
        return `${Math.round(candidate.progressPercentage)}%`;
    }
    if (typeof candidate.groupAverage === 'number') {
        return `${Math.floor(candidate.groupAverage) * 10}%`;
    }
    return '0%';
};

const toStudentKey = (student: LegacyStudentShape, index: number): string | number => {
    if (typeof student.studentId === 'number') return student.studentId;
    if (typeof student.userId === 'number') return student.userId;
    return index;
};

export const CourseManagementModal = ({
    courseId,
    isOpen,
    onClose,
    onSyncCount
}: CourseManagementModalProps) => {
    const management = useCourseManagement(courseId, isOpen, onSyncCount);

    if (!isOpen || courseId === null) {
        return null;
    }

    const isUploadDisabled = management.isSubmitting || !management.selectedFile || Boolean(management.fileError);

    if (management.loading) {
        return (
            <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
                <div className="w-full max-w-3xl rounded-xl bg-white p-6 shadow-xl">
                    <p className="text-center text-sm font-medium text-slate-700">
                        Hidratando datos mediante Lazy Loading por pestaña...
                    </p>
                </div>
            </div>
        );
    }

    const students = management.students as unknown as LegacyStudentShape[];
    return (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
            <div className="w-full max-w-5xl rounded-xl bg-white p-6 shadow-xl">
                <div className="mb-4 flex items-start justify-between gap-4">
                    <h2 className="text-lg font-bold text-slate-800">
                        Control operativo y seguimiento del Curso ID: {courseId}
                    </h2>
                    <button
                        type="button"
                        aria-label="Cerrar gestión del curso"
                        onClick={onClose}
                        className="rounded-md border border-slate-300 px-3 py-1 text-sm font-semibold text-slate-700"
                    >
                        X
                    </button>
                </div>

                <div className="mb-5 flex flex-wrap gap-2">
                    <button
                        type="button"
                        onClick={() => management.setActiveTab('alumnado')}
                        className="rounded-md border px-3 py-2 text-sm font-semibold"
                    >
                        Alumnado
                    </button>
                    <button
                        type="button"
                        onClick={() => management.setActiveTab('trabajos')}
                        className="rounded-md border px-3 py-2 text-sm font-semibold"
                    >
                        Trabajos y Exámenes
                    </button>
                </div>

                {management.activeTab === 'alumnado' && (
                    <div>
                        <table className="min-w-full border-collapse">
                            <thead>
                                <tr>
                                    <th className="border-b p-2 text-left">Estudiante</th>
                                    <th className="border-b p-2 text-left">Contacto / Email</th>
                                    <th className="border-b p-2 text-left">Progreso en Plataforma y Rendimiento Académico</th>
                                </tr>
                            </thead>
                            <tbody>
                                {students.length > 0 ? (
                                    students.map((student, index) => (
                                        <tr key={toStudentKey(student, index)}>
                                            <td className="border-b p-2">{toDisplayName(student)}</td>
                                            <td className="border-b p-2">{toDisplayEmail(student)}</td>
                                            <td className="border-b p-2">
                                                <span>{toDisplayGrade(student)}</span>
                                                <span className="ml-3 text-slate-600">{toDisplayProgress(student)}</span>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td className="p-4 text-center text-slate-600" colSpan={3}>
                                            No hay alumnos activos registrados en esta asignatura.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {management.activeTab === 'trabajos' && (
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="professor-document-upload" className="mb-2 block text-sm font-semibold text-slate-700">
                                Seleccionar Documento Académico Oficial
                            </label>
                            <input
                                id="professor-document-upload"
                                type="file"
                                accept=".pdf,application/pdf"
                                onChange={management.handleFileChange}
                                className="block w-full rounded-md border border-slate-300 p-2"
                            />
                        </div>

                        {management.fileError && (
                            <p className="rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
                                ⚠ {management.fileError}
                            </p>
                        )}

                        {management.uploadSuccessMessage && (
                            <p className="rounded-md bg-green-50 px-3 py-2 text-sm font-medium text-green-700">
                                ✓ {management.uploadSuccessMessage}
                            </p>
                        )}

                        <button
                            type="button"
                            disabled={isUploadDisabled}
                            onClick={management.handleUploadDocument}
                            className="rounded-md bg-slate-800 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400"
                        >
                            {management.isSubmitting ? 'Transmitiendo Documento...' : 'Transmitir y Publicar Documento'}
                        </button>
                    </div>
                )}

            </div>
        </div>
    );
};
