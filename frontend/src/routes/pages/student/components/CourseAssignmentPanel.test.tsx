import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { CourseAssignmentPanel } from './CourseAssignmentPanel';
import type { EnrollmentInfo } from '../../../../services/courseTypes';

describe('CourseAssignmentPanel - Suite de Pruebas Unitarias [ADR-47]', () => {

    const mockEnrolledList = [
        {
            enrollmentid: 1,
            status: 'EN_PROGRESO',
            course: {
                course_id: 101,
                title: 'Desarrollo de Aplicaciones Cloud',
                instructors: 'Prof. Martín'
            }
        },
        {
            enrollmentid: 2,
            status: 'EN_PROGRESO',
            course: {
                course_id: 102,
                title: 'Inteligencia Artificial Avanzada',
                instructors: 'Prof. Gomez'
            }
        }
    ];

    it('debe renderizar el estado inicial vacío si no hay ninguna asignatura seleccionada', () => {
        render(<CourseAssignmentPanel activeCourseId={null} enrolledList={[]} />);

        expect(screen.getByText(/ASIGNATURAS/i)).toBeInTheDocument();
        expect(screen.getByText(/Selecciona una asignatura activa/i)).toBeInTheDocument();
    });

    it('debe renderizar el título de la asignatura activa correctamente', () => {
        const safeMockList = mockEnrolledList as unknown as EnrollmentInfo[];
        render(<CourseAssignmentPanel activeCourseId={101} enrolledList={safeMockList} />);

        expect(screen.getByText(/Desarrollo de Aplicaciones Cloud/i)).toBeInTheDocument();
    });

    it('debe mostrar el select con las opciones de tipo de entrega y los bloques de calificaciones', () => {
        const safeMockList = mockEnrolledList as unknown as EnrollmentInfo[];
        render(<CourseAssignmentPanel activeCourseId={101} enrolledList={safeMockList} />);

        expect(screen.getByText(/Enviar Trabajo \/ Examen/i)).toBeInTheDocument();
        expect(screen.getByText(/CALIFICACIONES/i)).toBeInTheDocument();
        expect(screen.getByText(/Nota de Trabajos:/i)).toBeInTheDocument();

        expect(screen.getByText(/Examen Final:/i)).toBeInTheDocument();
    });

    it('debe simular correctamente el cambio de asignatura mediante el selector reactivo', () => {
        const safeMockList = mockEnrolledList as unknown as EnrollmentInfo[];
        render(<CourseAssignmentPanel activeCourseId={101} enrolledList={safeMockList} />);

        // 1. Buscamos el elemento select mediante su valor inicial desplegado
        const selectElement = screen.getByDisplayValue('Desarrollo de Aplicaciones Cloud');
        expect(selectElement).toBeInTheDocument();

        // 2. Simulamos que el usuario cambia la opción al curso 102 (IA Avanzada)
        fireEvent.change(selectElement, { target: { value: '102' } });

        // 3. Verificamos que el título del panel mute dinámicamente al nuevo curso
        expect(screen.getByText(/Inteligencia Artificial Avanzada/i)).toBeInTheDocument();
    });
});
