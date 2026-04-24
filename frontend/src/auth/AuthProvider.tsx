import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { AuthUser } from './authTypes';
import { AuthContext } from './AuthContext';
import { clearStoredAuthUser, readStoredAuthUser, writeStoredAuthUser } from './authStorage';

interface AuthProviderProps {
    children: ReactNode;
}

/**
 * Provider global de autenticación.
 *
 * Este componente convierte la sesión en una única fuente de verdad para toda
 * la SPA. Cualquier parte de la interfaz puede leer el usuario actual sin
 * depender de props intermedias ni duplicar lógica en varios componentes.
 */
export const AuthProvider = ({ children }: AuthProviderProps) => {
    const [user, setUser] = useState<AuthUser | null>(() => readStoredAuthUser());

    const login = (nextUser: AuthUser) => {
        setUser(nextUser);
        writeStoredAuthUser(nextUser);
    };

    const logout = () => {
        setUser(null);
        clearStoredAuthUser();
    };

    const value = useMemo(
        () => ({
            user,
            isAuthenticated: Boolean(user),
            login,
            logout,
        }),
        [user]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
