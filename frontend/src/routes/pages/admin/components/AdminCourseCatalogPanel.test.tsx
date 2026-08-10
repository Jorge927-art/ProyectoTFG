import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { AdminCourseCatalogPanel } from './AdminCourseCatalogPanel';
import * as catalogService from '../../../../services/adminCourseCatalogService';
import { COURSE_CATEGORIES } from '../../../../shared/courseCategories';
import { COURSE_DIFFICULTY_LEVELS } from '../../../../shared/courseDifficultyLevels';

vi.mock('../../../../services/adminCourseCatalogService', async () => {
    const actual = await vi.importActual<typeof import('../../../../services/adminCourseCatalogService')>(
        '../../../../services/adminCourseCatalogService'
    );

    return {
        ...actual,
        getAdminCourseCatalog: vi.fn(),
        createAdminCourse: vi.fn(),
        patchAdminCourse: vi.fn(),
        deleteAdminCourse: vi.fn(),
        resolveAdminCourseCatalogError: vi.fn((err: unknown) =>
            err instanceof Error ? err.message : 'Error controlado'
        ),
    };
});

const baseCatalog = [
    {
        courseId: 10,
        title: 'Arquitectura',
        url: null,
        shortIntro: null,
        category: COURSE_CATEGORIES[0],
        subCategory: null,
        courseType: COURSE_DIFFICULTY_LEVELS[0],
        language: 'ES',
        subtitleLanguages: 'ES',
        skills: null,
        instructors: null,
        rating: 4.2,
        numOfViewers: 200,
        duration: 18,
        site: 'COLE',
        used: false,
    },
    {
        courseId: 20,
        title: 'Matematicas',
        url: null,
        shortIntro: null,
        category: COURSE_CATEGORIES[1],
        subCategory: null,
        courseType: COURSE_DIFFICULTY_LEVELS[1],
        language: 'ES',
        subtitleLanguages: 'ES',
        skills: null,
        instructors: null,
        rating: 3.9,
        numOfViewers: 80,
        duration: 25,
        site: 'COLE',
        used: true,
    },
];

