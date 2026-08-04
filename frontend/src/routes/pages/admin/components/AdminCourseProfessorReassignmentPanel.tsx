import { useEffect, useMemo, useState } from 'react';
import { Loader2, RefreshCw, ShieldAlert, UserRoundCog, Users } from 'lucide-react';
import GenericButton from '../../../../components/ui/genericButton/GenericButton';
import {
    getAdminCoursesByProfessor,
    getAdminProfessorOptions,
    reassignAdminCourseProfessor,
    resolveAdminCourseAssignmentError,
    type AdminCourseProfessorReassignmentResult,
    type AdminProfessorCourse,
    type AdminProfessorOption,
} from '../../../../services/adminCourseAssignmentService';
import { useNotifications } from '../../../../components/ui/globalNotificationBell/useNotifications';

export const AdminCourseProfessorReassignmentPanel = () => {
    const [professors, setProfessors] = useState<AdminProfessorOption[]>([]);
    const [selectedOutgoingProfessorId, setSelectedOutgoingProfessorId] = useState<number | null>(null);
    const [selectedIncomingProfessorId, setSelectedIncomingProfessorId] = useState<number | null>(null);
    const [courses, setCourses] = useState<AdminProfessorCourse[]>([]);
    const [loadingProfessors, setLoadingProfessors] = useState(false);
    const [loadingCourses, setLoadingCourses] = useState(false);
    const [reassigningCourseId, setReassigningCourseId] = useState<number | null>(null);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const { refreshNotifications } = useNotifications();

    const selectedOutgoingProfessor = useMemo(
        () => professors.find((prof) => prof.userId === selectedOutgoingProfessorId) ?? null,
        [professors, selectedOutgoingProfessorId]
    );

    const incomingProfessorOptions = useMemo(
        () => professors.filter((prof) => prof.userId !== selectedOutgoingProfessorId),
        [professors, selectedOutgoingProfessorId]
    );

    const selectedIncomingProfessor = useMemo(
        () => professors.find((prof) => prof.userId === selectedIncomingProfessorId) ?? null,
        [professors, selectedIncomingProfessorId]
    );

    const loadProfessors = async () => {
        setLoadingProfessors(true);
        setError('');
        try {
            const data = await getAdminProfessorOptions();
            setProfessors(data);
        } catch (err) {
            setProfessors([]);
            setError(resolveAdminCourseAssignmentError(err));
        } finally {
            setLoadingProfessors(false);
        }
    };

    const loadOutgoingProfessorCourses = async (professorId: number) => {
        setLoadingCourses(true);
        setError('');
        setSuccessMessage('');
        try {
            const data = await getAdminCoursesByProfessor(professorId);
            setCourses(data);
        } catch (err) {
            setCourses([]);
            setError(resolveAdminCourseAssignmentError(err));
        } finally {
            setLoadingCourses(false);
        }
    };

    useEffect(() => {
        void loadProfessors();
    }, []);

    useEffect(() => {
        if (selectedOutgoingProfessorId === null) {
            setCourses([]);
            return;
        }
        void loadOutgoingProfessorCourses(selectedOutgoingProfessorId);
    }, [selectedOutgoingProfessorId]);

    useEffect(() => {
        if (selectedIncomingProfessorId === selectedOutgoingProfessorId) {
            setSelectedIncomingProfessorId(null);
        }
    }, [selectedIncomingProfessorId, selectedOutgoingProfessorId]);

    const handleReassignCourse = async (course: AdminProfessorCourse) => {
        if (selectedIncomingProfessorId === null || !selectedIncomingProfessor) {
            setError('Selecciona un profesor entrante antes de confirmar el cambio de titularidad.');
            return;
        }

        const confirmed = window.confirm(
            `Confirmar reasignación de "${course.title}"\n\n` +
            `Profesor saliente: ${course.currentProfessorUsername}\n` +
            `Profesor entrante: ${selectedIncomingProfessor.username}\n\n` +
            '¿Deseas aplicar esta reasignación administrativa?'
        );

        if (!confirmed) {
            return;
        }

        setReassigningCourseId(course.courseId);
        setError('');
        setSuccessMessage('');
        try {
            const result: AdminCourseProfessorReassignmentResult = await reassignAdminCourseProfessor(
                course.courseId,
                selectedIncomingProfessorId
            );

            setSuccessMessage(
                `Curso "${result.courseTitle}" reasignado de ${result.previousProfessorUsername} a ${result.newProfessorUsername}.`
            );

            if (selectedOutgoingProfessorId !== null) {
                await loadOutgoingProfessorCourses(selectedOutgoingProfessorId);
            }

            refreshNotifications();
        } catch (err) {
            setError(resolveAdminCourseAssignmentError(err));
        } finally {
            setReassigningCourseId(null);
        }
    };

    return (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm px-5 py-6 w-full h-full">
            <div className="flex items-center justify-between mb-5 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-blue-50 rounded-xl text-blue-600">
                        <UserRoundCog size={20} />
                    </div>
                    <div>
                        <h3 className="text-base font-bold text-slate-900">Reasignación Administrativa de Profesor</h3>
                        <p className="text-xs text-slate-600 font-medium">
                            Solo administración puede modificar la titularidad de una asignatura.
                        </p>
                    </div>
                </div>
                <GenericButton
                    type="button"
                    variant="text"
                    onClick={() => void loadProfessors()}
                    disabled={loadingProfessors || reassigningCourseId !== null}
                    icon={loadingProfessors ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                    label="Actualizar"
                    className="text-xs! font-bold! text-slate-600!"
                />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                    <label htmlFor="outgoing-professor" className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                        Profesor saliente
                    </label>
                    <select
                        id="outgoing-professor"
                        className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
                        value={selectedOutgoingProfessorId ?? ''}
                        onChange={(e) => setSelectedOutgoingProfessorId(e.target.value ? Number(e.target.value) : null)}
                        disabled={loadingProfessors || reassigningCourseId !== null}
                        size={6}
                    >
                        {professors.map((professor) => (
                            <option key={professor.userId} value={professor.userId}>
                                {professor.username}
                            </option>
                        ))}
                    </select>
                    <p className="mt-2 text-[10px] text-slate-500">
                        Selecciona el titular actual para visualizar sus cursos asignados.
                    </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                    <label htmlFor="incoming-professor" className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                        Profesor entrante
                    </label>
                    <select
                        id="incoming-professor"
                        className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
                        value={selectedIncomingProfessorId ?? ''}
                        onChange={(e) => setSelectedIncomingProfessorId(e.target.value ? Number(e.target.value) : null)}
                        disabled={loadingProfessors || reassigningCourseId !== null}
                        size={6}
                    >
                        {incomingProfessorOptions.map((professor) => (
                            <option key={professor.userId} value={professor.userId}>
                                {professor.username}
                            </option>
                        ))}
                    </select>
                    <p className="mt-2 text-[10px] text-slate-500">
                        El profesor entrante recibirá notificación en la campana de navegación.
                    </p>
                </div>
            </div>

            <div className="mt-4 border border-amber-100 bg-amber-50 text-amber-800 rounded-xl px-3 py-2 text-[11px] font-semibold flex items-start gap-2">
                <ShieldAlert size={14} className="mt-0.5 shrink-0" />
                <span>
                    Este curso está gestionado por Administración. La asignación solo puede modificarse por un administrador.
                </span>
            </div>

            {error && (
                <div className="mt-3 bg-red-50 border border-red-100 text-red-700 px-3 py-2 rounded-xl text-xs font-semibold">
                    ⚠️ {error}
                </div>
            )}

            {successMessage && (
                <div className="mt-3 bg-emerald-50 border border-emerald-100 text-emerald-700 px-3 py-2 rounded-xl text-xs font-semibold">
                    ✓ {successMessage}
                </div>
            )}

            <div className="mt-4 border-t border-slate-100 pt-3">
                <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                        <Users size={15} className="text-blue-600" />
                        Cursos del profesor seleccionado
                    </h4>
                    {selectedOutgoingProfessor && (
                        <span className="text-[11px] text-slate-500 font-semibold">
                            {selectedOutgoingProfessor.username}
                        </span>
                    )}
                </div>

                {loadingCourses ? (
                    <div className="py-4 flex items-center justify-center text-slate-500">
                        <Loader2 size={18} className="animate-spin" />
                    </div>
                ) : courses.length === 0 ? (
                    <p className="text-xs text-slate-500 italic">
                        {selectedOutgoingProfessorId === null
                            ? 'Selecciona un profesor saliente para cargar sus asignaturas.'
                            : 'Este profesor no tiene asignaturas titularizadas en este momento.'}
                    </p>
                ) : (
                    <div className="max-h-64 overflow-y-auto pr-1 space-y-2">
                        {courses.map((course) => {
                            const isBusy = reassigningCourseId === course.courseId;
                            const disabled =
                                isBusy ||
                                selectedIncomingProfessorId === null ||
                                selectedIncomingProfessorId === course.currentProfessorUserId;

                            return (
                                <div
                                    key={course.courseId}
                                    className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
                                >
                                    <div className="min-w-0">
                                        <p className="text-sm font-bold text-slate-800 truncate">{course.title}</p>
                                        <p className="text-[11px] text-slate-500">
                                            Titular actual: <span className="font-semibold">{course.currentProfessorUsername}</span>
                                        </p>
                                    </div>
                                    <GenericButton
                                        type="button"
                                        variant="primary"
                                        disabled={disabled}
                                        onClick={() => void handleReassignCourse(course)}
                                        label={isBusy ? 'Reasignando...' : 'Reasignar curso'}
                                        icon={isBusy ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                                        className="text-[11px]! py-1.5! px-3!"
                                    />
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};
