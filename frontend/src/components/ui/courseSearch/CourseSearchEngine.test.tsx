import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CourseSearchEngine } from './CourseSearchEngine';
import type { DBModelCourse } from '../../../services/courseTypes';

// Mocks de submódulos para aislar el componente bajo prueba
vi.mock('lucide-react', () => ({
    Search: () => <div data-testid="search-icon" />,
    Loader2: () => <div data-testid="loader-icon" />,
    Star: () => <div data-testid="star-icon" />
}));

vi.mock('../genericCard/GenericCard', () => ({
    default: ({ children, className }: { children: React.ReactNode; className?: string }) => (
        <div data-testid="generic-card" className={className}>{children}</div>
    )
}));

vi.mock('../Input', () => ({
    default: ({ value, onChange, placeholder, className }: {
        value: string;
        onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
        placeholder?: string;
        className?: string;
    }) => (
        <input
            data-testid="custom-input"
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            className={className}
        />
    )
}));

describe('CourseSearchEngine Unit Tests', () => {
    const mockSetSearchKeyword = vi.fn();
    const mockRenderAction = vi.fn((course: DBModelCourse) => (
        <button data-testid={`action-${course.course_id}`}>Matricular</button>
    ));

    const sampleCourses: DBModelCourse[] = [
        {
            course_id: 1,
            title: 'Desarrollo Backend con Spring Boot',
            category: 'Programación',
            instructors: 'Prof. Alejandro García',
            rating: 4.8
        },
        {
            course_id: 2,
            title: 'Análisis de Datos con Python',
            category: 'Data Science',
            instructors: '',
            rating: 0
        }
    ];

    const defaultProps = {
        title: 'Buscador Predictivo de Cursos',
        subtitle: 'Encuentra asignaturas adaptadas a tu perfil académico.',
        searchKeyword: '',
        setSearchKeyword: mockSetSearchKeyword,
        visibleCourses: sampleCourses,
        loadingCatalog: false,
        renderAction: mockRenderAction
    };

    it('Debería renderizar correctamente los textos de cabecera y el estado inicial', () => {
        render(<CourseSearchEngine {...defaultProps} />);

        expect(screen.getByText('Buscador Predictivo de Cursos')).toBeInTheDocument();
        expect(screen.getByText('Encuentra asignaturas adaptadas a tu perfil académico.')).toBeInTheDocument();
        expect(screen.getByTestId('search-icon')).toBeInTheDocument();
    });

    it('Debería capturar el evento de escritura en el input de búsqueda', () => {
        render(<CourseSearchEngine {...defaultProps} />);

        const input = screen.getByTestId('custom-input');
        fireEvent.change(input, { target: { value: 'Spring' } });

        expect(mockSetSearchKeyword).toHaveBeenCalledWith('Spring');
    });
    it('Debería mostrar el icono del loader de forma síncrona si loadingCatalog es true', () => {
        render(<CourseSearchEngine {...defaultProps} loadingCatalog={true} />);

        expect(screen.getByTestId('loader-icon')).toBeInTheDocument();
    });


    it('Debería listar la colección de cursos con sus metadatos y aplicar los fallbacks de campos vacíos', () => {
        render(<CourseSearchEngine {...defaultProps} />);

        // Verificar el primer curso empleando expresiones regulares tolerantes al texto plano del DOM
        expect(screen.getByText(/Desarrollo Backend con Spring Boot/i)).toBeInTheDocument();
        expect(screen.getByText(/Programación/i)).toBeInTheDocument();
        expect(screen.getByText(/Prof. Alejandro García/i)).toBeInTheDocument();
        expect(screen.getByText('4.8')).toBeInTheDocument();
        expect(screen.getByTestId('action-1')).toBeInTheDocument();

        // Verificar el segundo curso (Campos vacíos con fallbacks nativos de la UI)
        expect(screen.getByText(/Análisis de Datos con Python/i)).toBeInTheDocument();
        expect(screen.getByText(/Por asignar/i)).toBeInTheDocument();
        expect(screen.getByText('5.0')).toBeInTheDocument();
        expect(screen.getByTestId('action-2')).toBeInTheDocument();
    });

    it('Debería mostrar un mensaje explícito si la lista de cursos visibles está vacía y no está cargando', () => {
        render(<CourseSearchEngine {...defaultProps} visibleCourses={[]} />);

        const emptyMessage = screen.getByText(/No se encontraron cursos que coincidan con el criterio introducido/i);
        expect(emptyMessage).toBeInTheDocument();
    });

    it('No debería mostrar el mensaje de lista vacía si se encuentra en estado de carga (loadingCatalog en true)', () => {
        render(<CourseSearchEngine {...defaultProps} visibleCourses={[]} loadingCatalog={true} />);

        const emptyMessage = screen.queryByText(/No se encontraron cursos que coincidan con el criterio introducido/i);
        expect(emptyMessage).not.toBeInTheDocument();
    });
});
