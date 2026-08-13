import axios from 'axios';
import {
    clearStoredAuth,
    readStoredToken,
    writeStoredToken
} from '../auth/authStorage';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

/**
 * Instancia centralizada de Axios personalizada para el proyecto.
 */
export const apiClient = axios.create({
    baseURL: API_URL,
    timeout: 5000,
    withCredentials: true,
});

type RefreshResponse = {
    accessToken?: string;
    refreshToken?: string;
    expiresIn?: number;
};

export type AccessTokenRefreshResult = RefreshResponse;

type RetriableRequestConfig = import('axios').InternalAxiosRequestConfig & {
    _retry?: boolean;
};

let refreshRequestInFlight: Promise<AccessTokenRefreshResult | null> | null = null;

const AUTH_PATHS_WITHOUT_RETRY = [
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/refresh',
    '/api/auth/logout'
];

function shouldBypassRefresh(url?: string): boolean {
    if (!url) {
        return false;
    }

    return AUTH_PATHS_WITHOUT_RETRY.some((path) => url.includes(path));
}

async function performRefreshAccessToken(): Promise<AccessTokenRefreshResult | null> {
    try {
        const response = await axios.post<RefreshResponse>(
            `${API_URL}/api/auth/refresh`,
            undefined,
            { timeout: 5000, withCredentials: true }
        );

        const newAccessToken = typeof response.data?.accessToken === 'string'
            ? response.data.accessToken.trim()
            : '';

        if (!newAccessToken) {
            return null;
        }

        writeStoredToken(newAccessToken);
        window.dispatchEvent(new CustomEvent('auth-session-refreshed', {
            detail: { expiresIn: response.data?.expiresIn ?? 0 }
        }));
        return response.data;
    } catch {
        return null;
    }
}

export function refreshAccessToken(): Promise<AccessTokenRefreshResult | null> {
    if (!refreshRequestInFlight) {
        refreshRequestInFlight = performRefreshAccessToken().finally(() => {
            refreshRequestInFlight = null;
        });
    }
    return refreshRequestInFlight;
}

/**
 * INTERCEPTOR DE PETICIONES (Request Interceptor)
 * Intercepta la solicitud HTTP saliente e inyecta el token automáticamente.
 */
apiClient.interceptors.request.use(
    (config) => {
        const token = readStoredToken();
        
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

/**
 * INTERCEPTOR DE RESPUESTAS (Response Interceptor)
 */
apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        if (!axios.isAxiosError(error) || error.response?.status !== 401 || !error.config) {
            return Promise.reject(error);
        }

        const originalRequest = error.config as RetriableRequestConfig;
        if (originalRequest._retry || shouldBypassRefresh(originalRequest.url)) {
            return Promise.reject(error);
        }

        originalRequest._retry = true;

        const renewedAccessToken = (await refreshAccessToken())?.accessToken ?? null;
        if (!renewedAccessToken) {
            clearStoredAuth();
            window.dispatchEvent(new Event('auth-session-expired'));
            return Promise.reject(error);
        }

        originalRequest.headers = originalRequest.headers ?? {};
        originalRequest.headers.Authorization = `Bearer ${renewedAccessToken}`;

        return apiClient.request(originalRequest);
    }
);

