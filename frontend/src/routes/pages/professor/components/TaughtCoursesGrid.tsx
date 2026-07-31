// src/routes/pages/professor/components/TaughtCoursesGrid.tsx
import GenericCard from '../../../../components/ui/genericCard/GenericCard';

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
}

/**
 * Cuadrícula de tarjetas de asignaturas independiente, inmutable y con control de scroll.
 * Implementa de forma exclusiva los componentes transversales GenericCard y GenericButton.
 */
export const TaughtCoursesGrid = ({
    courses
}: TaughtCoursesGridProps) => {
    const shouldEnableScroll = courses.length > 4;

    return (
        <div
            data-testid="taught-courses-scroll-container"
            className={`pr-2 custom-scrollbar balance-scroll ${shouldEnableScroll ? 'max-h-136 overflow-y-auto' : 'overflow-y-visible'
                }`}
        >
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

                    </GenericCard>
                ))}
            </div>
        </div>
    );
};

export default TaughtCoursesGrid;
