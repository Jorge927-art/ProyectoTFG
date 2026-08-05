import { useCallback, useEffect, useMemo, useRef, useState, type InputHTMLAttributes } from 'react';
import { BookOpenCheck, Loader2, PlusCircle, RefreshCw, Trash2 } from 'lucide-react';
import GenericButton from '../../../../components/ui/genericButton/GenericButton';
import {
    createAdminCourse,
    deleteAdminCourse,
    getAdminCourseCatalog,
    patchAdminCourse,
    resolveAdminCourseCatalogError,
    type AdminCourseCatalogItem,
    type AdminCourseCreatePayload,
} from '../../../../services/adminCourseCatalogService';

type EditableCourseDraft = {
    url: string;
    shortIntro: string;
    category: string;
    subCategory: string;
    courseType: string;
    language: string;
    subtitleLanguages: string;
    skills: string;
    instructors: string;
    rating: string;
    numOfViewers: string;
    duration: string;
};

const EMPTY_DRAFT: EditableCourseDraft = {
    url: '',
    shortIntro: '',
    category: '',
    subCategory: '',
    courseType: '',
    language: '',
    subtitleLanguages: '',
    skills: '',
    instructors: '',
    rating: '',
    numOfViewers: '',
    duration: '',
};

const toNullableString = (value: string): string | null => {
    const trimmed = value.trim();
    return trimmed.length === 0 ? null : trimmed;
};

const toNullableNumber = (value: string): number | null => {
    const trimmed = value.trim();
    if (!trimmed) {
        return null;
    }
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
};

const toDraft = (course: AdminCourseCatalogItem): EditableCourseDraft => ({
    url: course.url ?? '',
    shortIntro: course.shortIntro ?? '',
    category: course.category ?? '',
    subCategory: course.subCategory ?? '',
    courseType: course.courseType ?? '',
    language: course.language ?? '',
    subtitleLanguages: course.subtitleLanguages ?? '',
    skills: course.skills ?? '',
    instructors: course.instructors ?? '',
    rating: course.rating == null ? '' : String(course.rating),
    numOfViewers: course.numOfViewers == null ? '' : String(course.numOfViewers),
    duration: course.duration == null ? '' : String(course.duration),
});

const getCourseDisplayName = (course: Pick<AdminCourseCatalogItem, 'courseId' | 'title'>): string => {
    const normalizedTitle = course.title?.trim();
    if (normalizedTitle) {
        return normalizedTitle;
    }
    return `Curso sin título`;
};

