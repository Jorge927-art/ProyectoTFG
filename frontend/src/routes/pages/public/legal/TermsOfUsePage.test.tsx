import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import TermsOfUsePage from './TermsOfUsePage';

describe('TermsOfUsePage', () => {
    it('renderiza el título y el enlace de vuelta al inicio', () => {
        render(
            <MemoryRouter>
                <TermsOfUsePage />
            </MemoryRouter>
        );

        expect(screen.getByRole('heading', { level: 1, name: 'Términos de uso' })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Volver al inicio' })).toHaveAttribute('href', '/');
    });
});
