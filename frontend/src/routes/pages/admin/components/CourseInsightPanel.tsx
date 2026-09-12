// frontend/src/routes/pages/admin/components/CourseInsightPanel.tsx
import { Search, Loader2, BookOpen, User, GraduationCap, Users, CheckCircle2, Star } from 'lucide-react';
import GenericCard from '../../../../components/ui/genericCard/GenericCard';
import GenericButton from '../../../../components/ui/genericButton/GenericButton';
import { useCourseInsight } from './useCourseInsight';
import type { CourseCollectiveStats } from '../../../../services/adminCourseInsightService';

export const CourseInsightPanel = () => {
    const {
        keyword,
        setKeyword,
        results,
        selectedCourse,
        selectedUser,
        stats,
        collectiveStats,
        loadingSearch,
        loadingDetail,
        loadingStats,
        loadingCollectiveStats,
        highlightedResultIndex,
        error,
        handleSearch,
        handleSearchInputKeyDown,
        handleSelectCourse,
        handleSelectUser
    } = useCourseInsight();

    const trabajoScore = stats?.workGrade ?? getGradeByTitleKeyword(stats?.studentGrades, 'trabajo')?.score ?? null;
    const examenFinalScore = stats?.finalExamGrade ?? getGradeByTitleKeyword(stats?.studentGrades, 'examen')?.score ?? null;

    return (
        <GenericCard className="space-y-4">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <BookOpen size={18} className="text-indigo-600" />
                Panel Estadístico de Cursos
            </h2>

            {/* BUSCADOR DE CURSOS */}
            <form onSubmit={handleSearch} className="flex gap-2">
                <input
                    type="text"
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    onKeyDown={handleSearchInputKeyDown}
                    placeholder="Escribe el inicio del nombre del curso..."
                    className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
                <GenericButton
                    type="submit"
                    disabled={loadingSearch}
                    variant="primary"
                    label={loadingSearch ? 'Buscando...' : 'Buscar ahora'}
                    icon={loadingSearch ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                    className="px-4! py-2! text-xs! font-bold! rounded-lg!"
                />
            </form>

            {error && <p className="text-xs text-red-600 font-medium">{error}</p>}

            {/* RESULTADOS DE BÚSQUEDA */}
            {results.length > 0 && !selectedCourse && (
                <div className="max-h-52 overflow-y-auto pr-1 space-y-1.5">
                    {results.map((course, index) => (
                        <button
                            key={course.courseId}
                            type="button"
                            onClick={() => handleSelectCourse(course.courseId)}
                            className={`w-full text-left p-2.5 rounded-lg border transition-colors ${highlightedResultIndex === index
                                ? 'bg-indigo-50 border-indigo-200'
                                : 'bg-slate-50 border-slate-100 hover:bg-indigo-50'
                                }`}
                            aria-selected={highlightedResultIndex === index}
                        >
                            <p className="text-sm font-bold text-slate-700">{course.title}</p>
                            <p className="text-[11px] text-slate-400">{course.category}</p>
                        </button>
                    ))}
                </div>
            )}

            {!loadingSearch && keyword.trim().length >= 1 && results.length === 0 && !selectedCourse && !error && (
                <p className="text-[11px] text-slate-400 italic">
                    No hay cursos cuyo nombre comience por "{keyword.trim()}".
                </p>
            )}

            {loadingDetail && (
                <div className="flex justify-center py-4">
                    <Loader2 size={20} className="animate-spin text-indigo-500" />
                </div>
            )}

            {/* DETALLE DEL CURSO: PROFESOR + ALUMNOS */}
            {selectedCourse && !loadingDetail && (
                <div className="space-y-3 pt-2 border-t border-slate-100">
                    <p className="text-sm font-bold text-slate-800">{selectedCourse.title}</p>

                    <div>
                        <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-wide mb-1.5">Profesor</h3>
                        {selectedCourse.professor ? (
                            <UserRow
                                user={selectedCourse.professor}
                                icon={<GraduationCap size={14} className="text-purple-600" />}
                                isSelected={selectedUser?.userId === selectedCourse.professor.userId}
                                onClick={() => handleSelectUser(selectedCourse.professor!)}
                            />
                        ) : (
                            <p className="text-[11px] text-slate-400 italic">Sin profesor asignado.</p>
                        )}
                    </div>

                    <div>
                        <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-wide mb-1.5">
                            Alumnos inscritos ({selectedCourse.students.length})
                        </h3>
                        <div className="max-h-48 overflow-y-auto space-y-1">
                            {selectedCourse.students.length === 0 ? (
                                <p className="text-[11px] text-slate-400 italic">Sin alumnos inscritos.</p>
                            ) : (
                                selectedCourse.students.map((student) => (
                                    <UserRow
                                        key={student.userId}
                                        user={student}
                                        icon={<User size={14} className="text-blue-600" />}
                                        isSelected={selectedUser?.userId === student.userId}
                                        onClick={() => handleSelectUser(student)}
                                    />
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ESTADÍSTICAS DEL USUARIO SELECCIONADO */}
            {(loadingStats || loadingCollectiveStats) && (
                <div className="flex justify-center py-4">
                    <Loader2 size={20} className="animate-spin text-indigo-500" />
                </div>
            )}

            {selectedCourse && collectiveStats && !loadingCollectiveStats && (
                <div className="space-y-2.5 pt-3 border-t border-slate-100">
                    <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-wide">
                        Estadísticas colectivas del curso
                    </h3>

                    <div className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                        <Users size={16} className="text-emerald-600 shrink-0" />
                        <p className="text-xs font-semibold text-slate-700">
                            Alumnos activos en el curso:{' '}
                            <span className="font-black text-emerald-700">{collectiveStats.activeStudentsInCourse}</span>
                        </p>
                    </div>

                    <ProgressBar
                        label="Progreso medio del curso"
                        percentage={collectiveStats.courseAverageProgressPercentage}
                        colorClass="bg-blue-600"
                    />

                    <HistoricalMetric label="Valoración media del curso" icon={<Star size={14} className="text-amber-500 fill-amber-400" />} current={collectiveStats.averageCourseRating} rows={collectiveStats.yearlyComparisons} selector={(row) => row.averageCourseRating} formatRating />
                    <CourseComments comments={collectiveStats.courseComments} />
                    <HistoricalMetric label="Valoración media del profesor" icon={<Star size={14} className="text-amber-500 fill-amber-400" />} current={collectiveStats.averageInstructorRating} rows={collectiveStats.yearlyComparisons} selector={(row) => row.averageInstructorRating} formatRating />
                    <HistoricalMetric label="Índice de aprobados" icon={<CheckCircle2 size={14} className="text-emerald-600" />} current={collectiveStats.completionRatePercentage} rows={collectiveStats.yearlyComparisons} selector={(row) => row.approvalIndexPercentage} suffix="%" />
                    <HistoricalMetric label="Nota media trabajos" current={collectiveStats.averageWorkGrade} rows={collectiveStats.yearlyComparisons} selector={(row) => row.averageWorkGrade} />
                    <HistoricalMetric label="Nota media examen final" current={collectiveStats.averageFinalExamGrade} rows={collectiveStats.yearlyComparisons} selector={(row) => row.averageFinalExamGrade} />
                    <HistoricalMetric label="Nota media global" current={collectiveStats.averageGrade} rows={collectiveStats.yearlyComparisons} selector={(row) => row.averageGrade} />

                    <div className="rounded-lg border border-slate-100 bg-white p-2.5">
                        <p className="text-xs font-black text-slate-700 mb-2">Estadísticas del alumnado activo</p>
                        {collectiveStats.studentStatistics.length === 0 ? (
                            <p className="text-[11px] text-slate-400 italic">No hay alumnos activos con estadísticas disponibles.</p>
                        ) : (
                            <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                                {collectiveStats.studentStatistics.map((student) => (
                                    <div key={student.userId} className="grid grid-cols-1 sm:grid-cols-5 gap-2 items-center rounded border border-slate-100 bg-slate-50 p-2 text-[10px]">
                                        <span className="font-bold text-slate-700 truncate">{student.username}</span>
                                        <span>Progreso: <strong>{student.progressPercentage}%</strong></span>
                                        <span>Trabajos: <strong>{formatStudentGrade(student.averageWorkGrade)}</strong></span>
                                        <span>Examen: <strong>{formatStudentGrade(student.averageFinalExamGrade)}</strong></span>
                                        <span>Global: <strong className={student.passed ? 'text-emerald-700' : 'text-slate-700'}>{formatStudentGrade(student.averageGrade)}</strong></span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                </div>
            )}

            {stats && selectedUser && !loadingStats && (
                <div className="space-y-3 pt-3 border-t border-slate-100">
                    {stats.studentProgressPercentage !== null && (
                        <ProgressBar
                            label={`Progreso de ${selectedUser.username}`}
                            percentage={stats.studentProgressPercentage}
                            colorClass="bg-emerald-600"
                        />
                    )}

                    <ProgressBar
                        label="Progreso medio del curso"
                        percentage={stats.courseAverageProgressPercentage}
                        colorClass="bg-blue-600"
                    />

                    {stats.studentProgressPercentage !== null && (
                        <div>
                            <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-wide mb-1.5">
                                Notas de {selectedUser.username}
                            </h3>
                            <div className="space-y-1.5">
                                <GradeRow label="Trabajo" score={trabajoScore} />
                                <GradeRow label="Examen final" score={examenFinalScore} />
                            </div>
                        </div>
                    )}
                </div>
            )}
        </GenericCard>
    );
};

const UserRow = ({ user, icon, isSelected, onClick }: {
    user: { userId: number; username: string; enabled: boolean };
    icon: React.ReactNode;
    isSelected: boolean;
    onClick: () => void;
}) => (
    <button
        type="button"
        onClick={onClick}
        className={`w-full flex items-center gap-2 p-2 rounded-lg border text-left transition-colors ${isSelected ? 'bg-indigo-50 border-indigo-300' : 'bg-white border-slate-100 hover:bg-slate-50'
            }`}
    >
        {icon}
        <span className="text-xs font-semibold text-slate-700 truncate flex-1">{user.username}</span>
        {!user.enabled && (
            <span className="text-[9px] font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded uppercase">Baja</span>
        )}
    </button>
);

const ProgressBar = ({ label, percentage, colorClass }: { label: string; percentage: number; colorClass: string }) => (
    <div>
        <div className="flex justify-between text-[10px] text-slate-500 mb-1 font-semibold">
            <span>{label}</span>
            <span className="font-bold text-slate-700">{percentage}%</span>
        </div>
        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
            <div
                className={`${colorClass} h-full transition-all duration-1000`}
                {...{ style: { width: `${percentage}%` } }}
            />
        </div>
    </div>
);

const getGradeByTitleKeyword = (
    grades: { title: string; score: number }[] | undefined,
    keyword: string
) => grades?.find((grade) => grade.title.toLocaleLowerCase().includes(keyword));

const GradeRow = ({ label, score }: { label: string; score: number | null }) => (
    <div className="flex justify-between items-center text-[11px] bg-white p-1.5 rounded-lg border border-slate-100 shadow-sm">
        <span className="font-bold text-slate-600 truncate pr-2">{label}</span>
        <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 rounded-md font-black text-[10px] shrink-0">
            {score !== null ? score : 'Sin calificar'}
        </span>
    </div>
);

const HistoricalMetric = ({ label, icon, current, rows, selector, suffix = '', formatRating: rating = false }: {
    label: string;
    icon?: React.ReactNode;
    current: number | null;
    rows: CourseCollectiveStats['yearlyComparisons'];
    selector: (row: CourseCollectiveStats['yearlyComparisons'][number]) => number | null;
    suffix?: string;
    formatRating?: boolean;
}) => {
    const format = (value: number | null) => value === null ? 'Sin datos' : rating ? `${value.toFixed(1)} / 5` : `${value.toFixed(1)}${suffix}`;
    const max = rating ? 5 : suffix === '%' ? 100 : 10;
    const renderStars = (value: number | null, colorClass = 'text-amber-500 fill-amber-400') => value === null
        ? <span className="text-slate-400">Sin datos</span>
        : <span className="inline-flex items-center gap-0.5" aria-label={`${value.toFixed(1)} de 5 estrellas`}>
            {Array.from({ length: 5 }, (_, index) => (
                <Star key={index} size={11} className={index < Math.round(value) ? colorClass : 'text-slate-300'} />
            ))}
            <strong className="ml-1 text-slate-700">{value.toFixed(1)} / 5</strong>
        </span>;
    const renderBar = (value: number | null, colorClass: string) => (
        <div className="flex items-center gap-2">
            <div className="flex-1 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                <div className={`${colorClass} h-full`} style={{ width: `${value === null ? 0 : Math.max(0, Math.min(100, (value / max) * 100))}%` }} />
            </div>
            <strong className="min-w-14 text-right text-slate-700">{format(value)}</strong>
        </div>
    );
    return (
        <div className="rounded-lg border border-slate-100 bg-slate-50 p-2.5">
            <p className="text-xs font-semibold text-slate-700 flex items-center gap-2">{icon}{label}</p>
            <div className="mt-1.5 space-y-1.5 text-[10px] text-slate-500">
                <div>
                    <div className="flex justify-between mb-0.5"><span>Actual</span>{rating ? renderStars(current) : null}</div>
                    {!rating && renderBar(current, 'bg-blue-600')}
                </div>
                {rows.map((row, index) => {
                    const historicalColor = 'text-amber-500 fill-amber-400';
                    const historicalBarColor = index === 0 ? 'bg-amber-500' : 'bg-emerald-600';
                    return (
                        <div key={`${label}-${row.year}`}>
                            <div className="flex justify-between mb-0.5"><span>{row.year}{row.realData ? '' : ' (ficticio)'}</span>{rating ? renderStars(selector(row), historicalColor) : null}</div>
                            {!rating && renderBar(selector(row), historicalBarColor)}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const formatStudentGrade = (grade: number | null) => grade === null ? 'Sin datos' : `${grade.toFixed(1)} / 10`;

const CourseComments = ({ comments }: { comments: CourseCollectiveStats['courseComments'] }) => (
    <div className="rounded-lg border border-slate-100 bg-slate-50 p-2.5">
        <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold text-slate-700">Comentarios de los alumnos</p>
            <span className="text-[10px] font-bold text-slate-400">{comments.length}</span>
        </div>
        {comments.length === 0 ? (
            <p className="mt-1.5 text-[10px] text-slate-400 italic">Todavía no hay comentarios.</p>
        ) : (
            <div className="mt-1.5 max-h-24 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                {comments.map((comment) => (
                    <article key={comment.evaluationId} className="rounded border border-slate-100 bg-white p-2 text-[10px]">
                        <div className="flex items-center justify-between gap-2 text-slate-400">
                            <span className="font-bold text-slate-600 truncate">{comment.studentUsername}</span>
                            <span className="shrink-0">{new Date(comment.evaluationDate).toLocaleDateString('es-ES')}</span>
                        </div>
                        <p className="mt-1 text-slate-600 whitespace-pre-wrap wrap-break-word">{comment.comment}</p>
                        <p className="mt-1 font-semibold text-amber-600">
                            Valoración curso: {comment.courseScore} / 5 · Valoración docente: {comment.instructorScore} / 5
                        </p>
                    </article>
                ))}
            </div>
        )}
    </div>
);