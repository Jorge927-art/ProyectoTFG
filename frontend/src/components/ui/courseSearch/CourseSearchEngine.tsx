import { Search, Loader2, Star } from 'lucide-react';
import type { DBModelCourse } from '../../../services/courseTypes';
import GenericCard from '../genericCard/GenericCard';
import Input from '../Input';

interface CourseSearchEngineProps {
    title: string;
    subtitle: string;
    searchKeyword: string;
    setSearchKeyword: (keyword: string) => void;
    visibleCourses: DBModelCourse[];
    loadingCatalog: boolean;
    renderAction: (course: DBModelCourse) => React.ReactNode;
}

export const CourseSearchEngine = ({
    title,
    subtitle,
    searchKeyword,
    setSearchKeyword,
    visibleCourses,
    loadingCatalog,
    renderAction
}: CourseSearchEngineProps) => {
    return (
        <GenericCard className="p-5 mb-8 max-w-5xl mt-6 flex flex-col">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                        <Search size={18} className="text-blue-600" />
                        <span>{title}</span>
                    </h2>
                    <p className="text-xs text-slate-500 font-medium">{subtitle}</p>
                </div>

                <div className="relative w-full sm:w-72">
                    <Input
                        type="text"
                        value={searchKeyword}
                        onChange={(e) => setSearchKeyword(e.target.value)}
                        placeholder="Buscar cursos..."
                        className="w-full py-1.5! pl-3! pr-8! text-xs font-medium text-slate-700 placeholder-slate-400"
                    />
                    {loadingCatalog && (
                        <Loader2 size={14} className="animate-spin text-slate-400 absolute right-3 top-2.5 z-10" />
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-5 max-h-72 overflow-y-auto p-1 scrollbar-thin">
                {visibleCourses.length === 0 && !loadingCatalog ? (
                    <p className="text-xs font-medium text-slate-400 italic py-2 col-span-full">
                        No se encontraron cursos que coincidan con el criterio introducido.
                    </p>
                ) : (
                    visibleCourses.map((course) => (
                        <GenericCard key={course.course_id}>
                            <div className="flex flex-col h-full justify-between">
                                <div>
                                    <span className="text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wide bg-blue-50 text-blue-700">
                                        {course.category || "General"}
                                    </span>
                                    <h4 className="text-xs font-bold text-slate-800 mt-2 line-clamp-2 min-h-8">
                                        {course.title}
                                    </h4>
                                    <p className="text-[11px] text-slate-400 mt-1 truncate">
                                        Instructores: {course.instructors || "Por asignar"}
                                    </p>
                                </div>
                                <div className="mt-4 pt-2 border-t border-slate-50 flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-0.5 text-amber-500 text-xs font-bold">
                                        <Star size={11} fill="currentColor" />
                                        <span>{course.rating ? course.rating.toFixed(1) : "5.0"}</span>
                                    </div>

                                    {renderAction(course)}
                                </div>
                            </div>
                        </GenericCard>
                    ))
                )}
            </div>
        </GenericCard>
    );
};
