import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
// 1. IMPORTACIÓN CRÍTICA PARA VITEST: Traemos las firmas globales del runner
import { describe, test, expect, vi } from 'vitest';
import { SmartRecommendations } from './SmartRecommendations';
import type { RecommendedCourse } from '../../../../services/userDomains';

// 2. CORRECCIÓN DE MOCK: Sustituimos 'jest.mock' por 'vi.mock'
vi.mock('lucide-react', () => ({
    Sparkles: () => <div data-testid="sparkles-icon" />,
    Star: () => <div data-testid="star-icon" />
}));

// Sustituimos también el mock de GenericCard por la sintaxis de exportación por defecto de Vitest
vi.mock('../../../../components/ui/genericCard/GenericCard', () => {
    return {
        default: function MockGenericCard({ children, className }: { children: React.ReactNode; className?: string }) {
            return <div data-testid="generic-card" className={className}>{children}</div>;
        }
    };
});

describe('SmartRecommendations Component - Pruebas Unitarias', () => {

    // ESCENARIO 1: Lista vacía
    test('debe renderizar el mensaje de fallback cuando la lista de recomendaciones está vacía', () => {
        render(<SmartRecommendations recommendations={[]} />);

        // Comprobar que el título del módulo siempre se muestra
        expect(screen.getByText('Recomendaciones personalizadas para ti')).toBeInTheDocument();

        // Comprobar el mensaje de lista vacía requerido por NotebookLM
        const fallbackMessage = screen.getByText('No hay recomendaciones disponibles para tu perfil actual.');
        expect(fallbackMessage).toBeInTheDocument();
    });

    // ESCENARIO 2 & 3: Lista con datos y pesos algorítmicos
    test('debe renderizar la lista de recomendaciones mapeando correctamente categorías, títulos y el formateo de los ratings', () => {
        const mockRecommendations: RecommendedCourse[] = [
            {
                id: 1,
                title: 'Curso de Spring Boot Avanzado',
                category: 'BACKEND',
                instructor: 'Dr. Alejandro',
                rating: 4.867, // Probará el formateo .toFixed(1) -> 4.9
                reason: 'Basado en tu interés por arquitecturas limpias.'
            },
            {
                id: 2,
                title: 'Tailwind CSS Profesional',
                category: 'FRONTEND',
                instructor: 'Dra. María',
                rating: 4.0, // Probará el formateo .toFixed(1) -> 4.0
                reason: 'Recomendado por tus habilidades en React.'
            }
        ];

        render(<SmartRecommendations recommendations={mockRecommendations} />);

        // 1. Validar presencia de los títulos y categorías (Contrato e Interfaz)
        expect(screen.getByText('Curso de Spring Boot Avanzado')).toBeInTheDocument();
        expect(screen.getByText('BACKEND')).toBeInTheDocument();
        expect(screen.getByText('Instructor: Dr. Alejandro')).toBeInTheDocument();

        expect(screen.getByText('Tailwind CSS Profesional')).toBeInTheDocument();
        expect(screen.getByText('FRONTEND')).toBeInTheDocument();
        expect(screen.getByText('Instructor: Dra. María')).toBeInTheDocument();

        // 2. Validar inyección del campo dinámico {rec.reason} (Corrección crítica del componente)
        expect(screen.getByText('💡 Basado en tu interés por arquitecturas limpias.')).toBeInTheDocument();
        expect(screen.getByText('💡 Recomendado por tus habilidades en React.')).toBeInTheDocument();
        // 3. Validar el formateo algorítmico numérico a un decimal de los pesos
        expect(screen.getByText('4.9')).toBeInTheDocument();
        expect(screen.getByText('4.0')).toBeInTheDocument();
    });
});
