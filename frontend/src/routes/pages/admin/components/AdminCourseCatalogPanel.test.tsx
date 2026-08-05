import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { AdminCourseCatalogPanel } from './AdminCourseCatalogPanel';
import * as catalogService from '../../../../services/adminCourseCatalogService';

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
        category: 'Ingenieria',
        subCategory: null,
        courseType: null,
        language: 'ES',
        subtitleLanguages: null,
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
        category: 'Ciencia',
        subCategory: null,
        courseType: null,
        language: 'ES',
        subtitleLanguages: null,
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
            courseType: null,
            language: null,
            subtitleLanguages: null,
            skills: null,
            instructors: null,
            rating: null,
            numOfViewers: null,
            duration: null,
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

    it('carga el catálogo y muestra el selector de curso por ID', async () => {
        render(<AdminCourseCatalogPanel />);

        await waitFor(() => {
            expect(catalogService.getAdminCourseCatalog).toHaveBeenCalledTimes(1);
        });

        expect(screen.getByRole('option', { name: 'Curso ID 10' })).toBeInTheDocument();
        expect(screen.getByRole('option', { name: 'Curso ID 20' })).toBeInTheDocument();
    });

    it('alta positiva: crea curso al informar título obligatorio', async () => {
        render(<AdminCourseCatalogPanel />);

        await waitFor(() => {
            expect(catalogService.getAdminCourseCatalog).toHaveBeenCalled();
        });

        fireEvent.change(screen.getByPlaceholderText('Ej. Arquitectura de Software'), {
            target: { value: 'Nuevo curso' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Dar de alta curso' }));

        await waitFor(() => {
            expect(catalogService.createAdminCourse).toHaveBeenCalled();
        });

        expect(screen.getByText('Curso creado correctamente.')).toBeInTheDocument();
        expect(catalogService.createAdminCourse).toHaveBeenCalledWith(
            expect.objectContaining({
                title: 'Nuevo curso',
                url: null,
                shortIntro: null,
            })
        );
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

        const categoryInput = within(modSection as HTMLElement).getByLabelText('Category');
        expect(categoryInput).not.toBeDisabled();
        fireEvent.focus(categoryInput);
        fireEvent.change(categoryInput, { target: { value: 'Data' } });
        fireEvent.blur(categoryInput);

        await waitFor(() => {
            expect(catalogService.patchAdminCourse).toHaveBeenCalledWith(10, { category: 'Data' });
        });

        expect(screen.getByText('Campo actualizado correctamente.')).toBeInTheDocument();
    });

    it('curso usado: bloquea edición de Rating, Number of viewers y Duration', async () => {
        render(<AdminCourseCatalogPanel />);

        await waitFor(() => {
            expect(catalogService.getAdminCourseCatalog).toHaveBeenCalled();
        });

        fireEvent.change(screen.getByLabelText('Curso a modificar'), { target: { value: '20' } });

        const modSection = screen.getByText('Modificación parcial').closest('section') as HTMLElement;
        const ratingInput = within(modSection).getByLabelText('Rating');
        const viewersInput = within(modSection).getByLabelText('Number of viewers');
        const durationInput = within(modSection).getByLabelText('Duration');

        expect(ratingInput).toBeDisabled();
        expect(viewersInput).toBeDisabled();
        expect(durationInput).toBeDisabled();
        expect(screen.getByText(/Curso activo: Rating, Number of viewers y Duration están bloqueados\./i)).toBeInTheDocument();
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
    });
});
