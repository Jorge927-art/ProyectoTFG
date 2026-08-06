import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PrivacyPolicyPage from './PrivacyPolicyPage';

describe('PrivacyPolicyPage', () => {
    it('renderiza el título y el enlace de vuelta al inicio', () => {
        render(
            <MemoryRouter>
                <PrivacyPolicyPage />
            </MemoryRouter>
        );

        expect(screen.getByRole('heading', { level: 1, name: 'Política de privacidad' })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Volver al inicio' })).toHaveAttribute('href', '/');
    });
});
