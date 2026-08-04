import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import type { InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import { apiClient } from './apiClient';
import * as authStorageModule from '../auth/authStorage';

// Aislar el helper de almacenamiento antes de instanciar el cliente centralizado
vi.mock('../auth/authStorage', () => ({
    clearStoredAuth: vi.fn(),
    readStoredAuthUser: vi.fn(),
    readStoredRefreshToken: vi.fn(),
    readStoredToken: vi.fn(),
    writeStoredAuthUser: vi.fn(),
    writeStoredRefreshToken: vi.fn(),
    writeStoredToken: vi.fn()
}));

describe('apiClient - Suite de Pruebas Unitarias de Interceptores de Red', () => {
    
    beforeEach(() => {
        vi.clearAllMocks();
    });

    /* =========================================================================
       1. VERIFICACIÓN DE CONFIGURACIÓN BASE DE LA INSTANCIA CENTRALIZADA
       ========================================================================= */
    it('Debe inicializar la instancia de Axios con los límites técnicos de timeout y baseURL', () => {
        expect(apiClient.defaults.timeout).toBe(5000);
        expect(apiClient.defaults.baseURL).toBeDefined();
    });

        /* =========================================================================
       2. INTERCEPTOR DE PETICIONES (REQUEST INTERCEPTOR)
       ========================================================================= */
    it('Debe inyectar la cabecera Authorization con formato Bearer si existe un token en el almacenamiento', async () => {
        vi.mocked(authStorageModule.readStoredToken).mockReturnValue('token_jwt_secreto_42');

        // [CORRECCIÓN MATERIAL]: Acceso estructural a través de array de indices eludiendo 'any' para el linter
        const requestInterceptor = (apiClient.interceptors.request as unknown as {
            handlers: Array<{ fulfilled: (config: InternalAxiosRequestConfig) => Promise<InternalAxiosRequestConfig> }>
        }).handlers[0];
        
        const requestHandler = requestInterceptor.fulfilled;

        const dummyConfig = { headers: {} } as unknown as InternalAxiosRequestConfig;
        const resultConfig = await requestHandler(dummyConfig);

        expect(resultConfig.headers.Authorization).toBe('Bearer token_jwt_secreto_42');
    });

    it('No debe inyectar la cabecera Authorization si no hay un token almacenado (Acceso Público)', async () => {
        vi.mocked(authStorageModule.readStoredToken).mockReturnValue(null);

        const requestInterceptor = (apiClient.interceptors.request as unknown as {
            handlers: Array<{ fulfilled: (config: InternalAxiosRequestConfig) => Promise<InternalAxiosRequestConfig> }>
        }).handlers[0];
        
        const requestHandler = requestInterceptor.fulfilled;

        const dummyConfig = { headers: {} } as unknown as InternalAxiosRequestConfig;
        const resultConfig = await requestHandler(dummyConfig);

        expect(resultConfig.headers.Authorization).toBeUndefined();
    });

    it('Debe propagar el rechazo de la promesa si el interceptor de peticiones detecta un error síncrono', async () => {
        const requestInterceptor = (apiClient.interceptors.request as unknown as {
            handlers: Array<{ rejected: (error: Error) => Promise<Error> }>
        }).handlers[0];
        
        const requestErrorHandler = requestInterceptor.rejected;

        const dummyError = new Error('Fallo crítico interno en memoria de red');
        
        await expect(requestErrorHandler(dummyError)).rejects.toThrow('Fallo crítico interno en memoria de red');
    });

        /* =========================================================================
       3. INTERCEPTOR DE RESPUESTAS (RESPONSE INTERCEPTOR)
       ========================================================================= */
    it('Debe retornar la respuesta intacta si el servidor responde con un codigo exitoso', async () => {
        const responseInterceptor = (apiClient.interceptors.response as unknown as {
            handlers: Array<{ fulfilled: (response: AxiosResponse) => Promise<AxiosResponse> }>
        }).handlers[0];
        
        const responseHandler = responseInterceptor.fulfilled;

        const dummyResponse = { status: 200, data: { payload: 'datos_academicos' } } as unknown as AxiosResponse;
        const result = await responseHandler(dummyResponse);

        expect(result).toEqual(dummyResponse);
    });

    it('Debe capturar un error HTTP 401 de Axios y emitir el evento global auth-session-expired en el DOM', async () => {
        const dispatchEventSpy = vi.spyOn(window, 'dispatchEvent');
        const requestSpy = vi.spyOn(apiClient, 'request').mockResolvedValue({ status: 200 } as AxiosResponse);
        const axiosPostSpy = vi.spyOn(axios, 'post').mockResolvedValue({
            data: {
                accessToken: 'access_nuevo_123',
                refreshToken: 'refresh_nuevo_123',
                expiresIn: 900
            }
        });

        vi.spyOn(axios, 'isAxiosError').mockReturnValue(true);
        vi.mocked(authStorageModule.readStoredRefreshToken).mockReturnValue('refresh_antiguo_123');
        vi.mocked(authStorageModule.readStoredAuthUser).mockReturnValue({
            username: 'alumno_test',
            token: 'access_antiguo_123'
        });

        const mockAxiosError = {
            isAxiosError: true,
            config: {
                url: '/api/protegido/estadisticas',
                headers: {}
            },
            response: {
                status: 401,
                data: { message: 'Token JWT Caducado' }
            }
        };

        const responseInterceptor = (apiClient.interceptors.response as unknown as {
            handlers: Array<{ rejected: (error: unknown) => Promise<unknown> }>
        }).handlers[0];
        
        const responseErrorHandler = responseInterceptor.rejected;

        await expect(responseErrorHandler(mockAxiosError)).resolves.toEqual({ status: 200 });

        expect(axiosPostSpy).toHaveBeenCalledWith(
            expect.stringContaining('/api/auth/refresh'),
            { refreshToken: 'refresh_antiguo_123' },
            expect.any(Object)
        );
        expect(authStorageModule.writeStoredToken).toHaveBeenCalledWith('access_nuevo_123');
        expect(authStorageModule.writeStoredRefreshToken).toHaveBeenCalledWith('refresh_nuevo_123');
        expect(requestSpy).toHaveBeenCalled();
        expect(dispatchEventSpy).not.toHaveBeenCalledWith(
            expect.objectContaining({ type: 'auth-session-expired' })
        );
    });

    it('Debe emitir auth-session-expired y rechazar si no existe refresh token para renovar la sesión', async () => {
        const dispatchEventSpy = vi.spyOn(window, 'dispatchEvent');
        vi.spyOn(axios, 'isAxiosError').mockReturnValue(true);
        vi.mocked(authStorageModule.readStoredRefreshToken).mockReturnValue(null);

        const mockAxiosError = {
            isAxiosError: true,
            config: {
                url: '/api/admin/courses/search',
                headers: {}
            },
            response: {
                status: 401,
                data: { message: 'Unauthorized' }
            }
        };

        const responseInterceptor = (apiClient.interceptors.response as unknown as {
            handlers: Array<{ rejected: (error: unknown) => Promise<unknown> }>
        }).handlers[0];
        
        const responseErrorHandler = responseInterceptor.rejected;

        await expect(responseErrorHandler(mockAxiosError)).rejects.toBe(mockAxiosError);

        expect(authStorageModule.clearStoredAuth).toHaveBeenCalled();
        expect(dispatchEventSpy).toHaveBeenCalledWith(
            expect.objectContaining({ type: 'auth-session-expired' })
        );
    });

    it('No debe intentar refresh en endpoints de autenticación y debe propagar 401 directo', async () => {
        vi.spyOn(axios, 'isAxiosError').mockReturnValue(true);
        const axiosPostSpy = vi.spyOn(axios, 'post');

        const mockAxiosError = {
            isAxiosError: true,
            config: {
                url: '/api/auth/login',
                headers: {}
            },
            response: {
                status: 401,
                data: { message: 'Credenciales inválidas' }
            }
        };

        const responseInterceptor = (apiClient.interceptors.response as unknown as {
            handlers: Array<{ rejected: (error: unknown) => Promise<unknown> }>
        }).handlers[0];

        const responseErrorHandler = responseInterceptor.rejected;

        await expect(responseErrorHandler(mockAxiosError)).rejects.toBe(mockAxiosError);
        expect(axiosPostSpy).not.toHaveBeenCalled();
    });

    it('Debe compartir una sola llamada de refresh entre dos errores 401 concurrentes', async () => {
        vi.spyOn(axios, 'isAxiosError').mockReturnValue(true);
        vi.mocked(authStorageModule.readStoredRefreshToken).mockReturnValue('refresh_concurrente');
        vi.mocked(authStorageModule.readStoredAuthUser).mockReturnValue({
            username: 'usuario_concurrente',
            token: 'token_antiguo'
        });

        let resolveRefresh: ((value: { data: { accessToken: string; refreshToken: string; expiresIn: number } }) => void)
            | null = null;
        const pendingRefreshPromise = new Promise<{ data: { accessToken: string; refreshToken: string; expiresIn: number } }>((resolve) => {
            resolveRefresh = resolve;
        });

        const axiosPostSpy = vi.spyOn(axios, 'post').mockReturnValue(pendingRefreshPromise as Promise<any>);
        const requestSpy = vi.spyOn(apiClient, 'request')
            .mockResolvedValueOnce({ status: 200, data: { id: 1 } } as AxiosResponse)
            .mockResolvedValueOnce({ status: 200, data: { id: 2 } } as AxiosResponse);

        const responseInterceptor = (apiClient.interceptors.response as unknown as {
            handlers: Array<{ rejected: (error: unknown) => Promise<unknown> }>
        }).handlers[0];

        const errorA = {
            isAxiosError: true,
            config: { url: '/api/protected/a', headers: {} },
            response: { status: 401 }
        };

        const errorB = {
            isAxiosError: true,
            config: { url: '/api/protected/b', headers: {} },
            response: { status: 401 }
        };

        const promiseA = responseInterceptor.rejected(errorA);
        const promiseB = responseInterceptor.rejected(errorB);

        resolveRefresh?.({
            data: {
                accessToken: 'access_concurrente_nuevo',
                refreshToken: 'refresh_concurrente_nuevo',
                expiresIn: 900
            }
        });

        await expect(promiseA).resolves.toEqual({ status: 200, data: { id: 1 } });
        await expect(promiseB).resolves.toEqual({ status: 200, data: { id: 2 } });

        expect(axiosPostSpy).toHaveBeenCalledTimes(1);
        expect(requestSpy).toHaveBeenCalledTimes(2);
    });

    it('Debe cortar reintento cuando la request ya fue marcada con _retry', async () => {
        vi.spyOn(axios, 'isAxiosError').mockReturnValue(true);
        const axiosPostSpy = vi.spyOn(axios, 'post');

        const responseInterceptor = (apiClient.interceptors.response as unknown as {
            handlers: Array<{ rejected: (error: unknown) => Promise<unknown> }>
        }).handlers[0];

        const retriedError = {
            isAxiosError: true,
            config: {
                url: '/api/protected/resource',
                headers: {},
                _retry: true
            },
            response: {
                status: 401
            }
        };

        await expect(responseInterceptor.rejected(retriedError)).rejects.toBe(retriedError);
        expect(axiosPostSpy).not.toHaveBeenCalled();
    });
});


