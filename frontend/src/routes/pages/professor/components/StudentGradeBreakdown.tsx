// frontend/src/routes/pages/professor/components/StudentGradeBreakdown.tsx
import { Award } from 'lucide-react';
import GenericCard from '../../../../components/ui/genericCard/GenericCard';
import type { StudentMetricBreakdown } from '../../../../services/teachingMetricsService';

interface StudentGradeBreakdownProps {
    students: StudentMetricBreakdown[];
    showCourseColumn: boolean; // true cuando el ámbito del selector es TODAS
}

/**
 * Desglose individual de nota media por alumno para el panel "Métricas de
 * Docencia" [nueva funcionalidad]. Cuando el selector está en TODAS, muestra
 * además la asignatura de cada fila para distinguir el origen del dato.
 */
export const StudentGradeBreakdown = ({
    students,
    showCourseColumn
}: StudentGradeBreakdownProps) => {
    return (
        <GenericCard className="space-y-2">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Award size={16} className="text-blue-600" />
                Notas de alumnos
            </h3>
            <div
                data-testid="student-grade-list"
                className="max-h-56 overflow-y-scroll pr-1 space-y-1.5 custom-scrollbar"
            >
                <div className="grid grid-cols-[minmax(10rem,1.5fr)_repeat(3,minmax(5rem,1fr))] items-center gap-3 px-3 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    <span>Alumno</span>
                    <span className="text-center">Trabajos</span>
                    <span className="text-center">Examen final</span>
                    <span className="text-center">Nota final</span>
                </div>
                {students.length === 0 ? (
                    <p className="text-[11px] text-slate-400 italic text-center py-3">
                        Sin calificaciones registradas en el ámbito seleccionado.
                    </p>
                ) : (
                    students.map((student) => (
                        <div
                            key={`${student.courseId}-${student.userId}`}
                            className="grid grid-cols-[minmax(10rem,1.5fr)_repeat(3,minmax(5rem,1fr))] items-center gap-3 p-2.5 bg-slate-50 rounded border border-slate-100 text-[11px]"
                        >
                            <div className="min-w-0">
                                <p className="font-semibold text-slate-700 truncate">{student.username}</p>
                                {showCourseColumn && (
                                    <p className="text-[10px] text-slate-400 truncate">{student.courseTitle}</p>
                                )}
                            </div>
                            <span className="text-center font-bold text-emerald-600">
                                {student.workAverage == null ? '--' : student.workAverage.toFixed(1)}
                            </span>
                            <span className="text-center font-bold text-emerald-600">
                                {student.finalExamGrade == null ? '--' : student.finalExamGrade.toFixed(1)}
                            </span>
                            <span className="text-center font-bold text-emerald-600">
                                {student.finalGrade == null ? '--' : student.finalGrade.toFixed(1)}
                            </span>
                        </div>
                    ))
                )}
            </div>
        </GenericCard>
    );
};
