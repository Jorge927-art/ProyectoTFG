import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, ClipboardList, Loader2 } from 'lucide-react';
import GenericButton from '../../../../components/ui/genericButton/GenericButton';
import {
    getProfessorAlerts,
    type ProfessorCourseAlert,
    type ProfessorAlertStatus,
    updateProfessorAlertStatus,
} from '../../../../services/professorAlertService';
import { NOTIFICATIONS_REFRESH_EVENT } from '../../../../components/ui/globalNotificationBell/useNotifications';

const statusMeta: Record<ProfessorAlertStatus, { label: string; className: string }> = {
    PENDING: {
        label: 'Pendiente',
        className: 'border-red-200 bg-red-50/70 text-red-700',
    },
    VIEWED: {
        label: 'Visto',
        className: 'border-amber-200 bg-amber-50/80 text-amber-700',
    },
    RESOLVED: {
        label: 'Resuelto',
        className: 'border-emerald-200 bg-emerald-50/80 text-emerald-700',
    },
};

const getPriority = (alert: ProfessorCourseAlert): number => {
    if (alert.alertType === 'FINAL_EXAM') return 0;
    if (alert.alertType === 'MATERIAL_DISPATCH') return 1;
    return 2;
};

const getNextStatus = (status: ProfessorAlertStatus): ProfessorAlertStatus | null => {
    if (status === 'PENDING') return 'VIEWED';
    if (status === 'VIEWED') return 'RESOLVED';
    return null;
};

const formatCheckpointLabel = (alert: ProfessorCourseAlert): string => {
    if (alert.alertType === 'INITIAL_CONTACT') {
        return 'Alta inicial';
    }
    if (alert.alertType === 'FINAL_EXAM') {
        return 'Hito examen (90%)';
    }
    return `Checkpoint ${alert.checkpointPercent}%`;
};

export const ProfessorTeachingAlertsPanel = () => {
    const [alerts, setAlerts] = useState<ProfessorCourseAlert[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [updatingAlertId, setUpdatingAlertId] = useState<number | null>(null);

    const loadAlerts = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const data = await getProfessorAlerts();
            setAlerts(Array.isArray(data) ? data : []);
        } catch {
            setError('No se pudo sincronizar el panel de avisos docentes.');
            setAlerts([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadAlerts();
    }, [loadAlerts]);

    useEffect(() => {
        const handler = () => {
            void loadAlerts();
        };
        window.addEventListener(NOTIFICATIONS_REFRESH_EVENT, handler);
        return () => {
            window.removeEventListener(NOTIFICATIONS_REFRESH_EVENT, handler);
        };
    }, [loadAlerts]);

    const sortedAlerts = useMemo(() => {
        return [...alerts].sort((a, b) => {
            const priorityDiff = getPriority(a) - getPriority(b);
            if (priorityDiff !== 0) return priorityDiff;
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
    }, [alerts]);

    const handleAdvanceStatus = async (alert: ProfessorCourseAlert) => {
        const nextStatus = getNextStatus(alert.status);
        if (!nextStatus) {
            return;
        }

        setUpdatingAlertId(alert.alertId);
        setError('');
        try {
            const updated = await updateProfessorAlertStatus(alert.alertId, nextStatus);
            setAlerts((prev) => prev.map((item) => (item.alertId === updated.alertId ? updated : item)));
        } catch {
            setError('No se pudo actualizar el estado del aviso seleccionado.');
        } finally {
            setUpdatingAlertId(null);
        }
    };

    return (
        <section className="bg-white border border-slate-100 rounded-2xl p-4 xl:p-5 2xl:p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-red-50 text-red-600">
                        <ClipboardList size={18} />
                    </div>
                    <div>
                        <h2 className="text-base font-bold text-slate-900">Avisos docentes operativos</h2>
                        <p className="text-xs text-slate-500">Material, trabajos y examen final por alumno. Gestión por estados: pendiente, visto y resuelto.</p>
                    </div>
                </div>
                <span className="rounded-full bg-slate-100 text-slate-700 px-2.5 py-1 text-[11px] font-bold">
                    {sortedAlerts.length} avisos
                </span>
            </div>

            {error && (
                <div className="mb-3 p-2.5 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs font-semibold flex items-center gap-2">
                    <AlertCircle size={14} className="shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            <div className="max-h-96 overflow-y-auto custom-scrollbar pr-1 space-y-2.5">
                {loading ? (
                    <div className="py-10 flex flex-col items-center text-slate-400">
                        <Loader2 size={20} className="animate-spin mb-2" />
                        <p className="text-xs font-semibold">Cargando avisos del profesor...</p>
                    </div>
                ) : sortedAlerts.length === 0 ? (
                    <div className="py-8 text-center text-slate-400">
                        <p className="text-xs font-semibold">No hay avisos activos en este momento.</p>
                    </div>
                ) : (
                    sortedAlerts.map((alert) => {
                        const status = statusMeta[alert.status];
                        const nextStatus = getNextStatus(alert.status);
                        const statusActionLabel = nextStatus === 'VIEWED'
                            ? 'Marcar como visto'
                            : nextStatus === 'RESOLVED'
                                ? 'Marcar como resuelto'
                                : 'Resuelto';

                        return (
                            <article
                                key={alert.alertId}
                                className={`rounded-xl border px-3.5 py-3 ${status.className}`}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="text-xs font-bold truncate">{alert.title}</p>
                                        <p className="text-[11px] mt-0.5 leading-relaxed">{alert.message}</p>
                                    </div>
                                    <span className="text-[10px] px-2 py-0.5 rounded-full border border-current/30 font-bold whitespace-nowrap">
                                        {status.label}
                                    </span>
                                </div>

                                <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] font-semibold text-slate-600">
                                    <span className="px-2 py-0.5 bg-white/80 border border-slate-200 rounded-full">Curso: {alert.courseTitle}</span>
                                    <span className="px-2 py-0.5 bg-white/80 border border-slate-200 rounded-full">Alumno: {alert.studentUsername}</span>
                                    <span className="px-2 py-0.5 bg-white/80 border border-slate-200 rounded-full">{formatCheckpointLabel(alert)}</span>
                                </div>

                                <div className="mt-3 flex justify-end">
                                    <GenericButton
                                        type="button"
                                        variant="text"
                                        disabled={updatingAlertId === alert.alertId || nextStatus === null}
                                        onClick={() => void handleAdvanceStatus(alert)}
                                        icon={
                                            updatingAlertId === alert.alertId
                                                ? <Loader2 size={13} className="animate-spin" />
                                                : <CheckCircle2 size={13} />
                                        }
                                        label={statusActionLabel}
                                        className="text-[11px]! font-bold!"
                                    />
                                </div>
                            </article>
                        );
                    })
                )}
            </div>
        </section>
    );
};

export default ProfessorTeachingAlertsPanel;
