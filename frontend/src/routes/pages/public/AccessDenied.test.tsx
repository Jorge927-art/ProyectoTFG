import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AccessDenied from './AccessDenied';

// --- ACCESORES DE NAVEGACIÓN Y CONFIGURACIÓN DE SPYS ---
const mockNavigate = vi.fn();

// --- AISLAMIENTO PERIMETRAL ESTRICTO: MOCK DE ENRUTAMIENTO Y UI ---
vi.mock('react-router-dom', () => ({
    useNavigate: () => mockNavigate,
}));

vi.mock('@/components/ui/genericHeader/GenericHeader', () => ({
    default: ({ title, description, align }: { title: string; description: string; align: string }) => (
        <div data-testid="mock-generic-header" data-align={align}>
            <h1>{title}</h1>
            <p>{description}</p>
        </div>
    ),
}));

interface GenericButtonProps {
    label: string;
    variant: string;
    onClick: () => void;
}

vi.mock('@/components/ui/genericButton/GenericButton', () => ({
    default: ({ label, variant, onClick }: GenericButtonProps) => (
        <button data-testid="mock-generic-button" data-variant={variant} onClick={onClick}>
            {label}
        </button>
    ),
}));

describe('AccessDenied - Suite de Pruebas Unitarias Completa', () => {

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('debe estructurar correctamente la jerarquía visual inyectando las props semánticas en la cabecera', () => {
        const { container } = render(<AccessDenied />);

        // 1. Validar las clases del layout grid contenedor semántico principal
        const mainContainer = container.querySelector('main');
        expect(mainContainer).toHaveClass('min-h-screen', 'bg-slate-50', 'grid', 'place-items-center', 'px-6');

        // 2. Validar que la cabecera genérica recibe la parametrización correcta según ADR-13
        const header = screen.getByTestId('mock-generic-header');
        expect(header).toBeInTheDocument();
        expect(header).toHaveAttribute('data-align', 'center');
        expect(screen.getByRole('heading', { name: 'Acceso denegado' })).toBeInTheDocument();
        expect(screen.getByText(/Tu usuario está autenticado, pero no tiene los privilegios necesarios/i)).toBeInTheDocument();
    });

    it('debe inicializar el botón de acción corporativo con la variante primaria', () => {
        render(<AccessDenied />);

        // Validar el contrato de interfaz del botón genérico
        const button = screen.getByTestId('mock-generic-button');
        expect(button).toBeInTheDocument();
        expect(button).toHaveAttribute('data-variant', 'primary');
        expect(button.textContent).toBe('Volver al inicio');
    });

    it('debe redirigir de forma exacta a la raíz ("/") al efectuar una pulsación en el botón', () => {
        render(<AccessDenied />);

        const button = screen.getByTestId('mock-generic-button');

        // Simular evento de interacción del usuario
        fireEvent.click(button);

        // Aserción matemática del flujo del enrutador reactivo
        expect(mockNavigate).toHaveBeenCalledTimes(1);
        expect(mockNavigate).toHaveBeenCalledWith('/');
    });
});
