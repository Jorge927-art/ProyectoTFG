
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, test, expect } from 'vitest';
import GenericCard from './GenericCard';

describe('GenericCard Component - Pruebas Estructurales de Composición [ADR-13]', () => {

    // CASO POSITIVO: Comprobación de Composición Novedosa
    test('debe inyectar y renderizar fielmente el contenido secundario pasado mediante children', () => {
        render(
            <GenericCard>
                <h1 data-testid="test-title">Título del TFG</h1>
                <p>Contenido interno de la tarjeta del catálogo.</p>
            </GenericCard>
        );

        // 1. Validar presencia del contenido por jerarquía de etiquetas
        const headingElement = screen.getByTestId('test-title');
        expect(headingElement).toBeInTheDocument();
        expect(headingElement.textContent).toBe('Título del TFG');

        expect(screen.getByText('Contenido interno de la tarjeta del catálogo.')).toBeInTheDocument();
    });

    // CASO POSITIVO: Consistencia y Extensibilidad de Tailwind CSS
    test('debe mantener los estilos base de la tarjeta y concatenar limpiamente las clases personalizadas externas', () => {
        const clasePersonalizada = 'grid-cols-3 max-w-5xl mt-6';

        render(
            <GenericCard className={clasePersonalizada}>
                <span>Contenido de prueba corporativo</span>
            </GenericCard>
        );

        // Al usar la etiqueta <article> semántica en tu componente, la buscamos directamente
        const articleElement = screen.getByRole('article');

        // 1. Validar que mantenga los estilos estructurales core inmutables [ADR-47]
        expect(articleElement).toHaveClass('bg-white');
        expect(articleElement).toHaveClass('rounded-xl');
        expect(articleElement).toHaveClass('border-slate-200');
        expect(articleElement).toHaveClass('shadow-sm');

        // 2. Validar concatenación limpia de las clases inyectadas desde componentes como CourseCatalog
        expect(articleElement).toHaveClass('grid-cols-3');
        expect(articleElement).toHaveClass('max-w-5xl');
        expect(articleElement).toHaveClass('mt-6');
    });
});
