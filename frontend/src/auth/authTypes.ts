export type UserRole = 'ADMIN' | 'PROFESSOR' | 'STUDENT' | string;

/**
 * Forma estándar del usuario autenticado dentro del frontend.
 *
 * La idea es que el frontend no dependa de una entidad exacta de backend,
 * sino de los campos que realmente necesita para renderizar y autorizar.
 */
export interface AuthUser {
    username: string;
    photo?: string;
    role?: UserRole;
    user_id?: number;
    email?: string;
    [key: string]: unknown;
}
