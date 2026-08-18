import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
    createAdminCourse,
    deleteAdminCourse,
    getAdminCourseCatalog,
    patchAdminCourse,
    resolveAdminCourseCatalogError,
} from './adminCourseCatalogService';
import { apiClient } from './apiClient';
import axios from 'axios';

vi.mock('./apiClient', () => ({
    apiClient: {
        get: vi.fn(),
        post: vi.fn(),
        patch: vi.fn(),
        delete: vi.fn(),
    },
}));

vi.mock('axios', () => ({
    default: {
        isAxiosError: vi.fn(),
    },
}));

describe('adminCourseCatalogService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('consulta el catálogo de cursos admin', async () => {
        const catalog = [{ courseId: 10, title: 'Arquitectura', used: false }];
        vi.mocked(apiClient.get).mockResolvedValue({ data: catalog } as never);

        const result = await getAdminCourseCatalog();

        expect(apiClient.get).toHaveBeenCalledWith('/api/admin/courses/catalog');
        expect(result).toEqual(catalog);
    });

    it('devuelve un catálogo vacío si la respuesta no es un array', async () => {
        vi.mocked(apiClient.get).mockResolvedValue({ data: { items: [] } } as never);

        await expect(getAdminCourseCatalog()).resolves.toEqual([]);
    });

    it('crea un curso con el payload recibido', async () => {
        const payload = {
            title: 'Nuevo curso',
            category: 'Tecnología',
            courseType: 'Básico',
            duration: 12,
        };
        const createdCourse = { courseId: 30, ...payload, site: 'COLE', used: false };
        vi.mocked(apiClient.post).mockResolvedValue({ data: createdCourse } as never);

        const result = await createAdminCourse(payload);

        expect(apiClient.post).toHaveBeenCalledWith('/api/admin/courses', payload);
        expect(result).toEqual(createdCourse);
    });

    it('actualiza un curso por su identificador', async () => {
        const changes = { shortIntro: 'Descripción actualizada', duration: 20 };
        const updatedCourse = { courseId: 10, title: 'Arquitectura', ...changes };
        vi.mocked(apiClient.patch).mockResolvedValue({ data: updatedCourse } as never);

        const result = await patchAdminCourse(10, changes);

        expect(apiClient.patch).toHaveBeenCalledWith('/api/admin/courses/10', changes);
        expect(result).toEqual(updatedCourse);
    });

    it('elimina un curso por su identificador', async () => {
        const response = { message: 'Curso eliminado correctamente.' };
        vi.mocked(apiClient.delete).mockResolvedValue({ data: response } as never);

        const result = await deleteAdminCourse(10);

        expect(apiClient.delete).toHaveBeenCalledWith('/api/admin/courses/10');
        expect(result).toEqual(response);
    });

    it('prioriza message del backend al resolver un error Axios', () => {
        vi.mocked(axios.isAxiosError).mockReturnValue(true);

        expect(resolveAdminCourseCatalogError({
            response: { data: { message: 'El curso ya existe.' } },
        })).toBe('El curso ya existe.');
    });

    it('usa error del backend cuando no existe message', () => {
        vi.mocked(axios.isAxiosError).mockReturnValue(true);

        expect(resolveAdminCourseCatalogError({
            response: { data: { error: 'El curso está siendo utilizado.' } },
        })).toBe('El curso está siendo utilizado.');
    });

    it('devuelve el fallback para errores Axios sin mensaje y errores no Axios', () => {
        vi.mocked(axios.isAxiosError).mockReturnValue(true);
        expect(resolveAdminCourseCatalogError({ response: { data: {} } }))
            .toBe('No se pudo completar la operación solicitada sobre el catálogo de cursos.');

        vi.mocked(axios.isAxiosError).mockReturnValue(false);
        expect(resolveAdminCourseCatalogError(new Error('Fallo de red')))
            .toBe('No se pudo completar la operación solicitada sobre el catálogo de cursos.');
    });
});
