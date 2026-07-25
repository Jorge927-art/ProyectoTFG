import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MetricStatCard } from './MetricStatCard';

vi.mock('../../../../components/ui/genericCard/GenericCard', () => ({
    default: ({ children }: { children: React.ReactNode }) => <section data-testid="generic-card">{children}</section>
}));

describe('MetricStatCard', () => {
    it('debe renderizar el valor, la insignia y la descripción', () => {
        render(
            <MetricStatCard
                icon={<span data-testid="icon">*</span>}
                title="Progreso colectivo asignatura"
                value="81.5%"
                description="Media de avance"
                badgeLabel="Rendimiento"
                badgeClassName="bg-green-50 text-green-700"
            />
        );

        expect(screen.getByTestId('generic-card')).toBeInTheDocument();
        expect(screen.getByTestId('icon')).toBeInTheDocument();
        expect(screen.getByText('81.5%')).toBeInTheDocument();
        expect(screen.getByText('Progreso colectivo asignatura')).toBeInTheDocument();
        expect(screen.getByText('Media de avance')).toBeInTheDocument();
        expect(screen.getByText('Rendimiento')).toBeInTheDocument();
    });
});