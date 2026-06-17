export type UserRole = 'ADMIN' | 'PROFESSOR' | 'STUDENT' | string;

/**
 * Forma estándar del usuario autenticado dentro del frontend.
 * Mantiene compatibilidad y permite extender metadatos visuales.
 */
export interface AuthUser {
    username: string;
    photo?: string;
    role?: UserRole;
    userId?: number;
    email?: string;
    [key: string]: unknown;
}

/**
 * Contrato que modela la respuesta del backend tras un login exitoso con JWT.
 * Coincide exactamente con el registro AuthTokenResponse.java del servidor.
 */
export interface AuthTokenResponse {
    accessToken: string;
    tokenType: string;
    expiresIn: number;
    userId: number;
    username: string;
    role: UserRole;
    email: string;
}

/**
 * Interfaz que define el estado y los métodos globales que expondrá nuestro contexto de autenticación.
 */
export interface AuthContextType {
    user: AuthUser | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (tokenData: AuthTokenResponse) => void;
    logout: () => void;
}
