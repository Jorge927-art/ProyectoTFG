// frontend/src/routes/pages/admin/components/UserSearchPanel.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { UserSearchPanel } from './UserSearchPanel';
import { useUserSearch } from './useUserSearch';
import type { UserEntity } from '../../../../services/userDomains';

vi.mock('./useUserSearch', () => ({
    useUserSearch: vi.fn()
}));

vi.mock('../../../../components/ui/genericButton/GenericButton', () => ({
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

vi.mock('../../../../components/ui/Input', () => ({
    default: ({ value, onChange, placeholder }: { value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; placeholder?: string }) => (
        <input
            data-testid="mock-text-input"
            value={value}
            onChange={onChange}
            placeholder={placeholder}
        />
    )
}));

describe('UserSearchPanel', () => {
    const mockSetSearchName = vi.fn();
    const mockHandleSearchUser = vi.fn(async (e: React.FormEvent) => {
        e.preventDefault();
    });
    const mockHandleRoleChange = vi.fn(async () => {
        return;
    });
    const mockHandleDeleteUser = vi.fn(async () => {
        return;
    });
    const mockHandleDeletePermanently = vi.fn(async () => {
        return;
    });

    const sampleUserEntity: UserEntity = {
        userId: 101,
        username: 'laura_student',
        role: 'STUDENT',
        enabled: true
    };

    const baseHookReturn: ReturnType<typeof useUserSearch> = {
        searchName: '',
        setSearchName: mockSetSearchName,
        foundUser: null,
        loading: false,
        updatingId: null,
        deleting: false,
        deletingPermanently: false,
        error: '',
        handleSearchUser: mockHandleSearchUser,
        handleRoleChange: mockHandleRoleChange,
        handleDeleteUser: mockHandleDeleteUser,
        handleDeletePermanently: mockHandleDeletePermanently
    };

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(useUserSearch).mockReturnValue(baseHookReturn as ReturnType<typeof useUserSearch>);
    });

    it('renderiza el encabezado y el formulario base', () => {
        render(<UserSearchPanel currentAdminUsername="root_admin" />);

        expect(screen.getByText('Buscador de Usuarios')).toBeInTheDocument();
        expect(screen.getByText('Consulta directa a PostgreSQL')).toBeInTheDocument();
        expect(screen.getByTestId('mock-text-input')).toBeInTheDocument();
    });

    it('propaga el cambio de texto y el envío del formulario al hook', () => {
        render(<UserSearchPanel currentAdminUsername="root_admin" />);

        const input = screen.getByTestId('mock-text-input');
        fireEvent.change(input, { target: { value: 'laura_student' } });
        expect(mockSetSearchName).toHaveBeenCalledWith('laura_student');

        fireEvent.click(screen.getByTestId('btn-buscar-en-base-de-datos'));
        expect(mockHandleSearchUser).toHaveBeenCalled();
    });

    it('muestra el banner de error cuando el hook reporta un error', () => {
        vi.mocked(useUserSearch).mockReturnValue({
            ...baseHookReturn,
            error: 'Usuario no encontrado en las tablas de la base de datos.'
        } as ReturnType<typeof useUserSearch>);

        render(<UserSearchPanel currentAdminUsername="root_admin" />);

        expect(screen.getByText(/Usuario no encontrado en las tablas de la base de datos/)).toBeInTheDocument();
    });

    it('muestra los datos del usuario encontrado y el selector de rol', () => {
        vi.mocked(useUserSearch).mockReturnValue({
            ...baseHookReturn,
            foundUser: sampleUserEntity
        } as ReturnType<typeof useUserSearch>);

        render(<UserSearchPanel currentAdminUsername="root_admin" />);

        expect(screen.getByText('laura_student')).toBeInTheDocument();
        expect(screen.getByText('STUDENT')).toBeInTheDocument();

        const selector = screen.getByRole('combobox');
        fireEvent.change(selector, { target: { value: 'PROFESSOR' } });
        expect(mockHandleRoleChange).toHaveBeenCalledWith(101, 'PROFESSOR');
    });

    it('bloquea el autoborrado mostrando el mensaje estático si el usuario encontrado es el administrador en sesión', () => {
        const adminUserEntity: UserEntity = {
            userId: 999,
            username: 'root_admin',
            role: 'ADMIN',
            enabled: true
        };

        vi.mocked(useUserSearch).mockReturnValue({
            ...baseHookReturn,
            foundUser: adminUserEntity
        } as ReturnType<typeof useUserSearch>);

        render(<UserSearchPanel currentAdminUsername="root_admin" />);

        expect(screen.getByText('Esta es tu cuenta actual. No puedes eliminarte a ti mismo.')).toBeInTheDocument();
        expect(screen.queryByTestId('btn-dar-de-baja-temporal-usuario')).not.toBeInTheDocument();
    });

    it('muestra el botón de baja temporal cuando el usuario encontrado está activo', () => {
        vi.mocked(useUserSearch).mockReturnValue({
            ...baseHookReturn,
            foundUser: sampleUserEntity
        } as ReturnType<typeof useUserSearch>);

        render(<UserSearchPanel currentAdminUsername="root_admin" />);

        const botonBaja = screen.getByTestId('btn-dar-de-baja-temporal-usuario');
        fireEvent.click(botonBaja);
        expect(mockHandleDeleteUser).toHaveBeenCalled();
    });

    it('muestra el botón de reactivación cuando el usuario encontrado está inactivo', () => {
        vi.mocked(useUserSearch).mockReturnValue({
            ...baseHookReturn,
            foundUser: { ...sampleUserEntity, enabled: false }
        } as ReturnType<typeof useUserSearch>);

        render(<UserSearchPanel currentAdminUsername="root_admin" />);

        expect(screen.getByTestId('btn-reactivar-y-dar-de-alta-usuario')).toBeInTheDocument();
        expect(screen.queryByTestId('btn-dar-de-baja-temporal-usuario')).not.toBeInTheDocument();
    });

    it('muestra el botón de baja permanente junto al de baja temporal cuando hay usuario encontrado', () => {
        vi.mocked(useUserSearch).mockReturnValue({
            ...baseHookReturn,
            foundUser: sampleUserEntity
        } as ReturnType<typeof useUserSearch>);

        render(<UserSearchPanel currentAdminUsername="root_admin" />);

        const botonPermanente = screen.getByTestId('btn-dar-de-baja-permanente-usuario');
        expect(botonPermanente).toBeInTheDocument();

        fireEvent.click(botonPermanente);
        expect(mockHandleDeletePermanently).toHaveBeenCalled();
    });

    it('oculta el botón de baja permanente cuando el usuario encontrado es el propio admin', () => {
        const adminUserEntity: UserEntity = {
            userId: 999,
            username: 'root_admin',
            role: 'ADMIN',
            enabled: true
        };

        vi.mocked(useUserSearch).mockReturnValue({
            ...baseHookReturn,
            foundUser: adminUserEntity
        } as ReturnType<typeof useUserSearch>);

        render(<UserSearchPanel currentAdminUsername="root_admin" />);

        expect(screen.queryByTestId('btn-dar-de-baja-permanente-usuario')).not.toBeInTheDocument();
    });

    it('deshabilita el botón de baja permanente mientras deletingPermanently está en curso', () => {
        vi.mocked(useUserSearch).mockReturnValue({
            ...baseHookReturn,
            foundUser: sampleUserEntity,
            deletingPermanently: true
        } as ReturnType<typeof useUserSearch>);

        render(<UserSearchPanel currentAdminUsername="root_admin" />);

        expect(screen.getByTestId('btn-eliminando...')).toBeDisabled();
    });
});
