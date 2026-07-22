import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AdminDashboard from './AdminDashboard';
import { apiClient } from '@/services/apiClient';
import axios from 'axios';
import type { UserEntity } from '../../../services/userDomains';

// =========================================================================
// 1. AISLAMIENTO CENTRALIZADO DE LA CAPA DE RED (AXIOS INTERCEPTADO)
// =========================================================================
vi.mock('@/services/apiClient', () => ({
    apiClient: {
        get: vi.fn(),
        patch: vi.fn(),
        delete: vi.fn()
    }
}));

// =========================================================================
// 2. MOCKS DE COMPONENTES DE INTERFAZ ELIMINANDO EL TIPO PROHIBIDO 'ANY'
// =========================================================================
vi.mock('../../layouts/DashboardLayout', () => ({
    default: ({ children }: { children: React.ReactNode }) => <div data-testid="mock-admin-layout">{children}</div>
}));

vi.mock('../../../components/ui/genericHeader/GenericHeader', () => ({
    default: ({ title, description }: { title: string; description: React.ReactNode }) => (
        <div data-testid="mock-generic-header">
            <h2>{title}</h2>
            <div>{description}</div>
        </div>
    )
}));

vi.mock('../../../components/ui/Input', () => ({
    default: ({ value, onChange, placeholder }: { value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; placeholder?: string }) => (
        <input
            data-testid="mock-text-input"
            value={value}
            onChange={onChange}
            placeholder={placeholder}
        />
    )
}));

vi.mock('../../../components/ui/genericButton/GenericButton', () => ({
    default: ({ label = '', ariaLabel = '', onClick, disabled }: { label?: string; ariaLabel?: string; onClick?: () => void; disabled?: boolean }) => {
        const finalIdentifier = label || ariaLabel || 'button';
        return (
            <button
                data-testid={`btn-${finalIdentifier.replace(/\s+/g, '-').toLowerCase()}`}
                onClick={onClick}
                disabled={disabled}
            >
                {label || ariaLabel}
            </button>
        );
    }
}));

vi.mock('../../../components/admin/UserScrollList', () => ({
    UserScrollList: () => <div data-testid="mock-user-scroll-list" />
}));

