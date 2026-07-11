// Auditoría NotebookLM: Definición estricta de tipos de rol. Se elimina el comodín '| string' para evitar fallos.
export type UserRole = 'ADMIN' | 'PROFESSOR' | 'STUDENT';

// Objeto de constantes fijo para mapear los roles en el código y evitar errores tipográficos
export const ROLES = {
    ADMIN: 'ADMIN' as UserRole,
    PROFESSOR: 'PROFESSOR' as UserRole,
    STUDENT: 'STUDENT' as UserRole,
} as const;

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
    enrolledCourseIds?: number[]; // Fuente de verdad reactiva en memoria del cliente
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
    enrolledCourseIds: number[]; // Coincidencia exacta con la hidratación de Spring Boot
    avatarPath?: string | null;
}

/**
 * Interfaz que define el estado y los métodos globales que expondrá nuestro contexto de autenticación.
 */
export interface AuthContextType {
    user: AuthUser | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (tokenData: AuthTokenResponse) => void;
    updateUser: (updates: Partial<AuthUser>) => void;
    logout: () => void;
}
