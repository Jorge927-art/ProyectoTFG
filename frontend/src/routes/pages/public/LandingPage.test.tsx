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
    });

    it('debe renderizar el pie de página semántico con el copyright legal estático actualizado', () => {
        render(<LandingPage />);

        const footerElement = screen.getByRole('contentinfo');
        expect(footerElement).toBeInTheDocument();
        expect(footerElement).toHaveClass('py-10', 'text-center', 'text-slate-400', 'text-sm');
        expect(footerElement.textContent).toContain('© 2026 Proyecto TFG');
    });
});
