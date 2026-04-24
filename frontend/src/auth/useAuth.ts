import { useContext } from 'react';
import { AuthContext } from './AuthContext';

/**
 * Hook de consumo del dominio de autenticación.
 *
 * Lanza un error explícito si se usa fuera de AuthProvider para evitar
 * estados ambiguos y facilitar debugging durante desarrollo.
 */
export const useAuth = () => {
    const context = useContext(AuthContext);

    if (!context) {
        throw new Error('useAuth debe usarse dentro de <AuthProvider>. Verifica que el árbol esté envuelto por AuthProvider en main.tsx.');
    }

    return context;
};
