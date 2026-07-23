import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import Hero from './Hero';

// --- AISLAMIENTO PERIMETRAL ESTRICTO: MOCK DE COMPONENTES CORE ---
interface MockGenericHeaderProps {
    title: string;
    subtitle: string;
    description: string;
    imageSrc: string;
    imageAlt: string;
    bgColor: string;
    titleColor: string;
    subtitleColor: string;
    descriptionColor: string;
    textPadding: string;
    titleSize: string;
    descriptionSize: string;
    imageMinHeight: string;
}

vi.mock('./ui/genericHeader/GenericHeader', () => ({
    default: (props: MockGenericHeaderProps) => (
        <div data-testid="mock-generic-header" {...props}>
            <h1>{props.title}</h1>
            <h2>{props.subtitle}</h2>
            <p>{props.description}</p>
        </div>
    ),
}));

describe('Hero - Suite de Pruebas Unitarias Completa', () => {
    it('debe mapear y transmitir fielmente el diccionario estático de contenidos a GenericHeader', () => {
        render(<Hero />);

        // 1. Localizar el componente bajo el perímetro aislado
        const headerMock = screen.getByTestId('mock-generic-header');
        expect(headerMock).toBeInTheDocument();

        // 2. Aserción matemática sobre el mapeo exacto de los textos corporativos
        expect(screen.getByRole('heading', { level: 1, name: 'COLE' })).toBeInTheDocument();
        expect(screen.getByRole('heading', { level: 2, name: 'Cursos OnLine Educativos' })).toBeInTheDocument();
        expect(screen.getByText(/Tu plataforma de aprendizaje personalizada/i)).toBeInTheDocument();

        // 3. Validación estricta de los atributos y tokens de estilo de marca inyectados
        expect(headerMock).toHaveAttribute('imageSrc', '/glasses-with-pile-books.png');
        expect(headerMock).toHaveAttribute('imageAlt', 'Banner principal de COLE');
        expect(headerMock).toHaveAttribute('bgColor', 'bg-blue-800');
        expect(headerMock).toHaveAttribute('titleColor', 'text-blue-300');
        expect(headerMock).toHaveAttribute('subtitleColor', 'text-white');
        expect(headerMock).toHaveAttribute('descriptionColor', 'text-white');
        expect(headerMock).toHaveAttribute('textPadding', 'p-8 md:p-16');
        expect(headerMock).toHaveAttribute('titleSize', 'text-4xl md:text-7xl lg:text-8xl');
        expect(headerMock).toHaveAttribute('descriptionSize', 'text-lg md:text-2xl');
        expect(headerMock).toHaveAttribute('imageMinHeight', 'min-h-[300px] md:min-h-[450px]');
    });
});
