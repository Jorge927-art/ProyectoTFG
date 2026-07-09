import { render, screen } from '@testing-library/react';

import { describe, it, expect, vi } from 'vitest';
import { StudentStatsPanel } from './StudentStatsPanel';

// Simulamos de forma asíncrona el hook para controlar el payload analítico de PostgreSQL
vi.mock('./useCourseStats', () => ({
    useCourseStats: (id: number | null | undefined) => {
        if (id === 1) {
            return {
                stats: {
                    courseId: 1,
                    averageGrade: null, // Simulamos estado inerte (sin notas)
                    localEnrollments: 0,
                    communityRating: null, // Sin valoraciones aún
                    instructorRating: null,
                    platform: 'Coursera',
                    category: 'Data Science'
                },
                loadingStats: false,
                statsError: ''
            };
        }
        return { stats: null, loadingStats: false, statsError: '' };
    }
}));

// Simulamos de forma atómica el GenericCard para aislar el árbol de componentes
vi.mock('../../../../components/ui/genericCard/GenericCard', () => {
    return {
        default: ({ children, className }: { children: React.ReactNode; className: string }) => (
            <article className={className}>{children}</article>
        )
    };
});

describe('StudentStatsPanel - Pruebas de Control [ADR-41]', () => {

    it('debería renderizar el mensaje de respaldo cuando no existen valoraciones registradas', () => {
        // ACT
        render(<StudentStatsPanel activeCourseId={1} />);

        // ASSERT: Validamos que se muestren tus textos reales de nulidad pedagógica
        const fallbackTexts = screen.getAllByText(/Sin valoraciones/i);
        expect(fallbackTexts.length).toBeGreaterThan(0);
    });

    it('debería mantener de forma estricta la clase h-102 para garantizar la simetría geométrica de la UI', () => {
        // ACT
        const { container } = render(<StudentStatsPanel activeCourseId={1} />);
        const card = container.querySelector('article');

        // ASSERT: Verificamos tu clase real h-102 para evitar falsos negativos en Vitest
        expect(card).toHaveClass('h-102');
    });
});
