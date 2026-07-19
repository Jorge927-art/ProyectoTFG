// src/routes/pages/professor/components/TaughtCoursesGrid.tsx
import type { ReactNode } from 'react';
import GenericCard from '../../../../components/ui/genericCard/GenericCard';
import GenericButton from '../../../../components/ui/genericButton/GenericButton';

/** Interface inmutable que representa la estructura limpia de una asignatura. */
export interface Course {
    readonly id: number;
    readonly category: string;
    readonly title: string;
    readonly studentsCount: number;
}

/** Props del componente TaughtCoursesGrid bajo tipado estricto. */
interface TaughtCoursesGridProps {
    readonly courses: readonly Course[];
    readonly onManageCourse: (courseId: number) => void;
    readonly actionIcon?: ReactNode; // Permite inyectar ArrowRight desde el padre
}

/**
 * Cuadrícula de tarjetas de asignaturas independiente, inmutable y con control de scroll.
 * Implementa de forma exclusiva los componentes transversales GenericCard y GenericButton.
 */
export const TaughtCoursesGrid = ({
    courses,
    onManageCourse,
    actionIcon
}: TaughtCoursesGridProps) => {
    return (
        <div className="max-h-155 overflow-y-auto pr-2 custom-scrollbar balance-scroll">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {courses.map((course) => (
                    <GenericCard key={course.id}>
                        {/* Cabecera y Datos Reales de Matriculación */}
                        <div className="mb-4 flex-1">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wide bg-green-50 text-green-700 inline-block">
                                {course.category}
                            </span>
                            <h3 className="text-base font-bold text-slate-800 leading-tight mt-2">
                                {course.title}
                            </h3>
                            <p className="text-xs text-slate-400 mt-1">
                                Total: {course.studentsCount} alumnos matriculados
                            </p>
                        </div>

                        {/* Control de Eventos - Sin barra de progreso */}
                        <div className="mt-4 pt-3 border-t border-slate-100">
                            <GenericButton
                                variant="primary"
                                label="Gestionar Curso"
                                icon={actionIcon}
                                className="w-full flex-row-reverse! gap-1! text-xs! font-bold! py-2! px-3! rounded-lg! justify-center"
                                onClick={() => onManageCourse(course.id)}
                            />
                        </div>
                    </GenericCard>
                ))}
            </div>
        </div>
    );
};

export default TaughtCoursesGrid;
