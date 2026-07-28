import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Footer from './Footer';

describe('Footer - Suite de Pruebas Unitarias', () => {
    it('renderiza la marca y la descripción institucional', () => {
        render(<Footer />);

        expect(screen.getByText('GESTIÓN DE CURSOS ONLINE')).toBeInTheDocument();
        expect(screen.getByText(/Plataforma de formación online/i)).toBeInTheDocument();
    });

    it('renderiza el elemento semántico <footer> con fondo oscuro', () => {
        render(<Footer />);

        const footerElement = screen.getByRole('contentinfo');
        expect(footerElement).toBeInTheDocument();
        expect(footerElement).toHaveClass('bg-slate-900', 'text-slate-300');
    });

    it('renderiza los enlaces de navegación ancla a las secciones de la landing', () => {
        render(<Footer />);

        expect(screen.getByRole('link', { name: 'Características' })).toHaveAttribute('href', '#features');
        expect(screen.getByRole('link', { name: 'Testimonios' })).toHaveAttribute('href', '#testimonials');
        expect(screen.getByRole('link', { name: 'Inicio' })).toHaveAttribute('href', '/');
    });

    it('renderiza los enlaces legales', () => {
        render(<Footer />);

        expect(screen.getByRole('link', { name: 'Política de privacidad' })).toHaveAttribute('href', '/privacidad');
        expect(screen.getByRole('link', { name: 'Términos de uso' })).toHaveAttribute('href', '/terminos');
        expect(screen.getByRole('link', { name: 'Cookies' })).toHaveAttribute('href', '/cookies');
    });

    it('renderiza los enlaces sociales con atributos de accesibilidad y seguridad correctos', () => {
        render(<Footer />);

        const emailLink = screen.getByRole('link', { name: 'Enviar correo' });
        expect(emailLink).toHaveAttribute('href', 'mailto:contacto@cursosonline.com');

        const githubLink = screen.getByRole('link', { name: 'Repositorio en GitHub' });
        expect(githubLink).toHaveAttribute('target', '_blank');
        expect(githubLink).toHaveAttribute('rel', 'noreferrer');

        const linkedinLink = screen.getByRole('link', { name: 'LinkedIn' });
        expect(linkedinLink).toHaveAttribute('target', '_blank');
        expect(linkedinLink).toHaveAttribute('rel', 'noreferrer');
    });

    it('renderiza el copyright con el año actual calculado dinámicamente', () => {
        render(<Footer />);

        const currentYear = new Date().getFullYear();
        expect(screen.getByText(new RegExp(`© ${currentYear} Gestión de Cursos Online`))).toBeInTheDocument();
    });

    it('renderiza la línea de stack tecnológico', () => {
        render(<Footer />);

        expect(screen.getByText('Hecho con React, Spring Boot y PostgreSQL.')).toBeInTheDocument();
    });
});