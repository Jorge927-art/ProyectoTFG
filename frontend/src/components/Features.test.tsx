import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import Features from './Features';

// --- AISLAMIENTO PERIMETRAL ESTRICTO: MOCK DE COMPONENTES DE INFRAESTRUCTURA ---
interface MockGenericHeaderProps {
    title: string;
    description: string;
    icon: ReactNode;
    bgColor: string;
    titleColor: string;
    descriptionColor: string;
    titleSize: string;
    descriptionSize: string;
    textPadding: string;
}

vi.mock('./ui/genericHeader/GenericHeader', () => ({
    default: (props: MockGenericHeaderProps) => (
        <div data-testid="mock-generic-header" data-title={props.title} className={props.bgColor}>
            <div data-testid="icon-container">{props.icon}</div>
            <h3>{props.title}</h3>
            <p>{props.description}</p>
        </div>
    ),
}));

// Mockear lucide-react de forma limpia y defensiva
vi.mock('lucide-react', () => ({
    Lightbulb: () => <svg data-testid="icon-lightbulb" />,
    BarChart3: () => <svg data-testid="icon-barchart" />,
    BookOpen: () => <svg data-testid="icon-bookopen" />,
    BellRing: () => <svg data-testid="icon-bellring" />,
}));

describe('Features - Suite de Pruebas Unitarias Completa', () => {
    it('debe inicializar el contenedor grid semántico con sus clases responsive y de espaciado', () => {
        const { container } = render(<Features />);

        const gridSection = container.querySelector('section');
        expect(gridSection).toBeInTheDocument();
        expect(gridSection).toHaveClass('grid', 'grid-cols-1', 'md:grid-cols-4', 'border-b', 'border-gray-200', 'py-20', 'px-4', 'gap-8');
    });

    it('debe mapear el total de elementos de featuresData renderizando las instancias correlativas', () => {
        render(<Features />);

        // Verificar que se instancian exactamente 4 componentes hijos aislados
        const headers = screen.getAllByTestId('mock-generic-header');
        expect(headers).toHaveLength(4);

        // Validar el mapeo del primer elemento funcional
        expect(headers[0]).toHaveAttribute('data-title', 'Recomendaciones Personalizadas');
        expect(headers[0]).toHaveClass('bg-green-50');
        expect(screen.getByRole('heading', { level: 3, name: 'Recomendaciones Personalizadas' })).toBeInTheDocument();
        expect(screen.getByText(/Descubre cursos adaptados a tus intereses y necesidades/i)).toBeInTheDocument();
        expect(screen.getByTestId('icon-lightbulb')).toBeInTheDocument();

        // Validar el mapeo del segundo elemento funcional
        expect(headers[1]).toHaveAttribute('data-title', 'Dashboard de Progreso');
        expect(headers[1]).toHaveClass('bg-blue-100');
        expect(screen.getByRole('heading', { level: 3, name: 'Dashboard de Progreso' })).toBeInTheDocument();
        expect(screen.getByText(/Monitorea tu avance con estadísticas detalladas/i)).toBeInTheDocument();
        expect(screen.getByTestId('icon-barchart')).toBeInTheDocument();

        // Validar el mapeo del tercer elemento funcional
        expect(headers[2]).toHaveAttribute('data-title', 'Biblioteca de Cursos');
        expect(headers[2]).toHaveClass('bg-purple-100');
        expect(screen.getByRole('heading', { level: 3, name: 'Biblioteca de Cursos' })).toBeInTheDocument();
        expect(screen.getByText(/Accede a una amplia variedad de cursos en diferentes categorías/i)).toBeInTheDocument();
        expect(screen.getByTestId('icon-bookopen')).toBeInTheDocument();

        // Validar el mapeo del cuarto elemento funcional
        expect(headers[3]).toHaveAttribute('data-title', 'Notificaciones Inteligentes');
        expect(headers[3]).toHaveClass('bg-red-100');
        expect(screen.getByRole('heading', { level: 3, name: 'Notificaciones Inteligentes' })).toBeInTheDocument();
        expect(screen.getByText(/Recibe alertas personalizadas sobre nuevos cursos/i)).toBeInTheDocument();
        expect(screen.getByTestId('icon-bellring')).toBeInTheDocument();
    });
});
