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
import { COURSE_CATEGORIES } from '../../../../shared/courseCategories';
import { COURSE_DIFFICULTY_LEVELS } from '../../../../shared/courseDifficultyLevels';
import { NO_SUBTITLES_TEXT } from '../../../../shared/subtitleLanguages';

type EditableCourseDraft = {
    url: string;
    shortIntro: string;
    category: string;
    subCategory: string;
    courseType: string;
    language: string;
    subtitleLanguages: string;
    skills: string;
    duration: string;
};

type CatalogSelectFieldProps = {
    label: string;
    value: string;
    options: readonly string[];
    placeholder: string;
    onSelect: (value: string) => void;
    disabled?: boolean;
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
    duration: '',
};

const CATEGORY_PLACEHOLDER = 'Selecciona una categoría';
const LEVEL_PLACEHOLDER = 'Selecciona un nivel';
const DURATION_ERROR_MESSAGE = 'La duración es obligatoria y debe ser mayor que 0 horas.';
const LANGUAGE_ERROR_MESSAGE = 'El idioma es obligatorio.';
const toNullableString = (value: string): string | null => {
    const trimmed = value.trim();
    return trimmed.length === 0 ? null : trimmed;
};

const normalizeSubtitleLanguagesInput = (value: string): string => {
    const trimmed = value.trim();
    return trimmed.length === 0 ? NO_SUBTITLES_TEXT : trimmed;
};

const toNullableNumber = (value: string): number | null => {
    const trimmed = value.trim();
    if (!trimmed) {
        return null;
    }
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
};

const getPositiveDurationError = (value: string): string => {
    const trimmed = value.trim();
    if (!trimmed) {
        return DURATION_ERROR_MESSAGE;
    }

    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed) || parsed <= 0) {
        return DURATION_ERROR_MESSAGE;
    }

    return '';
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
    duration: course.duration == null ? '' : String(course.duration),
});

const getCourseDisplayName = (course: Pick<AdminCourseCatalogItem, 'courseId' | 'title'>): string => {
    const normalizedTitle = course.title?.trim();
    if (normalizedTitle) {
        return normalizedTitle;
    }
    return `Curso sin título`;
};

const CatalogSelectField = ({
    label,
    value,
    options,
    placeholder,
    onSelect,
    disabled = false,
}: CatalogSelectFieldProps) => (
    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide">
        {label}
        <select
            className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 disabled:bg-slate-100 disabled:text-slate-500"
            value={value}
            onChange={(event) => {
                const selectedValue = event.target.value;
                onSelect(selectedValue);
            }}
            disabled={disabled}
            required
        >
            <option value="" disabled>
                {placeholder}
            </option>
            {options.map((option) => (
                <option key={option} value={option}>
                    {option}
                </option>
            ))}
        </select>
    </label>
);