describe('AdminCourseCatalogPanel', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(window, 'confirm').mockReturnValue(true);
        vi.spyOn(catalogService, 'getAdminCourseCatalog').mockResolvedValue(baseCatalog);
        vi.spyOn(catalogService, 'createAdminCourse').mockResolvedValue({
            courseId: 30,
            title: 'Nuevo curso',
            url: null,
            shortIntro: null,
            category: null,
            subCategory: null,
            courseType: COURSE_DIFFICULTY_LEVELS[0],
            language: null,
            subtitleLanguages: null,
            skills: null,
            instructors: null,
            rating: null,
            numOfViewers: null,
            duration: 12,
            site: 'COLE',
            used: false,
        });
        vi.spyOn(catalogService, 'patchAdminCourse').mockImplementation(async (courseId, changes) => {
            const target = baseCatalog.find((course) => course.courseId === courseId);
            if (!target) {
                throw new Error('No encontrado');
            }
            return {
                ...target,
                ...changes,
                site: 'COLE',
            } as (typeof baseCatalog)[number];
        });
        vi.spyOn(catalogService, 'deleteAdminCourse').mockResolvedValue({ message: 'Curso eliminado correctamente.' });
    });

    it('carga el catálogo y muestra el selector de curso por título', async () => {
        render(<AdminCourseCatalogPanel />);

        await waitFor(() => {
            expect(catalogService.getAdminCourseCatalog).toHaveBeenCalledTimes(1);
        });

        expect(screen.getByRole('option', { name: 'Arquitectura' })).toBeInTheDocument();
        expect(screen.getByRole('option', { name: 'Matematicas' })).toBeInTheDocument();
        expect(screen.getByText('Curso seleccionado:')).toBeInTheDocument();
        expect(screen.getAllByText('Arquitectura')).toHaveLength(2);
        expect(screen.queryByText(/Estado de borrado:/i)).not.toBeInTheDocument();
    });

    it('alta positiva: crea curso al informar título obligatorio', async () => {
        render(<AdminCourseCatalogPanel />);

        await waitFor(() => {
            expect(catalogService.getAdminCourseCatalog).toHaveBeenCalled();
        });

        fireEvent.change(screen.getByPlaceholderText('Ej. Arquitectura de Software'), {
            target: { value: 'Nuevo curso' },
        });
        const createSection = screen.getByText('Alta de curso').closest('section');
        expect(createSection).not.toBeNull();
        fireEvent.change(within(createSection as HTMLElement).getByLabelText('Categoría (obligatoria)'), {
            target: { value: COURSE_CATEGORIES[0] },
        });
        fireEvent.change(within(createSection as HTMLElement).getByLabelText('Nivel de dificultad (obligatorio)'), {
            target: { value: COURSE_DIFFICULTY_LEVELS[0] },
        });
        fireEvent.change(within(createSection as HTMLElement).getByLabelText('Idioma (obligatorio)'), {
            target: { value: 'ES' },
        });
        fireEvent.change(within(createSection as HTMLElement).getByLabelText("Idiomas de subtítulos (si no hay, se guarda 'Sin subtítulos')"), {
            target: { value: 'ES' },
        });
        fireEvent.change(within(createSection as HTMLElement).getByLabelText('Duración (horas, > 0)'), {
            target: { value: '12' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Dar de alta curso' }));

        await waitFor(() => {
            expect(catalogService.createAdminCourse).toHaveBeenCalled();
        });

        expect(screen.getByText('Curso creado correctamente.')).toBeInTheDocument();
        expect(catalogService.createAdminCourse).toHaveBeenCalledWith(
            expect.objectContaining({
                title: 'Nuevo curso',
                category: COURSE_CATEGORIES[0],
                courseType: COURSE_DIFFICULTY_LEVELS[0],
                duration: 12,
                url: null,
                shortIntro: null,
            })
        );
    });

    it('alta negativa: rechaza formulario sin duración', async () => {
        render(<AdminCourseCatalogPanel />);

        await waitFor(() => {
            expect(catalogService.getAdminCourseCatalog).toHaveBeenCalled();
        });

        fireEvent.change(screen.getByPlaceholderText('Ej. Arquitectura de Software'), {
            target: { value: 'Nuevo curso' },
        });
        const createSection = screen.getByText('Alta de curso').closest('section');
        expect(createSection).not.toBeNull();
        fireEvent.change(within(createSection as HTMLElement).getByLabelText('Categoría (obligatoria)'), {
            target: { value: COURSE_CATEGORIES[0] },
        });
        fireEvent.change(within(createSection as HTMLElement).getByLabelText('Nivel de dificultad (obligatorio)'), {
            target: { value: COURSE_DIFFICULTY_LEVELS[0] },
        });
        fireEvent.change(within(createSection as HTMLElement).getByLabelText('Idioma (obligatorio)'), {
            target: { value: 'ES' },
        });
        fireEvent.change(within(createSection as HTMLElement).getByLabelText("Idiomas de subtítulos (si no hay, se guarda 'Sin subtítulos')"), {
            target: { value: 'ES' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Dar de alta curso' }));

        expect(screen.getByText('La duración es obligatoria y debe ser mayor que 0 horas.')).toBeInTheDocument();
        expect(catalogService.createAdminCourse).not.toHaveBeenCalled();
    });

    it('alta negativa: rechaza duración igual a cero', async () => {
        render(<AdminCourseCatalogPanel />);

        await waitFor(() => {
            expect(catalogService.getAdminCourseCatalog).toHaveBeenCalled();
        });

        fireEvent.change(screen.getByPlaceholderText('Ej. Arquitectura de Software'), {
            target: { value: 'Nuevo curso' },
        });
        const createSection = screen.getByText('Alta de curso').closest('section');
        expect(createSection).not.toBeNull();
        fireEvent.change(within(createSection as HTMLElement).getByLabelText('Categoría (obligatoria)'), {
            target: { value: COURSE_CATEGORIES[0] },
        });
        fireEvent.change(within(createSection as HTMLElement).getByLabelText('Nivel de dificultad (obligatorio)'), {
            target: { value: COURSE_DIFFICULTY_LEVELS[0] },
        });
        fireEvent.change(within(createSection as HTMLElement).getByLabelText('Idioma (obligatorio)'), {
            target: { value: 'ES' },
        });
        fireEvent.change(within(createSection as HTMLElement).getByLabelText("Idiomas de subtítulos (si no hay, se guarda 'Sin subtítulos')"), {
            target: { value: 'ES' },
        });
        fireEvent.change(within(createSection as HTMLElement).getByLabelText('Duración (horas, > 0)'), {
            target: { value: '0' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Dar de alta curso' }));

        expect(screen.getByText('La duración es obligatoria y debe ser mayor que 0 horas.')).toBeInTheDocument();
        expect(catalogService.createAdminCourse).not.toHaveBeenCalled();
    });

    it('alta negativa: rechaza formulario sin categoría', async () => {
        render(<AdminCourseCatalogPanel />);

        await waitFor(() => {
            expect(catalogService.getAdminCourseCatalog).toHaveBeenCalled();
        });

        fireEvent.change(screen.getByPlaceholderText('Ej. Arquitectura de Software'), {
            target: { value: 'Nuevo curso' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Dar de alta curso' }));

        expect(screen.getByText('La categoría es obligatoria.')).toBeInTheDocument();
        expect(catalogService.createAdminCourse).not.toHaveBeenCalled();
    });

    it('alta negativa: rechaza formulario sin nivel de dificultad', async () => {
        render(<AdminCourseCatalogPanel />);

        await waitFor(() => {
            expect(catalogService.getAdminCourseCatalog).toHaveBeenCalled();
        });

        fireEvent.change(screen.getByPlaceholderText('Ej. Arquitectura de Software'), {
            target: { value: 'Nuevo curso' },
        });
        const createSection = screen.getByText('Alta de curso').closest('section');
        expect(createSection).not.toBeNull();
        fireEvent.change(within(createSection as HTMLElement).getByLabelText('Categoría (obligatoria)'), {
            target: { value: COURSE_CATEGORIES[0] },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Dar de alta curso' }));

        expect(screen.getByText('El nivel de dificultad es obligatorio.')).toBeInTheDocument();
        expect(catalogService.createAdminCourse).not.toHaveBeenCalled();
    });

    it('alta negativa: rechaza formulario sin idioma', async () => {
        render(<AdminCourseCatalogPanel />);

        await waitFor(() => {
            expect(catalogService.getAdminCourseCatalog).toHaveBeenCalled();
        });

        fireEvent.change(screen.getByPlaceholderText('Ej. Arquitectura de Software'), {
            target: { value: 'Nuevo curso' },
        });
        const createSection = screen.getByText('Alta de curso').closest('section');
        expect(createSection).not.toBeNull();
        fireEvent.change(within(createSection as HTMLElement).getByLabelText('Categoría (obligatoria)'), {
            target: { value: COURSE_CATEGORIES[0] },
        });
        fireEvent.change(within(createSection as HTMLElement).getByLabelText('Nivel de dificultad (obligatorio)'), {
            target: { value: COURSE_DIFFICULTY_LEVELS[0] },
        });
        fireEvent.change(within(createSection as HTMLElement).getByLabelText('Duración (horas, > 0)'), {
            target: { value: '12' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Dar de alta curso' }));

        expect(screen.getByText('El idioma es obligatorio.')).toBeInTheDocument();
        expect(catalogService.createAdminCourse).not.toHaveBeenCalled();
    });

    it('alta con subtítulos vacíos: envía texto informativo por defecto', async () => {
        render(<AdminCourseCatalogPanel />);

        await waitFor(() => {
            expect(catalogService.getAdminCourseCatalog).toHaveBeenCalled();
        });

        fireEvent.change(screen.getByPlaceholderText('Ej. Arquitectura de Software'), {
            target: { value: 'Nuevo curso' },
        });
        const createSection = screen.getByText('Alta de curso').closest('section');
        expect(createSection).not.toBeNull();
        fireEvent.change(within(createSection as HTMLElement).getByLabelText('Categoría (obligatoria)'), {
            target: { value: COURSE_CATEGORIES[0] },
        });
        fireEvent.change(within(createSection as HTMLElement).getByLabelText('Nivel de dificultad (obligatorio)'), {
            target: { value: COURSE_DIFFICULTY_LEVELS[0] },
        });
        fireEvent.change(within(createSection as HTMLElement).getByLabelText('Idioma (obligatorio)'), {
            target: { value: 'ES' },
        });
        fireEvent.change(within(createSection as HTMLElement).getByLabelText('Duración (horas, > 0)'), {
            target: { value: '12' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Dar de alta curso' }));

        await waitFor(() => {
            expect(catalogService.createAdminCourse).toHaveBeenCalledWith(
                expect.objectContaining({ subtitleLanguages: 'Sin subtítulos' })
            );
        });
    });

    it('alta negativa: rechaza formulario sin título', async () => {
        render(<AdminCourseCatalogPanel />);

        await waitFor(() => {
            expect(catalogService.getAdminCourseCatalog).toHaveBeenCalled();
        });

        fireEvent.click(screen.getByRole('button', { name: 'Dar de alta curso' }));

        expect(screen.getByText('El título es obligatorio.')).toBeInTheDocument();
        expect(catalogService.createAdminCourse).not.toHaveBeenCalled();
    });

    it('modificación parcial: envía PATCH de campo descriptivo al perder foco', async () => {
        render(<AdminCourseCatalogPanel />);

        await waitFor(() => {
            expect(catalogService.getAdminCourseCatalog).toHaveBeenCalled();
        });

        const courseSelector = screen.getByLabelText('Curso a modificar');
        fireEvent.change(courseSelector, { target: { value: '10' } });

        const sections = screen.getAllByText(/Modificación parcial|Alta de curso/i);
        expect(sections.length).toBeGreaterThan(0);

        const modSectionTitle = screen.getByText('Modificación parcial');
        const modSection = modSectionTitle.closest('section');
        expect(modSection).not.toBeNull();

        fireEvent.change(within(modSection as HTMLElement).getByLabelText('Categoría (obligatoria)'), {
            target: { value: COURSE_CATEGORIES[2] },
        });

        await waitFor(() => {
            expect(catalogService.patchAdminCourse).toHaveBeenCalledWith(10, { category: COURSE_CATEGORIES[2] });
        });

        expect(screen.getByText('Campo actualizado correctamente.')).toBeInTheDocument();
    });

    it('modificación parcial: envía PATCH del nivel de dificultad al cambiar el selector', async () => {
        render(<AdminCourseCatalogPanel />);

        await waitFor(() => {
            expect(catalogService.getAdminCourseCatalog).toHaveBeenCalled();
        });

        fireEvent.change(screen.getByLabelText('Curso a modificar'), { target: { value: '10' } });

        const modSection = screen.getByText('Modificación parcial').closest('section');
        expect(modSection).not.toBeNull();

        fireEvent.change(within(modSection as HTMLElement).getByLabelText('Nivel de dificultad (obligatorio)'), {
            target: { value: COURSE_DIFFICULTY_LEVELS[2] },
        });

        await waitFor(() => {
            expect(catalogService.patchAdminCourse).toHaveBeenCalledWith(10, { courseType: COURSE_DIFFICULTY_LEVELS[2] });
        });

        expect(screen.getByText('Campo actualizado correctamente.')).toBeInTheDocument();
    });

    it('curso usado: bloquea edición de Rating y Number of viewers, pero permite corregir Duration', async () => {
        render(<AdminCourseCatalogPanel />);

        await waitFor(() => {
            expect(catalogService.getAdminCourseCatalog).toHaveBeenCalled();
        });

        fireEvent.change(screen.getByLabelText('Curso a modificar'), { target: { value: '20' } });

        const modSection = screen.getByText('Modificación parcial').closest('section') as HTMLElement;
        const ratingInput = within(modSection).getByLabelText('Valoración');
        const viewersInput = within(modSection).getByLabelText('Número de visualizaciones');
        const durationInput = within(modSection).getByLabelText('Duración (horas, > 0)');

        expect(ratingInput).toBeDisabled();
        expect(viewersInput).toBeDisabled();
        expect(durationInput).not.toBeDisabled();
        expect(screen.getByText(/Este curso ya está en uso y no permite editar Valoración ni Número de visualizaciones\./i)).toBeInTheDocument();
    });

    it('modificación parcial: rechaza duration igual a cero antes de enviar PATCH', async () => {
        render(<AdminCourseCatalogPanel />);

        await waitFor(() => {
            expect(catalogService.getAdminCourseCatalog).toHaveBeenCalled();
        });

        fireEvent.change(screen.getByLabelText('Curso a modificar'), { target: { value: '10' } });

        const modSection = screen.getByText('Modificación parcial').closest('section');
        expect(modSection).not.toBeNull();

        fireEvent.change(within(modSection as HTMLElement).getByLabelText('Duración (horas, > 0)'), {
            target: { value: '0' },
        });
        fireEvent.blur(within(modSection as HTMLElement).getByLabelText('Duración (horas, > 0)'));

        expect(screen.getByText('La duración es obligatoria y debe ser mayor que 0 horas.')).toBeInTheDocument();
        expect(catalogService.patchAdminCourse).not.toHaveBeenCalledWith(10, { duration: 0 });
    });

    it('modificación parcial: permite actualizar Duration en curso usado para corregir datos históricos', async () => {
        render(<AdminCourseCatalogPanel />);

        await waitFor(() => {
            expect(catalogService.getAdminCourseCatalog).toHaveBeenCalled();
        });

        fireEvent.change(screen.getByLabelText('Curso a modificar'), { target: { value: '20' } });

        const modSection = screen.getByText('Modificación parcial').closest('section');
        expect(modSection).not.toBeNull();

        fireEvent.change(within(modSection as HTMLElement).getByLabelText('Duración (horas, > 0)'), {
            target: { value: '30' },
        });
        fireEvent.blur(within(modSection as HTMLElement).getByLabelText('Duración (horas, > 0)'));

        await waitFor(() => {
            expect(catalogService.patchAdminCourse).toHaveBeenCalledWith(20, { duration: 30 });
        });
    });

    it('borrado negativo: muestra error de backend cuando curso activo no puede borrarse', async () => {
        vi.spyOn(catalogService, 'deleteAdminCourse').mockRejectedValueOnce(new Error('Curso activo.'));

        render(<AdminCourseCatalogPanel />);

        await waitFor(() => {
            expect(catalogService.getAdminCourseCatalog).toHaveBeenCalled();
        });

        fireEvent.change(screen.getByLabelText('Curso a modificar'), { target: { value: '20' } });
        fireEvent.click(screen.getByRole('button', { name: 'Borrado físico' }));

        await waitFor(() => {
            expect(catalogService.deleteAdminCourse).toHaveBeenCalledWith(20);
        });

        expect(screen.getByText('Curso activo.')).toBeInTheDocument();
    });

    it('borrado positivo: elimina curso y muestra confirmación', async () => {
        render(<AdminCourseCatalogPanel />);

        await waitFor(() => {
            expect(catalogService.getAdminCourseCatalog).toHaveBeenCalled();
        });

        fireEvent.change(screen.getByLabelText('Curso a modificar'), { target: { value: '10' } });
        fireEvent.click(screen.getByRole('button', { name: 'Borrado físico' }));

        await waitFor(() => {
            expect(catalogService.deleteAdminCourse).toHaveBeenCalledWith(10);
        });

        expect(screen.getByText('Curso eliminado correctamente.')).toBeInTheDocument();
        expect(window.confirm).toHaveBeenCalled();
        expect(window.confirm).toHaveBeenCalledWith('¿Deseas eliminar físicamente el curso "Arquitectura"?');
    });
});
