import { createContext } from 'react';
import type { AuthUser } from './authTypes';

export interface AuthContextValue {
    user: AuthUser | null;
    isAuthenticated: boolean;
    login: (user: AuthUser) => void;
    logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
