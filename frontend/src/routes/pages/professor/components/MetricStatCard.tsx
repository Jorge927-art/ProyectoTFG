// frontend/src/routes/pages/professor/components/MetricStatCard.tsx
import type { ReactNode } from 'react';
import GenericCard from '../../../../components/ui/genericCard/GenericCard';

interface MetricStatCardProps {
    icon: ReactNode;
    title: string;
    value: string;
    description: string;
    badgeLabel: string;
    badgeClassName: string;
}

/**
 * Tarjeta reutilizable de valor único para el panel "Métricas de Docencia"
 * [nueva funcionalidad]. Reutiliza el mismo estilo visual que las tarjetas
 * de métricas ya existentes en ProfessorDashboard.
 */
export const MetricStatCard = ({
    icon,
    title,
    value,
    description,
    badgeLabel,
    badgeClassName
}: MetricStatCardProps) => (
    <GenericCard className="p-4 border-slate-100 shadow-none hover:shadow-none bg-slate-50/30">
        <div className="mb-3">
            <div className="flex items-center justify-between mb-2">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wide ${badgeClassName}`}>
                    {badgeLabel}
                </span>
                <div className="flex items-center gap-1.5 text-slate-800 text-base font-extrabold">
                    {icon}
                    <span>{value}</span>
                </div>
            </div>
            <h3 className="text-sm font-bold text-slate-800 leading-tight">{title}</h3>
        </div>
        <div className="pt-2 border-t border-slate-100">
            <p className="text-[11px] text-slate-600">{description}</p>
        </div>
    </GenericCard>
);