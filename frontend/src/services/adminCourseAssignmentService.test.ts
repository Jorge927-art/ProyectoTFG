import { beforeEach, describe, expect, it, vi } from 'vitest';
import axios from 'axios';
import {
    getAdminCoursesByProfessor,
    getAdminProfessorOptions,
    reassignAdminCourseProfessor,
    resolveAdminCourseAssignmentError,
} from './adminCourseAssignmentService';
import { apiClient } from './apiClient';

vi.mock('./apiClient', () => ({
    apiClient: {
        get: vi.fn(),
        patch: vi.fn(),
    }
}));

describe('adminCourseAssignmentService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('getAdminProfessorOptions consulta el endpoint correcto', async () => {
        vi.mocked(apiClient.get).mockResolvedValue({
            data: [{ userId: 10, username: 'alfa_docente' }]
        } as never);

        const result = await getAdminProfessorOptions();

        expect(apiClient.get).toHaveBeenCalledWith('/api/admin/course-assignments/professors');
        expect(result).toEqual([{ userId: 10, username: 'alfa_docente' }]);
    });

    it('getAdminCoursesByProfessor consulta cursos del profesor indicado', async () => {
        vi.mocked(apiClient.get).mockResolvedValue({
            data: [{ courseId: 300, title: 'Arquitectura', currentProfessorUserId: 10, currentProfessorUsername: 'alfa_docente' }]
        } as never);

        const result = await getAdminCoursesByProfessor(10);

        expect(apiClient.get).toHaveBeenCalledWith('/api/admin/course-assignments/professors/10/courses');
        expect(result).toHaveLength(1);
        expect(result[0].currentProfessorUsername).toBe('alfa_docente');
    });

    it('reassignAdminCourseProfessor invoca PATCH con payload esperado', async () => {
        vi.mocked(apiClient.patch).mockResolvedValue({
            data: {
                message: 'ok',
                courseId: 300,
                courseTitle: 'Arquitectura',
                previousProfessorUserId: 10,
                previousProfessorUsername: 'alfa_docente',
                newProfessorUserId: 20,
                newProfessorUsername: 'beta_docente',
            }
        } as never);

        const result = await reassignAdminCourseProfessor(300, 20);

        expect(apiClient.patch).toHaveBeenCalledWith(
            '/api/admin/course-assignments/courses/300/reassign-professor',
            { professorId: 20 }
        );
        expect(result.newProfessorUsername).toBe('beta_docente');
    });

    it('resolveAdminCourseAssignmentError prioriza message del backend', () => {
        const err = { response: { data: { message: 'mensaje controlado' } } };
        vi.spyOn(axios, 'isAxiosError').mockReturnValue(true);

        expect(resolveAdminCourseAssignmentError(err)).toBe('mensaje controlado');
    });

    it('resolveAdminCourseAssignmentError usa error del backend cuando no hay message', () => {
        const err = { response: { data: { error: 'error controlado' } } };
        vi.spyOn(axios, 'isAxiosError').mockReturnValue(true);

        expect(resolveAdminCourseAssignmentError(err)).toBe('error controlado');
    });

    it('resolveAdminCourseAssignmentError devuelve fallback en errores no Axios', () => {
        vi.spyOn(axios, 'isAxiosError').mockReturnValue(false);

        expect(resolveAdminCourseAssignmentError(new Error('boom')))
            .toBe('No se pudo completar la reasignación del profesor para el curso.');
    });
});
