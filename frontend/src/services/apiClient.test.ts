import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import type { InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import { apiClient } from './apiClient';
import * as authStorageModule from '../auth/authStorage';

// Aislar el helper de almacenamiento antes de instanciar el cliente centralizado
vi.mock('../auth/authStorage', () => ({
    readStoredToken: vi.fn()
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
        vi.spyOn(axios, 'isAxiosError').mockReturnValue(true);

        const mockAxiosError = {
            isAxiosError: true,
            response: {
                status: 401,
                data: { message: 'Token JWT Caducado' }
            }
        };

        const responseInterceptor = (apiClient.interceptors.response as unknown as {
            handlers: Array<{ rejected: (error: unknown) => Promise<unknown> }>
        }).handlers[0];
        
        const responseErrorHandler = responseInterceptor.rejected;

        await expect(responseErrorHandler(mockAxiosError)).rejects.toBe(mockAxiosError);

        expect(dispatchEventSpy).toHaveBeenCalledWith(
            expect.objectContaining({ type: 'auth-session-expired' })
        );
    });

    it('Debe rechazar la promesa sin emitir eventos globales si el error HTTP es distinto a un estatus 401', async () => {
        const dispatchEventSpy = vi.spyOn(window, 'dispatchEvent');
        vi.spyOn(axios, 'isAxiosError').mockReturnValue(true);

        const mockAxiosError = {
            isAxiosError: true,
            response: {
                status: 500,
                data: { message: 'Internal Server Error' }
            }
        };

        const responseInterceptor = (apiClient.interceptors.response as unknown as {
            handlers: Array<{ rejected: (error: unknown) => Promise<unknown> }>
        }).handlers[0];
        
        const responseErrorHandler = responseInterceptor.rejected;

        await expect(responseErrorHandler(mockAxiosError)).rejects.toBe(mockAxiosError);

        expect(dispatchEventSpy).not.toHaveBeenCalled();
    });
});