describe('AdminDashboard - Suite de Pruebas Unitarias de Alta Fidelidad de Consola', () => {
    const mockAdminSession = { username: 'root_admin', role: 'ADMIN' };

    // [CORRECCIÓN CRÍTICA ts(2353)]: Eliminamos el atributo email para adaptarlo estrictamente al DTO real
    const sampleUserEntity: UserEntity = {
        userId: 101,
        username: 'laura_student',
        role: 'STUDENT',
        enabled: true
    };

    beforeEach(() => {
        vi.clearAllMocks();

        // [CORRECCIÓN CRÍTICA prefer-const]: Cambiamos let por const para cumplir con ESLint
        const store: Record<string, string> = { 'auth_user': JSON.stringify(mockAdminSession) };
        vi.stubGlobal('localStorage', {
            getItem: vi.fn((key: string): string | null => store[key] || null),
            setItem: vi.fn((key: string, value: string): void => { store[key] = value; }),
            removeItem: vi.fn((key: string): void => { delete store[key]; })
        });

        vi.stubGlobal('confirm', vi.fn(() => true));
        vi.stubGlobal('alert', vi.fn());
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('Debe renderizar la cabecera institucional y el formulario base del buscador', () => {
        render(<AdminDashboard />);

        expect(screen.getByTestId('mock-admin-layout')).toBeInTheDocument();
        expect(screen.getByTestId('mock-generic-header')).toBeInTheDocument();
        expect(screen.getByText('Panel de Administración')).toBeInTheDocument();
        expect(screen.getByText('Buscador de Usuarios')).toBeInTheDocument();
        expect(screen.getByTestId('mock-user-scroll-list')).toBeInTheDocument();
    });

    /* =========================================================================
       1. CONTROL DE BÚSQUEDA Y EXCEPCIONES EN POSTGRESQL (ENDPOINT CONSULTA)
       ========================================================================= */
    it('Debe consultar el endpoint de Spring Boot y desplegar los datos y rol del usuario encontrado', async () => {
        vi.mocked(apiClient.get).mockResolvedValue({
            status: 200,
            data: sampleUserEntity
        });

        render(<AdminDashboard />);

        const input = screen.getByTestId('mock-text-input');
        fireEvent.change(input, { target: { value: 'laura_student' } });

        const botonBuscar = screen.getByTestId('btn-buscar-en-base-de-datos');
        fireEvent.click(botonBuscar);

        expect(apiClient.get).toHaveBeenCalledWith('/api/auth/laura_student');

        await waitFor(() => {
            expect(screen.getByText('laura_student')).toBeInTheDocument();
            expect(screen.getByText('STUDENT')).toBeInTheDocument();
            expect(screen.getByLabelText(/Asignar nuevo rol/i)).toBeInTheDocument();
        });
    });

    it('Debe capturar un error 500 de Axios e inyectar el banner estructurado de contingencia', async () => {
        // [CORRECCIÓN CRÍTICA DE FLUJO]: Forzamos a que axios reconozca el error simulado como un AxiosError real
        vi.spyOn(axios, 'isAxiosError').mockReturnValue(true);

        const error500 = {
            isAxiosError: true,
            response: { status: 500 }
        };
        vi.mocked(apiClient.get).mockRejectedValue(error500);

        render(<AdminDashboard />);

        const input = screen.getByTestId('mock-text-input');
        fireEvent.change(input, { target: { value: 'error_user' } });
        fireEvent.click(screen.getByTestId('btn-buscar-en-base-de-datos'));

        // Ahora el componente tomará la rama del error 500 y renderizará el texto esperado
        await waitFor(() => {
            const bannerError = screen.getByText(/Error 500 del servidor al procesar la búsqueda en la entidad/i);
            expect(bannerError).toBeInTheDocument();
        });
    });

    /* =========================================================================
       2. CONTROL DE ACTUALIZACIÓN CONEXIÓN CON EL ENDPOINT PATCH
       ========================================================================= */
    it('Debe invocar el método PATCH administrativo y actualizar el rol local de la tarjeta tras el cambio en el selector', async () => {
        vi.mocked(apiClient.get).mockResolvedValue({ status: 200, data: sampleUserEntity });
        vi.mocked(apiClient.patch).mockResolvedValue({ status: 200 });

        render(<AdminDashboard />);

        fireEvent.change(screen.getByTestId('mock-text-input'), { target: { value: 'laura_student' } });
        fireEvent.click(screen.getByTestId('btn-buscar-en-base-de-datos'));

        await waitFor(() => expect(screen.getByRole('combobox')).toBeInTheDocument());

        const selector = screen.getByRole('combobox');
        fireEvent.change(selector, { target: { value: 'PROFESSOR' } });

        expect(apiClient.patch).toHaveBeenCalledWith('/api/auth/users/laura_student/role', {
            role: 'PROFESSOR'
        });

        await waitFor(() => {
            expect(screen.getByText('PROFESSOR')).toBeInTheDocument();
        });
    });

    /* =========================================================================
       3. AUDITORÍA DE SEGURIDAD OPERATIVA: PREVENCIÓN DE AUTOBORRADO Y BAJAS
       ========================================================================= */
    it('Debe bloquear el autoborrado inyectando un mensaje de alerta estático si el usuario encontrado es el propio Administrador en sesión', async () => {
        // [CORRECCIÓN CRÍTICA ts(2353)]: Eliminamos el atributo email aquí también para cumplir con UserEntity
        const adminUserEntity: UserEntity = {
            userId: 999,
            username: 'root_admin',
            role: 'ADMIN',
            enabled: true
        };
        vi.mocked(apiClient.get).mockResolvedValue({ status: 200, data: adminUserEntity });

        render(<AdminDashboard />);

        fireEvent.change(screen.getByTestId('mock-text-input'), { target: { value: 'root_admin' } });
        fireEvent.click(screen.getByTestId('btn-buscar-en-base-de-datos'));

        await waitFor(() => {
            expect(screen.getByText('Esta es tu cuenta actual. No puedes eliminarte a ti mismo.')).toBeInTheDocument();
            expect(screen.queryByTestId('btn-dar-de-baja-temporal-usuario')).not.toBeInTheDocument();
        });
    });

    it('Debe ejecutar la petición DELETE de baja temporal si el usuario confirma la acción en el cuadro de diálogo', async () => {
        vi.mocked(apiClient.get).mockResolvedValue({ status: 200, data: sampleUserEntity });
        vi.mocked(apiClient.delete).mockResolvedValue({
            status: 200,
            data: { message: 'Usuario suspendido temporalmente', enabled: false }
        });

        render(<AdminDashboard />);

        fireEvent.change(screen.getByTestId('mock-text-input'), { target: { value: 'laura_student' } });
        fireEvent.click(screen.getByTestId('btn-buscar-en-base-de-datos'));

        await waitFor(() => expect(screen.getByTestId('btn-dar-de-baja-temporal-usuario')).toBeInTheDocument());

        const botonBaja = screen.getByTestId('btn-dar-de-baja-temporal-usuario');
        fireEvent.click(botonBaja);

        expect(window.confirm).toHaveBeenCalled();
        expect(apiClient.delete).toHaveBeenCalledWith('/api/auth/users/laura_student');

        await waitFor(() => {
            expect(window.alert).toHaveBeenCalledWith('Usuario suspendido temporalmente');
            expect(screen.getByTestId('btn-reactivar-y-dar-de-alta-usuario')).toBeInTheDocument();
        });
    });

    it('Debe conmutar la interfaz al botón de reactivación y alta si el usuario consultado se encuentra inicialmente inactivo (enabled === false)', async () => {
        const inactiveUserEntity: UserEntity = {
            ...sampleUserEntity,
            enabled: false
        };
        vi.mocked(apiClient.get).mockResolvedValue({ status: 200, data: inactiveUserEntity });

        render(<AdminDashboard />);

        fireEvent.change(screen.getByTestId('mock-text-input'), { target: { value: 'laura_student' } });
        fireEvent.click(screen.getByTestId('btn-buscar-en-base-de-datos'));

        await waitFor(() => {
            expect(screen.getByTestId('btn-reactivar-y-dar-de-alta-usuario')).toBeInTheDocument();
            expect(screen.queryByTestId('btn-dar-de-baja-temporal-usuario')).not.toBeInTheDocument();
        });
    });
});