export const AdminCourseCatalogPanel = () => {
    const [courses, setCourses] = useState<AdminCourseCatalogItem[]>([]);
    const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
    const [modificationKeyword, setModificationKeyword] = useState('');
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
        duration: '',
    });

    const [loading, setLoading] = useState(false);
    const [savingChanges, setSavingChanges] = useState(false);
    const [creating, setCreating] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const selectedCourseIdRef = useRef<number | null>(null);

    const selectedCourse = useMemo(
        () => courses.find((course) => course.courseId === selectedCourseId) ?? null,
        [courses, selectedCourseId]
    );
    const modificationSuggestions = useMemo(() => {
        const normalized = modificationKeyword.trim().toLocaleLowerCase();
        if (normalized.length < 1) {
            return [] as AdminCourseCatalogItem[];
        }

        return courses.filter((course) =>
            getCourseDisplayName(course).toLocaleLowerCase().startsWith(normalized)
        );
    }, [courses, modificationKeyword]);
    const isCourseModificationBlocked = Boolean(selectedCourse?.used);

    const loadCatalog = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const data = await getAdminCourseCatalog();
            setCourses(data);
            if (!data.length) {
                setSelectedCourseId(null);
                setModificationKeyword('');
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
        subtitleLanguages: normalizeSubtitleLanguagesInput(createForm.subtitleLanguages),
        skills: toNullableString(createForm.skills),
        duration: toNullableNumber(createForm.duration),
    });

    const handleCreateCourse = async () => {
        if (!createForm.title.trim()) {
            setError('El título es obligatorio.');
            setSuccessMessage('');
            return;
        }

        if (!createForm.category.trim()) {
            setError('La categoría es obligatoria.');
            setSuccessMessage('');
            return;
        }

        if (!createForm.courseType.trim()) {
            setError('El nivel de dificultad es obligatorio.');
            setSuccessMessage('');
            return;
        }

        const durationError = getPositiveDurationError(createForm.duration);
        if (durationError) {
            setError(durationError);
            setSuccessMessage('');
            return;
        }

        if (!createForm.language.trim()) {
            setError(LANGUAGE_ERROR_MESSAGE);
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

    const handleSelectCourseFromSearch = (course: AdminCourseCatalogItem) => {
        setModificationKeyword(getCourseDisplayName(course));
        handleSelectCourse(course.courseId);
    };

    const updateDraftField = (field: keyof EditableCourseDraft, value: string) => {
        setDraft((prev) => ({ ...prev, [field]: value }));
    };

    const resolveMissingRequiredFieldError = (): string => {
        const draftCategory = draft.category.trim();
        const draftCourseType = draft.courseType.trim();
        const draftLanguage = draft.language.trim();

        if (!selectedCourse?.category?.trim() && !draftCategory) {
            return 'La categoría es obligatoria.';
        }

        if (!selectedCourse?.courseType?.trim() && !draftCourseType) {
            return 'El nivel de dificultad es obligatorio.';
        }

        if (!selectedCourse?.language?.trim() && !draftLanguage) {
            return LANGUAGE_ERROR_MESSAGE;
        }

        if (!draftLanguage) {
            return LANGUAGE_ERROR_MESSAGE;
        }

        const hasPersistedPositiveDuration = selectedCourse?.duration != null && selectedCourse.duration > 0;
        if (!hasPersistedPositiveDuration || draft.duration.trim().length > 0) {
            const durationError = getPositiveDurationError(draft.duration);
            if (durationError) {
                return durationError;
            }
        }

        return '';
    };

    const handleSaveChanges = async () => {
        if (!selectedCourse) {
            return;
        }

        if (isCourseModificationBlocked) {
            setError('Curso activo.');
            setSuccessMessage('');
            return;
        }

        const missingFieldError = resolveMissingRequiredFieldError();
        if (missingFieldError) {
            setError(missingFieldError);
            return;
        }

        const normalizedPayload: Record<string, string | number | null> = {
            url: toNullableString(draft.url),
            shortIntro: toNullableString(draft.shortIntro),
            category: toNullableString(draft.category),
            subCategory: toNullableString(draft.subCategory),
            courseType: toNullableString(draft.courseType),
            language: toNullableString(draft.language),
            subtitleLanguages: normalizeSubtitleLanguagesInput(draft.subtitleLanguages),
            skills: toNullableString(draft.skills),
            duration: toNullableNumber(draft.duration),
        };

        const changedFields = Object.entries(normalizedPayload).reduce<Record<string, string | number | null>>(
            (acc, [field, value]) => {
                const previousValue = selectedCourse[field as keyof AdminCourseCatalogItem] as string | number | null;
                if ((value ?? null) !== (previousValue ?? null)) {
                    acc[field] = value;
                }
                return acc;
            },
            {}
        );

        if (Object.keys(changedFields).length === 0) {
            setSuccessMessage('No hay cambios para guardar.');
            setError('');
            return;
        }

        setSavingChanges(true);
        setError('');
        setSuccessMessage('');

        try {
            const updated = await patchAdminCourse(selectedCourse.courseId, changedFields);
            setCourses((prev) => prev.map((course) => (course.courseId === updated.courseId ? updated : course)));
            setDraft(toDraft(updated));
            setSuccessMessage('Cambios guardados');
        } catch (err) {
            setError(resolveAdminCourseCatalogError(err));
            if (selectedCourse) {
                setDraft(toDraft(selectedCourse));
            }
        } finally {
            setSavingChanges(false);
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
                    disabled={loading || creating || deleting || savingChanges}
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
                    <CourseTextAreaField label="Introducción breve" value={createForm.shortIntro} onChange={(value) => handleCreateInputChange('shortIntro', value)} rows={2} />
                    <CatalogSelectField
                        label="Categoría (obligatoria)"
                        value={createForm.category}
                        options={COURSE_CATEGORIES}
                        placeholder={CATEGORY_PLACEHOLDER}
                        onSelect={(value) => handleCreateInputChange('category', value)}
                        disabled={loading || creating || deleting}
                    />
                    <CourseTextField label="Subcategoría" value={createForm.subCategory} onChange={(value) => handleCreateInputChange('subCategory', value)} />
                    <CatalogSelectField
                        label="Nivel de dificultad (obligatorio)"
                        value={createForm.courseType}
                        options={COURSE_DIFFICULTY_LEVELS}
                        placeholder={LEVEL_PLACEHOLDER}
                        onSelect={(value) => handleCreateInputChange('courseType', value)}
                        disabled={loading || creating || deleting}
                    />
                    <CourseTextField label="Idioma (obligatorio)" value={createForm.language} onChange={(value) => handleCreateInputChange('language', value)} />
                    <CourseTextField label="Idiomas de subtítulos (si no hay, se guarda 'Sin subtítulos')" value={createForm.subtitleLanguages} onChange={(value) => handleCreateInputChange('subtitleLanguages', value)} />
                    <CourseTextAreaField label="Habilidades" value={createForm.skills} onChange={(value) => handleCreateInputChange('skills', value)} rows={2} />
                    <CourseTextField label="Duración (horas, > 0)" value={createForm.duration} onChange={(value) => handleCreateInputChange('duration', value)} inputMode="decimal" />

                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                        Sitio
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
                        <input
                            className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
                            type="text"
                            value={modificationKeyword}
                            onChange={(e) => {
                                setModificationKeyword(e.target.value);
                                setError('');
                                setSuccessMessage('');
                            }}
                            placeholder="Escribe el inicio del curso..."
                            disabled={loading || courses.length === 0}
                        />
                    </label>

                    {!loading && modificationKeyword.trim().length >= 1 && (
                        <div className="max-h-52 overflow-y-auto pr-1 space-y-1.5">
                            {modificationSuggestions.map((course) => (
                                <button
                                    key={course.courseId}
                                    type="button"
                                    onClick={() => handleSelectCourseFromSearch(course)}
                                    className={`w-full text-left p-2.5 rounded-lg border transition-colors ${selectedCourseId === course.courseId
                                        ? 'bg-indigo-50 border-indigo-200'
                                        : 'bg-slate-50 border-slate-100 hover:bg-indigo-50'
                                        }`}
                                >
                                    <p className="text-sm font-bold text-slate-700">{getCourseDisplayName(course)}</p>
                                </button>
                            ))}
                        </div>
                    )}

                    {!loading && modificationKeyword.trim().length >= 1 && modificationSuggestions.length === 0 && (
                        <p className="text-[11px] text-slate-400 italic">
                            No hay cursos cuyo nombre comience por "{modificationKeyword.trim()}".
                        </p>
                    )}

                    {selectedCourse && (
                        <>
                            {!selectedCourse.category?.trim() && (
                                <div className="text-[11px] text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-2">
                                    Este curso todavía no tiene categoría. Debes seleccionar una antes de guardar cambios.
                                </div>
                            )}

                            {!selectedCourse.courseType?.trim() && (
                                <div className="text-[11px] text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-2">
                                    Este curso todavía no tiene nivel de dificultad. Debes seleccionar uno antes de guardar cambios.
                                </div>
                            )}

                            {(!selectedCourse.duration || selectedCourse.duration <= 0) && (
                                <div className="text-[11px] text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-2">
                                    Este curso todavía no tiene una duración válida. Debes indicar horas mayores que 0 para habilitar estadísticas y avance.
                                </div>
                            )}

                            {!selectedCourse.language?.trim() && (
                                <div className="text-[11px] text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-2">
                                    Este curso todavía no tiene idioma. Debes indicar uno antes de guardar cambios.
                                </div>
                            )}

                            {!selectedCourse.subtitleLanguages?.trim() && (
                                <div className="text-[11px] text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-2">
                                    Este curso todavía no tiene subtítulos informados. Al guardar, se autocompletará con "Sin subtítulos".
                                </div>
                            )}

                            {isCourseModificationBlocked && (
                                <div className="text-[11px] text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-2">
                                    Este curso está activo o tiene uso histórico. No se permite modificar ningún campo.
                                </div>
                            )}

                        </>
                    )}

                    <CourseTextField
                        label="URL"
                        value={draft.url}
                        onChange={(value) => updateDraftField('url', value)}
                        disabled={!selectedCourse || savingChanges || isCourseModificationBlocked}
                    />
                    <CourseTextAreaField
                        label="Introducción breve"
                        value={draft.shortIntro}
                        onChange={(value) => updateDraftField('shortIntro', value)}
                        rows={2}
                        disabled={!selectedCourse || savingChanges || isCourseModificationBlocked}
                    />
                    <CatalogSelectField
                        label="Categoría (obligatoria)"
                        value={draft.category}
                        options={COURSE_CATEGORIES}
                        placeholder={CATEGORY_PLACEHOLDER}
                        onSelect={(value) => updateDraftField('category', value)}
                        disabled={!selectedCourse || savingChanges || isCourseModificationBlocked}
                    />
                    <CourseTextField
                        label="Subcategoría"
                        value={draft.subCategory}
                        onChange={(value) => updateDraftField('subCategory', value)}
                        disabled={!selectedCourse || savingChanges || isCourseModificationBlocked}
                    />
                    <CatalogSelectField
                        label="Nivel de dificultad (obligatorio)"
                        value={draft.courseType}
                        options={COURSE_DIFFICULTY_LEVELS}
                        placeholder={LEVEL_PLACEHOLDER}
                        onSelect={(value) => updateDraftField('courseType', value)}
                        disabled={!selectedCourse || savingChanges || isCourseModificationBlocked}
                    />
                    <CourseTextField
                        label="Idioma (obligatorio)"
                        value={draft.language}
                        onChange={(value) => updateDraftField('language', value)}
                        disabled={!selectedCourse || savingChanges || isCourseModificationBlocked}
                    />
                    <CourseTextField
                        label="Idiomas de subtítulos (si no hay, se guarda 'Sin subtítulos')"
                        value={draft.subtitleLanguages}
                        onChange={(value) => updateDraftField('subtitleLanguages', value)}
                        disabled={!selectedCourse || savingChanges || isCourseModificationBlocked}
                    />
                    <CourseTextAreaField
                        label="Habilidades"
                        value={draft.skills}
                        onChange={(value) => updateDraftField('skills', value)}
                        rows={2}
                        disabled={!selectedCourse || savingChanges || isCourseModificationBlocked}
                    />

                    <CourseTextField
                        label="Duración (horas, > 0)"
                        value={draft.duration}
                        onChange={(value) => updateDraftField('duration', value)}
                        disabled={!selectedCourse || savingChanges || isCourseModificationBlocked}
                        inputMode="decimal"
                    />

                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                        Sitio
                        <input
                            className="mt-1.5 w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600"
                            value="COLE"
                            readOnly
                        />
                    </label>

                    <div className="pt-1">
                        <GenericButton
                            type="button"
                            variant="primary"
                            label={savingChanges ? 'Guardando...' : 'Guardar cambios'}
                            icon={savingChanges ? <Loader2 size={14} className="animate-spin" /> : <PlusCircle size={14} />}
                            disabled={!selectedCourse || deleting || loading || savingChanges || isCourseModificationBlocked}
                            onClick={() => void handleSaveChanges()}
                            className="text-xs! font-bold!"
                        />
                    </div>

                    <div className="pt-1">
                        <GenericButton
                            type="button"
                            variant="dark"
                            label={deleting ? 'Eliminando...' : 'Borrado físico'}
                            icon={deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                            disabled={!selectedCourse || deleting || loading || savingChanges}
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
