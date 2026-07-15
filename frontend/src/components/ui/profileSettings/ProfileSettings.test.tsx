import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import ProfileSettings from './ProfileSettings';
import { getProfile, updateProfileData } from '../../../services/profileService';

// =========================================================================
// MOCKS DE CONTENEDORES Y HOOKS DE CONTEXTO GLOBAL
// =========================================================================

const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
    useNavigate: () => mockNavigate
}));

const mockUpdateUser = vi.fn();
vi.mock('@/auth', () => ({
    useAuth: () => ({
        user: { photo: 'url-foto-sesion-actual' },
        updateUser: mockUpdateUser
    })
}));

vi.mock('@/auth/avatarUrl', () => ({
    resolveAvatarUrl: (path: string | undefined) => path ? `http://localhost:8080/uploads/${path}` : null
}));

vi.mock('../../../services/profileService', () => ({
    getProfile: vi.fn(),
    updateProfileData: vi.fn(),
    uploadAvatarFile: vi.fn()
}));

vi.mock('../genericCard/GenericCard', () => ({
    default: ({ children, className }: { children: React.ReactNode; className?: string }) => (
        <div data-testid="generic-card" className={className}>{children}</div>
    )
}));

// CORRECCIÓN INTERFAZ BOTÓN: Restringimos el tipo de 'type' a las firmas nativas de HTML
interface MockButtonProps {
    label: string;
    onClick?: () => void;
    disabled?: boolean;
    type?: "button" | "submit" | "reset";
}

vi.mock('../genericButton/GenericButton', () => ({
    default: ({ label, onClick, disabled, type = "button" }: MockButtonProps) => (
        <button type={type} onClick={onClick} disabled={disabled}>{label}</button>
    )
}));

// CORRECCIÓN INPUT: Eliminamos 'any', 'label' y 'error' sin usar para satisfacer a ESLint
interface MockInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
}

vi.mock('../Input', () => ({
    default: ({ className, ...props }: MockInputProps) => (
        <input data-testid="custom-input" {...props} className={className} />
    )
}));

// =========================================================================
// BATERÍA DE PRUEBAS UNITARIAS
// =========================================================================
describe('ProfileSettings Component - Pruebas de Carga e Interacción [ADR-13]', () => {

    const mockProfileData = {
        username: 'LuisEstudiante',
        email: 'luis@cursosonline.com',
        phoneNumber: '+34 600 111 222',
        homeAddress: 'Calle del TFG 123, Pinto',
        role: 'STUDENT',
        avatarPath: 'avatars/luis.png'
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    test('CASO POSITIVO: Debe hidratar el formulario con los datos iniciales tras resolverse la promesa asíncrona', async () => {
        vi.mocked(getProfile).mockResolvedValueOnce(mockProfileData);

        render(<ProfileSettings />);

        expect(screen.getByText('Cargando configuración de perfil...')).toBeInTheDocument();

        await waitFor(() => {
            expect(screen.queryByText('Cargando configuración de perfil...')).not.toBeInTheDocument();
        });

        expect(screen.getByText('LuisEstudiante')).toBeInTheDocument();
        expect(screen.getByText('STUDENT')).toBeInTheDocument();

        const emailInput = screen.getByPlaceholderText('tu-correo@ejemplo.com') as HTMLInputElement;
        const phoneInput = screen.getByPlaceholderText('Ej: +34 600 000 000') as HTMLInputElement;

        expect(emailInput.value).toBe('luis@cursosonline.com');
        expect(phoneInput.value).toBe('+34 600 111 222');
    });

    test('CASO POSITIVO: Debe registrar las mutaciones en caliente del formulario y retener los cambios al Guardar', async () => {
        vi.mocked(getProfile).mockResolvedValueOnce(mockProfileData);
        // CORRECCIÓN: Adecuamos el mock al objeto de respuesta de tu servicio
        vi.mocked(updateProfileData).mockResolvedValueOnce({ message: 'Datos de perfil actualizados correctamente' });

        render(<ProfileSettings />);

        await waitFor(() => {
            expect(screen.queryByText('Cargando configuración de perfil...')).not.toBeInTheDocument();
        });

        const phoneInput = screen.getByPlaceholderText('Ej: +34 600 000 000');

        fireEvent.change(phoneInput, { target: { value: '+34 699 999 999' } });
        expect(phoneInput).toHaveValue('+34 699 999 999');

        const submitButton = screen.getByText('Guardar Cambios');
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(updateProfileData).toHaveBeenCalledWith(expect.objectContaining({
                phoneNumber: '+34 699 999 999',
                email: 'luis@cursosonline.com'
            }));
            expect(screen.getByText('Datos de perfil actualizados correctamente')).toBeInTheDocument();
        });
    });

    test('CASO POSITIVO: Debe redirigir de forma condicional al panel de Estudiantes (Luis) al accionar Volver', async () => {
        vi.mocked(getProfile).mockResolvedValueOnce(mockProfileData);

        render(<ProfileSettings />);
        await waitFor(() => {
            expect(screen.queryByText('Cargando configuración de perfil...')).not.toBeInTheDocument();
        });

        const backButton = screen.getByText('Volver al Panel');
        fireEvent.click(backButton);

        expect(mockNavigate).toHaveBeenCalledWith('/student');
    });

    test('CASO NEGATIVO: Debe propagar una alerta visual roja si la API falla al sincronizar el perfil', async () => {
        vi.mocked(getProfile).mockRejectedValueOnce(new Error('JWT Token Expired'));

        render(<ProfileSettings />);

        await waitFor(() => {
            expect(screen.queryByText('Cargando configuración de perfil...')).not.toBeInTheDocument();
        });

        expect(screen.getByText('No se pudieron cargar los datos del perfil')).toBeInTheDocument();
    });
});
