import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getProfile, updateProfileData, uploadAvatarFile } from './profileService';
import { apiClient } from './apiClient';
import type { ProfileData, ProfileUpdateInput } from './profileService';

// --- AISLAMIENTO PERIMETRAL ESTRICTO: MOCK TIPADO DE API_CLIENT ---
vi.mock('./apiClient', () => ({
    apiClient: {
        get: vi.fn(),
        put: vi.fn(),
        post: vi.fn(),
    },
}));

// Extraemos la firma tipada dinámicamente de los métodos de simulación para evitar 'any'
type MockedApiClient = {
    get: ReturnType<typeof vi.fn>;
    put: ReturnType<typeof vi.fn>;
    post: ReturnType<typeof vi.fn>;
};

const mockedApi = apiClient as unknown as MockedApiClient;

describe('profileService - Suite de Pruebas Unitarias de Alta Fidelidad', () => {
    
    // Limpieza matemática de mocks antes de cada escenario de prueba
    beforeEach(() => {
        vi.clearAllMocks();
    });

    // --- ACCESORIOS DE DATOS SIMULADOS (FIXTURES) CON TIPADO ESTRICTO ---
    const mockProfileResponse: ProfileData = {
        username: 'tfg_student_2026',
        email: 'student@universidad.edu',
        role: 'SOFTWARE_ENGINEER',
        avatarPath: '/uploads/avatars/avatar_hash.png',
        phoneNumber: '+34600112233',
        homeAddress: 'Calle de la Lógica, 42, Madrid',
    };

    const mockUpdateInput: ProfileUpdateInput = {
        email: 'updated_student@universidad.edu',
        phoneNumber: '+34699887766',
        homeAddress: 'Avenida del Refactor, 7, Barcelona',
    };
    // --- BLOQUE 1: FLUJOS ASÍNCRONOS EXITOSOS (HAPPY PATHS) ---
    it('debe obtener y retornar los datos del perfil correctamente vía GET', async () => {
        // Simular respuesta exitosa del interceptor/cliente de la API
        mockedApi.get.mockResolvedValueOnce({ data: mockProfileResponse });

        const result = await getProfile();

        // Validar correspondencia exacta de los datos funcionales retornados
        expect(result).toEqual(mockProfileResponse);
        expect(mockedApi.get).toHaveBeenCalledTimes(1);
        expect(mockedApi.get).toHaveBeenCalledWith('/api/v1/profile');
    });

    it('debe enviar la actualización de datos de texto vía PUT y retornar el mensaje de éxito', async () => {
        const successMessage = { message: 'Perfil actualizado con éxito en el TFG' };
        mockedApi.put.mockResolvedValueOnce({ data: successMessage });

        const result = await updateProfileData(mockUpdateInput);

        // Validar el payload del payload mutado y la ruta REST
        expect(result).toEqual(successMessage);
        expect(mockedApi.put).toHaveBeenCalledTimes(1);
        expect(mockedApi.put).toHaveBeenCalledWith('/api/v1/profile/update', mockUpdateInput);
    });

    it('debe enviar un archivo binario mediante FormData vía POST especificando los headers multipart', async () => {
        const successAvatarResponse = { 
            message: 'Avatar subido correctamente', 
            path: '/uploads/avatars/new_avatar_2026.jpg' 
        };
        mockedApi.post.mockResolvedValueOnce({ data: successAvatarResponse });

        // Crear una instancia de File real (JS/Node environment) para la simulación
        const fileContent = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]); // Cabecera estándar binaria PNG
        const dummyFile = new File([fileContent], 'profile_pic.png', { type: 'image/png' });

        const result = await uploadAvatarFile(dummyFile);

        // Aserciones del resultado de resolución
        expect(result).toEqual(successAvatarResponse);
        expect(mockedApi.post).toHaveBeenCalledTimes(1);
        
        // Verificación estructural del primer parámetro (FormData) pasado al cliente REST sin usar 'any'
        const calledArgs = mockedApi.post.mock.calls[0] as [string, FormData, unknown];
        expect(calledArgs[0]).toBe('/api/v1/profile/avatar');
        expect(calledArgs[1]).toBeInstanceOf(FormData);
        expect(calledArgs[1].get('file')).toBe(dummyFile);
        
        // Verificación explícita de la configuración de cabeceras requerida por la directiva
        expect(calledArgs[2]).toEqual({
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
    });
    // --- BLOQUE 2: GESTIÓN DE EXCEPCIONES Y ESCENARIOS DE ERROR ---
    it('debe propagar limpiamente los errores HTTP generados por la API en getProfile', async () => {
        const networkError = new Error('Error de red 500: Fallo en el servidor del TFG');
        mockedApi.get.mockRejectedValueOnce(networkError);

        // Validar la propagación de la excepción de forma asíncrona y transparente
        await expect(getProfile()).rejects.toThrow('Error de red 500: Fallo en el servidor del TFG');
        expect(mockedApi.get).toHaveBeenCalledTimes(1);
    });

    it('debe propagar limpiamente los errores HTTP en updateProfileData ante payloads inválidos', async () => {
        const validationError = new Error('Error 400: El formato del correo electrónico es inválido');
        mockedApi.put.mockRejectedValueOnce(validationError);

        await expect(updateProfileData(mockUpdateInput)).rejects.toThrow(
            'Error 400: El formato del correo electrónico es inválido'
        );
        expect(mockedApi.put).toHaveBeenCalledTimes(1);
    });

    it('debe fallar y propagar el error si la subida multipart del archivo avatar es rechazada', async () => {
        const unauthenticatedError = new Error('Error 401: Sesión caducada, no se puede subir el archivo');
        mockedApi.post.mockRejectedValueOnce(unauthenticatedError);

        const dummyFile = new File([new Uint8Array()], 'corrupted.jpg', { type: 'image/jpeg' });

        await expect(uploadAvatarFile(dummyFile)).rejects.toThrow(
            'Error 401: Sesión caducada, no se puede subir el archivo'
        );
        expect(mockedApi.post).toHaveBeenCalledTimes(1);
    });
});
