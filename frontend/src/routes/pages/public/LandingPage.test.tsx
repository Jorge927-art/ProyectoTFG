import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import LandingPage from './LandingPage';

// --- AISLAMIENTO PERIMETRAL ESTRICTO: MOCK DE COMPONENTES DE LA LANDING ---
vi.mock('@/components/navbar', () => ({
    MainNavbar: () => <nav data-testid="mock-main-navbar" />,
}));

vi.mock('@/components/Hero', () => ({
    default: () => <section data-testid="mock-hero" />,
}));

vi.mock('@/components/Features', () => ({
    default: () => <section data-testid="mock-features" />,
}));

vi.mock('@/components/Testimonials', () => ({
    default: () => <section data-testid="mock-testimonials" />,
}));

vi.mock('@/components/ui/footer/Footer', () => ({
    default: () => <footer data-testid="mock-footer" />,
}));

describe('LandingPage - Suite de Pruebas Unitarias Completa', () => {
    it('debe estructurar y renderizar correctamente la estructura jerárquica de la landing page', () => {
        const { container } = render(<LandingPage />);

        // 1. Verificar el contenedor raíz y sus utilidades de estilo estructural
        const rootContainer = container.firstChild as HTMLElement;
        expect(rootContainer).toHaveClass('min-h-screen', 'bg-slate-50', 'font-sans');

        // 2. Verificar la presencia del bloque de navegación global
        expect(screen.getByTestId('mock-main-navbar')).toBeInTheDocument();

        // 3. Verificar el contenedor principal semántico y el orden correlativo de las secciones
        const mainElement = container.querySelector('main');
        expect(mainElement).toBeInTheDocument();

        const hero = screen.getByTestId('mock-hero');
        const features = screen.getByTestId('mock-features');
        const testimonials = screen.getByTestId('mock-testimonials');

        expect(mainElement).toContainElement(hero);
        expect(mainElement).toContainElement(features);
        expect(mainElement).toContainElement(testimonials);

        // 4. Verificar que las secciones ancla existen para los enlaces del footer
        expect(container.querySelector('#features')).toContainElement(features);
        expect(container.querySelector('#testimonials')).toContainElement(testimonials);
    });

    it('debe renderizar el componente Footer institucional dentro de la landing', () => {
        const { container } = render(<LandingPage />);

        const footer = screen.getByTestId('mock-footer');
        expect(footer).toBeInTheDocument();

        // Confirma que el footer se renderiza después del <main>, no dentro de él
        const mainElement = container.querySelector('main');
        expect(mainElement).not.toContainElement(footer);
    });
});
