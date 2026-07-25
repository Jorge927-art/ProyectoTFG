// frontend/src/routes/pages/professor/components/StudentProgressBreakdown.tsx
import { Users } from 'lucide-react';
import GenericCard from '../../../../components/ui/genericCard/GenericCard';
import type { StudentMetricBreakdown } from '../../../../services/teachingMetricsService';

interface StudentProgressBreakdownProps {
    students: StudentMetricBreakdown[];
    showCourseColumn: boolean; // true cuando el ámbito del selector es TODOS
}

/**
 * Desglose individual de progreso por alumno para el panel "Métricas de
 * Docencia" [nueva funcionalidad]. Cuando el selector está en TODOS, muestra
 * además la asignatura de cada fila para distinguir el origen del dato.
 */
export const StudentProgressBreakdown = ({ students, showCourseColumn }: StudentProgressBreakdownProps) => (
    <GenericCard className="space-y-2">
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Users size={16} className="text-blue-600" />
            Progreso Alumno
        </h3>
        <div className="max-h-48 overflow-y-auto pr-1 space-y-1.5">
            {students.length === 0 ? (
                <p className="text-[11px] text-slate-400 italic text-center py-3">
                    Sin alumnos matriculados en el ámbito seleccionado.
                </p>
            ) : (
                students.map((student) => (
                    <div
                        key={`${student.courseId}-${student.userId}`}
                        className="flex items-center justify-between p-2 bg-slate-50 rounded border border-slate-100 text-[11px]"
                    >
                        <div className="min-w-0">
                            <p className="font-semibold text-slate-700 truncate">{student.username}</p>
                            {showCourseColumn && (
                                <p className="text-[10px] text-slate-400 truncate">{student.courseTitle}</p>
                            )}
                        </div>
                        <span className="font-bold text-blue-600 shrink-0">{student.progressPercentage}%</span>
                    </div>
                ))
            )}
        </div>
    </GenericCard>
);