export const AdminCourseCatalogPanel = () => {
    const [courses, setCourses] = useState<AdminCourseCatalogItem[]>([]);
    const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
    const [draft, setDraft] = useState<EditableCourseDraft>(EMPTY_DRAFT);
    const [createForm, setCreateForm] = useState({
        title: '',
        url: '',
        shortIntro: '',
        category: '',
        subCategory: '',
        courseType: '',
        language: '',
        subtitleLanguages: '',
        skills: '',
        instructors: '',
        rating: '',
        numOfViewers: '',
        duration: '',
    });

    const [loading, setLoading] = useState(false);
    const [savingField, setSavingField] = useState<string | null>(null);
    const [creating, setCreating] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const selectedCourseIdRef = useRef<number | null>(null);

    const selectedCourse = useMemo(
        () => courses.find((course) => course.courseId === selectedCourseId) ?? null,
        [courses, selectedCourseId]
    );

    const loadCatalog = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const data = await getAdminCourseCatalog();
            setCourses(data);
            if (!data.length) {
                setSelectedCourseId(null);
                setDraft(EMPTY_DRAFT);
                return;
            }

            const currentSelectedId = selectedCourseIdRef.current;
            const selectedExists = data.some((course) => course.courseId === currentSelectedId);
            const nextSelected = selectedExists && currentSelectedId !== null ? currentSelectedId : data[0].courseId;
            setSelectedCourseId(nextSelected);
            const selected = data.find((course) => course.courseId === nextSelected);
            if (selected) {
                setDraft(toDraft(selected));
            }
        } catch (err) {
            setError(resolveAdminCourseCatalogError(err));
            setCourses([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadCatalog();
    }, [loadCatalog]);

    useEffect(() => {
        selectedCourseIdRef.current = selectedCourseId;
    }, [selectedCourseId]);

    useEffect(() => {
        if (selectedCourse) {
            setDraft(toDraft(selectedCourse));
        }
    }, [selectedCourse]);

    const handleCreateInputChange = (field: keyof typeof createForm, value: string) => {
        setCreateForm((prev) => ({ ...prev, [field]: value }));
    };

    const buildCreatePayload = (): AdminCourseCreatePayload => ({
        title: createForm.title,
        url: toNullableString(createForm.url),
        shortIntro: toNullableString(createForm.shortIntro),
        category: toNullableString(createForm.category),
        subCategory: toNullableString(createForm.subCategory),
        courseType: toNullableString(createForm.courseType),
        language: toNullableString(createForm.language),
        subtitleLanguages: toNullableString(createForm.subtitleLanguages),
        skills: toNullableString(createForm.skills),
        instructors: toNullableString(createForm.instructors),
        rating: toNullableNumber(createForm.rating),
        numOfViewers: toNullableNumber(createForm.numOfViewers),
        duration: toNullableNumber(createForm.duration),
    });

    const handleCreateCourse = async () => {
        if (!createForm.title.trim()) {
            setError('El título es obligatorio.');
            setSuccessMessage('');
            return;
        }

        setCreating(true);
        setError('');
        setSuccessMessage('');

        try {
            const created = await createAdminCourse(buildCreatePayload());
            const updatedCourses = [...courses, created].sort((a, b) => {
                const titleA = a.title ?? '';
                const titleB = b.title ?? '';
                return titleA.localeCompare(titleB, 'es');
            });
            setCourses(updatedCourses);
            setSelectedCourseId(created.courseId);
            setCreateForm({
                title: '',
                url: '',
                shortIntro: '',
                category: '',
                subCategory: '',
                courseType: '',
                language: '',
                subtitleLanguages: '',
                skills: '',
                instructors: '',
                rating: '',
                numOfViewers: '',
                duration: '',
            });
            setSuccessMessage('Curso creado correctamente.');
        } catch (err) {
            setError(resolveAdminCourseCatalogError(err));
        } finally {
            setCreating(false);
        }
    };

    const handleSelectCourse = (courseId: number) => {
        setSelectedCourseId(courseId);
        setError('');
        setSuccessMessage('');
    };

    const updateDraftField = (field: keyof EditableCourseDraft, value: string) => {
        setDraft((prev) => ({ ...prev, [field]: value }));
    };

    const commitField = async (field: keyof EditableCourseDraft) => {
        if (!selectedCourse) {
            return;
        }

        const currentValue = draft[field];
        let hasChanged = false;
        let payloadValue: string | number | null = null;

        if (field === 'rating' || field === 'numOfViewers' || field === 'duration') {
            const parsed = toNullableNumber(currentValue);
            const previousNumeric = field === 'rating'
                ? selectedCourse.rating
                : field === 'numOfViewers'
                    ? selectedCourse.numOfViewers
                    : selectedCourse.duration;

            hasChanged = (parsed ?? null) !== (previousNumeric ?? null);
            payloadValue = parsed;
        } else {
            const normalized = toNullableString(currentValue);
            const previousValue = selectedCourse[field] as string | null;
            hasChanged = (normalized ?? null) !== (previousValue ?? null);
            payloadValue = normalized;
        }

        if (!hasChanged) {
            return;
        }

        setSavingField(field);
        setError('');
        setSuccessMessage('');

        try {
            const updated = await patchAdminCourse(selectedCourse.courseId, { [field]: payloadValue });
            setCourses((prev) => prev.map((course) => (course.courseId === updated.courseId ? updated : course)));
            setSuccessMessage('Campo actualizado correctamente.');
        } catch (err) {
            setError(resolveAdminCourseCatalogError(err));
            if (selectedCourse) {
                setDraft(toDraft(selectedCourse));
            }
        } finally {
            setSavingField(null);
        }
    };

    const handleDeleteCourse = async () => {
        if (!selectedCourse) {
            return;
        }

        const confirmed = window.confirm(
            `¿Deseas eliminar físicamente el curso "${getCourseDisplayName(selectedCourse)}"?`
        );
        if (!confirmed) {
            return;
        }

        setDeleting(true);
        setError('');
        setSuccessMessage('');

        try {
            await deleteAdminCourse(selectedCourse.courseId);
            const remaining = courses.filter((course) => course.courseId !== selectedCourse.courseId);
            setCourses(remaining);
            if (remaining.length > 0) {
                setSelectedCourseId(remaining[0].courseId);
            } else {
                setSelectedCourseId(null);
                setDraft(EMPTY_DRAFT);
            }
            setSuccessMessage('Curso eliminado correctamente.');
        } catch (err) {
            setError(resolveAdminCourseCatalogError(err));
        } finally {
            setDeleting(false);
        }
    };

    const isNumericBlocked = Boolean(selectedCourse?.used);

    return (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm px-5 py-6 w-full">
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-blue-50 rounded-xl text-blue-600">
                        <BookOpenCheck size={20} />
                    </div>
                    <div>
                        <h3 className="text-base font-bold text-slate-900">Gestión Administrativa de Cursos</h3>
                        <p className="text-xs text-slate-600 font-medium">
                            Alta, modificación parcial y borrado físico según reglas de uso histórico.
                        </p>
                    </div>
                </div>

                <GenericButton
                    type="button"
                    variant="text"
                    onClick={() => void loadCatalog()}
                    disabled={loading || creating || deleting || savingField !== null}
                    icon={loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                    label="Actualizar"
                    className="text-xs! font-bold! text-slate-600!"
                />
            </div>

            {error && (
                <div className="mt-3 bg-red-50 border border-red-100 text-red-700 px-3 py-2 rounded-xl text-xs font-semibold">
                    {error}
                </div>
            )}

            {successMessage && (
                <div className="mt-3 bg-emerald-50 border border-emerald-100 text-emerald-700 px-3 py-2 rounded-xl text-xs font-semibold">
                    {successMessage}
                </div>
            )}

            <div className="mt-4 grid grid-cols-1 xl:grid-cols-2 gap-4">
                <section className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 space-y-2">
                    <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                        <PlusCircle size={15} className="text-blue-600" />
                        Alta de curso
                    </h4>

                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                        Título (obligatorio)
                        <input
                            className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
                            value={createForm.title}
                            onChange={(e) => handleCreateInputChange('title', e.target.value)}
                            placeholder="Ej. Arquitectura de Software"
                        />
                    </label>

                    <CourseTextField label="URL" value={createForm.url} onChange={(value) => handleCreateInputChange('url', value)} />
                    <CourseTextAreaField label="Short Intro" value={createForm.shortIntro} onChange={(value) => handleCreateInputChange('shortIntro', value)} rows={2} />
                    <CourseTextField label="Category" value={createForm.category} onChange={(value) => handleCreateInputChange('category', value)} />
                    <CourseTextField label="Sub Category" value={createForm.subCategory} onChange={(value) => handleCreateInputChange('subCategory', value)} />
                    <CourseTextField label="Course Type" value={createForm.courseType} onChange={(value) => handleCreateInputChange('courseType', value)} />
                    <CourseTextField label="Language" value={createForm.language} onChange={(value) => handleCreateInputChange('language', value)} />
                    <CourseTextField label="Subtitle Languages" value={createForm.subtitleLanguages} onChange={(value) => handleCreateInputChange('subtitleLanguages', value)} />
                    <CourseTextAreaField label="Skills" value={createForm.skills} onChange={(value) => handleCreateInputChange('skills', value)} rows={2} />
                    <CourseTextField label="Instructor" value={createForm.instructors} onChange={(value) => handleCreateInputChange('instructors', value)} />
                    <CourseTextField label="Rating" value={createForm.rating} onChange={(value) => handleCreateInputChange('rating', value)} inputMode="decimal" />
                    <CourseTextField label="Number of viewers" value={createForm.numOfViewers} onChange={(value) => handleCreateInputChange('numOfViewers', value)} inputMode="numeric" />
                    <CourseTextField label="Duration" value={createForm.duration} onChange={(value) => handleCreateInputChange('duration', value)} inputMode="decimal" />

                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                        Site
                        <input
                            className="mt-1.5 w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600"
                            value="COLE"
                            readOnly
                        />
                    </label>

                    <div className="pt-2">
                        <GenericButton
                            type="button"
                            variant="primary"
                            label={creating ? 'Creando...' : 'Dar de alta curso'}
                            icon={creating ? <Loader2 size={14} className="animate-spin" /> : <PlusCircle size={14} />}
                            disabled={creating || loading}
                            onClick={() => void handleCreateCourse()}
                            className="text-xs! font-bold!"
                        />
                    </div>
                </section>

                <section className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 space-y-2">
                    <h4 className="text-sm font-bold text-slate-800">Modificación parcial</h4>

                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                        Curso a modificar
                        <select
                            className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
                            value={selectedCourseId ?? ''}
                            onChange={(e) => handleSelectCourse(Number(e.target.value))}
                            disabled={loading || courses.length === 0}
                        >
                            {courses.length === 0 && <option value="">Sin cursos cargados</option>}
                            {courses.map((course) => (
                                <option key={course.courseId} value={course.courseId}>
                                    {getCourseDisplayName(course)}
                                </option>
                            ))}
                        </select>
                    </label>

                    {selectedCourse && (
                        <>
                            <div className="text-[11px] text-slate-600 bg-white border border-slate-200 rounded-lg px-2.5 py-2">
                                <p>
                                    Curso seleccionado: <span className="font-semibold text-slate-800">{getCourseDisplayName(selectedCourse)}</span>
                                </p>
                            </div>

                            {isNumericBlocked && (
                                <div className="text-[11px] text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-2">
                                    Este curso ya está en uso y no permite editar Rating, Number of viewers ni Duration.
                                </div>
                            )}
                        </>
                    )}

                    <CourseTextField
                        label="URL"
                        value={draft.url}
                        onChange={(value) => updateDraftField('url', value)}
                        onBlur={() => void commitField('url')}
                        disabled={!selectedCourse || savingField !== null}
                    />
                    <CourseTextAreaField
                        label="Short Intro"
                        value={draft.shortIntro}
                        onChange={(value) => updateDraftField('shortIntro', value)}
                        onBlur={() => void commitField('shortIntro')}
                        rows={2}
                        disabled={!selectedCourse || savingField !== null}
                    />
                    <CourseTextField
                        label="Category"
                        value={draft.category}
                        onChange={(value) => updateDraftField('category', value)}
                        onBlur={() => void commitField('category')}
                        disabled={!selectedCourse || savingField !== null}
                    />
                    <CourseTextField
                        label="Sub Category"
                        value={draft.subCategory}
                        onChange={(value) => updateDraftField('subCategory', value)}
                        onBlur={() => void commitField('subCategory')}
                        disabled={!selectedCourse || savingField !== null}
                    />
                    <CourseTextField
                        label="Course Type"
                        value={draft.courseType}
                        onChange={(value) => updateDraftField('courseType', value)}
                        onBlur={() => void commitField('courseType')}
                        disabled={!selectedCourse || savingField !== null}
                    />
                    <CourseTextField
                        label="Language"
                        value={draft.language}
                        onChange={(value) => updateDraftField('language', value)}
                        onBlur={() => void commitField('language')}
                        disabled={!selectedCourse || savingField !== null}
                    />
                    <CourseTextField
                        label="Subtitle Languages"
                        value={draft.subtitleLanguages}
                        onChange={(value) => updateDraftField('subtitleLanguages', value)}
                        onBlur={() => void commitField('subtitleLanguages')}
                        disabled={!selectedCourse || savingField !== null}
                    />
                    <CourseTextAreaField
                        label="Skills"
                        value={draft.skills}
                        onChange={(value) => updateDraftField('skills', value)}
                        onBlur={() => void commitField('skills')}
                        rows={2}
                        disabled={!selectedCourse || savingField !== null}
                    />
                    <CourseTextField
                        label="Instructor"
                        value={draft.instructors}
                        onChange={(value) => updateDraftField('instructors', value)}
                        onBlur={() => void commitField('instructors')}
                        disabled={!selectedCourse || savingField !== null}
                    />

                    <CourseTextField
                        label="Rating"
                        value={draft.rating}
                        onChange={(value) => updateDraftField('rating', value)}
                        onBlur={() => void commitField('rating')}
                        disabled={!selectedCourse || savingField !== null || isNumericBlocked}
                        inputMode="decimal"
                    />
                    <CourseTextField
                        label="Number of viewers"
                        value={draft.numOfViewers}
                        onChange={(value) => updateDraftField('numOfViewers', value)}
                        onBlur={() => void commitField('numOfViewers')}
                        disabled={!selectedCourse || savingField !== null || isNumericBlocked}
                        inputMode="numeric"
                    />
                    <CourseTextField
                        label="Duration"
                        value={draft.duration}
                        onChange={(value) => updateDraftField('duration', value)}
                        onBlur={() => void commitField('duration')}
                        disabled={!selectedCourse || savingField !== null || isNumericBlocked}
                        inputMode="decimal"
                    />

                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                        Site
                        <input
                            className="mt-1.5 w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600"
                            value="COLE"
                            readOnly
                        />
                    </label>

                    <div className="pt-1">
                        <GenericButton
                            type="button"
                            variant="dark"
                            label={deleting ? 'Eliminando...' : 'Borrado físico'}
                            icon={deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                            disabled={!selectedCourse || deleting || loading}
                            onClick={() => void handleDeleteCourse()}
                            className="text-xs! font-bold!"
                        />
                    </div>
                </section>
            </div>
        </div>
    );
};

const CourseTextField = ({
    label,
    value,
    onChange,
    onBlur,
    disabled,
    inputMode,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    onBlur?: () => void;
    disabled?: boolean;
    inputMode?: InputHTMLAttributes<HTMLInputElement>['inputMode'];
}) => (
    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide">
        {label}
        <input
            className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 disabled:bg-slate-100 disabled:text-slate-500"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onBlur}
            disabled={disabled}
            inputMode={inputMode}
        />
    </label>
);

const CourseTextAreaField = ({
    label,
    value,
    onChange,
    onBlur,
    rows,
    disabled,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    onBlur?: () => void;
    rows: number;
    disabled?: boolean;
}) => (
    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide">
        {label}
        <textarea
            className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 resize-y disabled:bg-slate-100 disabled:text-slate-500"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onBlur}
            rows={rows}
            disabled={disabled}
        />
    </label>
);
