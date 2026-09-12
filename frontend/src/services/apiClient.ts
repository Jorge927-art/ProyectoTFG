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

// Mutex entre pestañas: el refresh token es de un solo uso en backend, así que dos
// pestañas no pueden llamar a /api/auth/refresh en paralelo con la misma cookie.
const CROSS_TAB_REFRESH_LOCK_KEY = 'auth_refresh_lock';
const REFRESH_LOCK_TTL_MS = 6000; // Margen sobre el timeout de red (5000ms) por si la pestaña que tiene el lock muere.
const REFRESH_LOCK_POLL_MS = 150;
const REFRESH_LOCK_MAX_WAIT_MS = 6000;

function hasBrowserStorage(): boolean {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function isRefreshLockFree(): boolean {
    const lockedAt = Number(window.localStorage.getItem(CROSS_TAB_REFRESH_LOCK_KEY));
    return !lockedAt || Number.isNaN(lockedAt) || (Date.now() - lockedAt) > REFRESH_LOCK_TTL_MS;
}

function acquireCrossTabRefreshLock(): boolean {
    if (!hasBrowserStorage()) {
        return true;
    }
    if (!isRefreshLockFree()) {
        return false;
    }
    window.localStorage.setItem(CROSS_TAB_REFRESH_LOCK_KEY, String(Date.now()));
    return true;
}

function releaseCrossTabRefreshLock() {
    if (hasBrowserStorage()) {
        window.localStorage.removeItem(CROSS_TAB_REFRESH_LOCK_KEY);
    }
}

// Espera a que la pestaña que ya está refrescando termine (o su lock caduque) antes de
// intentar nuestro propio refresh, evitando que dos pestañas roten el mismo token a la vez.
async function waitForCrossTabRefreshLock(): Promise<void> {
    const start = Date.now();
    while (!isRefreshLockFree() && (Date.now() - start) < REFRESH_LOCK_MAX_WAIT_MS) {
        await new Promise((resolve) => setTimeout(resolve, REFRESH_LOCK_POLL_MS));
    }
}

async function performRefreshAccessToken(): Promise<AccessTokenRefreshResult | null> {
    if (!acquireCrossTabRefreshLock()) {
        await waitForCrossTabRefreshLock();
        acquireCrossTabRefreshLock();
    }

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
    } finally {
        releaseCrossTabRefreshLock();
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

