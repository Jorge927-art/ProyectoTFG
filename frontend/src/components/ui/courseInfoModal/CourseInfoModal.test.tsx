import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import CourseInfoModal from './CourseInfoModal';

// =========================================================================
// MOCKS DE INFRAESTRUCTURA DE SUBCOMPONENTES REUTILIZABLES
// =========================================================================

// Mock de AuthModal para interceptar la propagación de flujos de registro
vi.mock('../authModal/AuthModal', () => ({
    default: ({ isOpen, isLoginView, onClose }: { isOpen: boolean; isLoginView: boolean; onClose: () => void }) => (
        isOpen ? (
            <div data-testid="mock-auth-modal">
                <span>Formulario de Autenticación Activo</span>
                <span>Vista: {isLoginView ? 'LOGIN' : 'REGISTRO'}</span>
                <button onClick={onClose}>Cerrar Auth</button>
            </div>
        ) : null
    )
}));

// Mock del botón atómico core para aislar la interactividad [ADR-13]
vi.mock('../genericButton/GenericButton', () => ({
    default: ({ label, onClick, icon, ariaLabel }: { label?: string; onClick?: () => void; icon?: React.ReactNode; ariaLabel?: string }) => (
        <button onClick={onClick} aria-label={ariaLabel}>{icon}{label}</button>
    )
}));

// =========================================================================
// BATERÍA DE PRUEBAS UNITARIAS MIXTAS (POSITIVAS Y NEGATIVAS)
// =========================================================================
describe('CourseInfoModal Component - Pruebas de Flujo de Descubrimiento [ADR-13]', () => {

    const mockOnClose = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    // ---------------------------------------------------------------------
    // CASOS POSITIVOS (Flujos de Éxito)
    // ---------------------------------------------------------------------
    test('CASO POSITIVO: Debe renderizar el catálogo de especialidades con sus 12 categorías si isOpen es true', () => {
        render(<CourseInfoModal isOpen={true} onClose={mockOnClose} />);

        // 1. Validar el encabezado principal del catálogo corporativo
        expect(screen.getByText('Catálogo de Especialidades')).toBeInTheDocument();
        expect(screen.getByText('Contamos con más de 10,000 cursos activos.')).toBeInTheDocument();

        // 2. Validar presencia selectiva de categorías fijas (Comprobación de límites de renderizado)
        expect(screen.getByText('Tecnología y Software')).toBeInTheDocument();
        expect(screen.getByText('Desarrollo web, IA, Cloud Computing y Ciberseguridad.')).toBeInTheDocument();

        expect(screen.getByText('Ciencias de Datos')).toBeInTheDocument();
        expect(screen.getByText('Artes y Humanidades')).toBeInTheDocument();
    });

    test('CASO POSITIVO: Debe propagar el callback onClose al accionar el botón de aspas superior', () => {
        render(<CourseInfoModal isOpen={true} onClose={mockOnClose} />);

        const closeButton = screen.getByLabelText('Cerrar modal');
        fireEvent.click(closeButton);

        // Validar la correcta delegación de eventos hacia el componente padre (Navbar)
        expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    test('CASO POSITIVO: Debe cerrar el catálogo y transicionar limpiamente hacia la vista de REGISTRO del AuthModal', () => {
        render(<CourseInfoModal isOpen={true} onClose={mockOnClose} />);

        // Hacer clic en el botón de conversión de embudo de marketing para registrarse
        const registerButton = screen.getByText('Registrarme y recibir recomendaciones');
        fireEvent.click(registerButton);

        // 1. Debe haber ordenado el cierre del catálogo informativo
        expect(mockOnClose).toHaveBeenCalled();

        // 2. Gracias al cortocircuito del componente, el AuthModal secundario debe montarse en la vista de REGISTRO
        expect(screen.getByTestId('mock-auth-modal')).toBeInTheDocument();
        expect(screen.getByText('Vista: REGISTRO')).toBeInTheDocument();
    });

    // ---------------------------------------------------------------------
    // CASOS NEGATIVOS (Escenarios Límite y Cortocircuitos)
    // ---------------------------------------------------------------------
    test('CASO NEGATIVO (LÍMITE): No debe inyectar nada en el DOM (retornar null) si ambos modales están cerrados', () => {
        const { container } = render(<CourseInfoModal isOpen={false} onClose={mockOnClose} />);

        // Validar de forma estricta que el contenedor de React Testing Library se encuentre 100% vacío
        expect(container.firstChild).toBeNull();
    });
});
