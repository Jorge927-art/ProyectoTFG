import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from './apiClient';
import { getAdminStudentPreferences, resolveAdminStudentPreferencesError } from './adminStudentPreferencesService';
import axios from 'axios';

vi.mock('./apiClient', () => ({
    apiClient: {
        get: vi.fn(),
    },
}));

describe('adminStudentPreferencesService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('consulta el resumen agregado de preferencias y demanda', async () => {
        const payload = {
            studentsWithPreferences: 3,
            activeStudentsWithEnrollments: 8,
            preferences: [],
            courses: [],
        };
        vi.mocked(apiClient.get).mockResolvedValue({ data: payload } as never);

        await expect(getAdminStudentPreferences()).resolves.toEqual(payload);
        expect(apiClient.get).toHaveBeenCalledWith('/api/admin/statistics/student-preferences', { timeout: 30000 });
    });

    it('extrae el mensaje controlado del backend', () => {
        vi.spyOn(axios, 'isAxiosError').mockReturnValue(true);

        expect(resolveAdminStudentPreferencesError({
            response: { data: { message: 'Error de cálculo agregado.' } },
        })).toBe('Error de cálculo agregado.');
    });

    it('usa el campo error cuando el backend no envía message', () => {
        vi.spyOn(axios, 'isAxiosError').mockReturnValue(true);

        expect(resolveAdminStudentPreferencesError({
            response: { data: { error: 'No hay datos agregables.' } },
        })).toBe('No hay datos agregables.');
    });

    it('usa el mensaje genérico para errores no Axios o payloads vacíos', () => {
        vi.spyOn(axios, 'isAxiosError').mockReturnValue(false);

        expect(resolveAdminStudentPreferencesError(new Error('fallo local')))
            .toBe('No se pudo actualizar el análisis de preferencias de los alumnos.');

        vi.mocked(axios.isAxiosError).mockReturnValue(true);
        expect(resolveAdminStudentPreferencesError({ response: { data: {} } }))
            .toBe('No se pudo actualizar el análisis de preferencias de los alumnos.');
    });
});
