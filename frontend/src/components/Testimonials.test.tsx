import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import Testimonials from './Testimonials';

// --- AISLAMIENTO PERIMETRAL ESTRICTO: MOCK DE COMPONENTES CORE ---
interface MockGenericHeaderProps {
    title: string;
    subtitle: string;
    description: string;
    imageSrc: string;
    imageAlt: string;
    align: 'left' | 'center' | 'right';
    bgColor: string;
    titleColor: string;
    subtitleColor: string;
    descriptionColor: string;
    titleSize: string;
    descriptionSize: string;
    textPadding: string;
    imageMinHeight: string;
    containerClass: string;
}

vi.mock('./ui/genericHeader/GenericHeader', () => ({
    default: (props: MockGenericHeaderProps) => (
        <div
            data-testid="mock-generic-header"
            data-title={props.title}
            data-align={props.align}
            data-container={props.containerClass}
        >
            <h3>{props.title}</h3>
            <h4>{props.subtitle}</h4>
            <p>{props.description}</p>
        </div>
    ),
}));

describe('Testimonials - Suite de Pruebas Unitarias Completa', () => {
    it('debe renderizar el título de la sección y configurar la estructura contenedora flex', () => {
        const { container } = render(<Testimonials />);

        // 1. Validar el contenedor principal semántico
        const sectionElement = container.querySelector('section');
        expect(sectionElement).toBeInTheDocument();
        expect(sectionElement).toHaveClass('py-20', 'flex', 'flex-col', 'gap-16', 'px-4');

        // 2. Validar el h2 de la cabecera informativa de testimonios
        const sectionTitle = screen.getByRole('heading', { level: 2, name: 'Lo que dicen nuestros usuarios' });
        expect(sectionTitle).toBeInTheDocument();
        expect(sectionTitle).toHaveClass('text-3xl', 'md:text-5xl', 'font-bold', 'text-center', 'text-gray-800');
    });

    it('debe mapear el total de testimonios alternando la alineación visual (Ziz-Zag Layout)', () => {
        render(<Testimonials />);

        const headers = screen.getAllByTestId('mock-generic-header');
        expect(headers).toHaveLength(3);

        // --- TESTIMONIO 1: ÍNDICE PAR (0) -> ALINEACIÓN IZQUIERDA ---
        expect(headers[0]).toHaveAttribute('data-title', 'María López');
        expect(headers[0]).toHaveAttribute('data-align', 'left');
        expect(screen.getByRole('heading', { level: 3, name: 'María López' })).toBeInTheDocument();
        expect(screen.getByRole('heading', { level: 4, name: 'Estudiante de Diseño Gráfico' })).toBeInTheDocument();
        expect(screen.getByText(/La plataforma me recomendó un curso de diseño UX/i)).toBeInTheDocument();

        // --- TESTIMONIO 2: ÍNDICE IMPAR (1) -> ALINEACIÓN DERECHA ---
        expect(headers[1]).toHaveAttribute('data-title', 'Carlos Gómez');
        expect(headers[1]).toHaveAttribute('data-align', 'right');
        expect(screen.getByRole('heading', { level: 3, name: 'Carlos Gómez' })).toBeInTheDocument();
        expect(screen.getByRole('heading', { level: 4, name: 'Ingeniero de Software' })).toBeInTheDocument();
        expect(screen.getByText(/mejorar mis habilidades técnicas y a mantenerme actualizado/i)).toBeInTheDocument();

        // --- TESTIMONIO 3: ÍNDICE PAR (2) -> ALINEACIÓN IZQUIERDA ---
        expect(headers[2]).toHaveAttribute('data-title', 'Ana Martínez');
        expect(headers[2]).toHaveAttribute('data-align', 'left');
        expect(screen.getByRole('heading', { level: 3, name: 'Ana Martínez' })).toBeInTheDocument();
        expect(screen.getByRole('heading', { level: 4, name: 'Profesora de Educación Primaria' })).toBeInTheDocument();
        expect(screen.getByText(/encontrar cursos que me permiten mejorar mis métodos/i)).toBeInTheDocument();
    });

    it('debe propagar de forma idéntica las clases y configuraciones de diseño base a todas las instancias', () => {
        render(<Testimonials />);

        const headers = screen.getAllByTestId('mock-generic-header');

        headers.forEach((header) => {
            expect(header).toHaveAttribute('data-container', 'border-b border-gray-200 rounded-xl shadow-sm overflow-hidden');
        });
    });
});
