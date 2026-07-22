import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import GenericHeader from './GenericHeader';

// --- TIPADO ESTRICTO PARA MOCKS Y CONFIGURACIONES DE PRUEBA ---
interface MockIconProps {
    className?: string;
    'data-testid'?: string;
}

const DummyIcon = ({ className = '', 'data-testid': testId = 'dummy-icon' }: MockIconProps): ReactNode => (
    <svg className={className} data-testid={testId} />
);

describe('GenericHeader - Suite de Pruebas Unitarias de Alta Fidelidad', () => {
    const baseProps = {
        title: 'Título de Prueba Corporativo',
    };
    // --- BLOQUE 1: VERIFICACIONES DE CONTENIDO Y ESTRUCTURA BASE ---
    it('debe renderizar el contenido mínimo requerido con clases por defecto', () => {
        render(<GenericHeader {...baseProps} />);

        const titleElement = screen.getByRole('heading', { level: 1, name: baseProps.title });
        expect(titleElement).toBeInTheDocument();
        expect(titleElement).toHaveClass('font-black', 'leading-[1.1]', 'text-2xl', 'md:text-4xl');

        const innerTextContainer = titleElement.closest('div')?.parentElement;
        expect(innerTextContainer).toHaveClass('p-8', 'md:p-16', 'items-start', 'text-left');

        expect(screen.queryByAltText('Imagen')).not.toBeInTheDocument();
    });

    it('debe renderizar e inyectar el subtítulo e icono con herencia de color', () => {
        const customProps = {
            ...baseProps,
            subtitle: 'Subtítulo Exclusivo',
            titleColor: 'text-indigo-600',
            subtitleColor: 'text-indigo-200',
            descriptionSize: 'text-lg',
            icon: <DummyIcon />,
        };

        render(<GenericHeader {...customProps} />);

        const subtitleElement = screen.getByText(customProps.subtitle);
        expect(subtitleElement).toBeInTheDocument();
        expect(subtitleElement).toHaveClass('font-bold', 'tracking-tight', 'text-lg', 'text-indigo-200');

        const iconContainer = screen.getByTestId('dummy-icon').parentElement;
        expect(iconContainer).toHaveClass('text-indigo-600');
    });

    it('debe admitir y renderizar contenido complejo/JSX en la descripción', () => {
        const descriptionTestId = 'custom-desc-node';
        const descriptionNode: ReactNode = (
            <section data-testid={descriptionTestId}>
                <p>Párrafo descriptivo interactivo</p>
            </section>
        );

        render(
            <GenericHeader
                {...baseProps}
                description={descriptionNode}
                descriptionColor="text-gray-700"
                descriptionSize="text-base"
            />
        );

        const customNode = screen.getByTestId(descriptionTestId);
        expect(customNode).toBeInTheDocument();

        const descriptionContainer = customNode.parentElement;
        expect(descriptionContainer).toHaveClass('mt-4', 'font-medium', 'leading-relaxed', 'text-gray-700', 'text-base');
    });

    // --- BLOQUE 2: COMPOSICIÓN DINÁMICA DE CLASES TAILWIND Y ALINEACIONES ---
    it.each([
        ['left' as const, 'md:flex-row', 'items-start text-left'],
        ['center' as const, 'flex-col', 'items-center text-center'],
        ['right' as const, 'md:flex-row-reverse', 'items-end text-right']
    ])('debe aplicar clases de DIRECCIÓN ("%s") y ALINEACIÓN correlativas según el contrato visual', (alignValue, expectedDirClass, expectedAlignClass) => {
        const { container } = render(
            <GenericHeader {...baseProps} align={alignValue} />
        );

        const flexLayoutContainer = container.querySelector('.flex.flex-col');
        expect(flexLayoutContainer).toHaveClass(expectedDirClass, 'items-stretch', 'w-full');

        const textBlock = container.querySelector(`.${expectedAlignClass.replace(/ /g, '.')}`);
        expect(textBlock).toBeInTheDocument();

        const titleWrapper = screen.getByRole('heading', { level: 1 }).parentElement;
        if (alignValue === 'center') {
            expect(titleWrapper).toHaveClass('justify-center');
        } else {
            expect(titleWrapper).not.toHaveClass('justify-center');
        }
    });
    // --- BLOQUE 3: GESTIÓN DE ELEMENTOS MULTIMEDIA Y PERSONALIZACIÓN EXTERNA ---
    it('debe renderizar el bloque de imagen condicional con accesibilidad configurada si se provee imageSrc', () => {
        const imageProps = {
            ...baseProps,
            imageSrc: 'https://midominio.com',
            imageAlt: 'Dashboard de métricas globales del TFG',
            imageMinHeight: 'min-h-[600px]',
        };

        render(<GenericHeader {...imageProps} />);

        const imgElement = screen.getByRole('img', { name: imageProps.imageAlt }) as HTMLImageElement;
        expect(imgElement).toBeInTheDocument();

        // CORRECCIÓN QUIRÚRGICA: Evaluación del atributo literal del DOM para evitar la barra de normalización del host
        expect(imgElement.getAttribute('src')).toBe(imageProps.imageSrc);
        expect(imgElement).toHaveClass('w-full', 'h-full', 'object-cover');

        const imgWrapper = imgElement.parentElement;
        expect(imgWrapper).toHaveClass('flex-1', 'flex', 'items-center', 'justify-center', 'bg-slate-50', 'min-h-[600px]');
    });

    it('debe recurrir al fallback defensivo de accesibilidad ("Imagen") si imageAlt es omitido', () => {
        render(<GenericHeader {...baseProps} imageSrc="/placeholder.png" />);

        const imgElement = screen.getByRole('img', { name: 'Imagen' });
        expect(imgElement).toBeInTheDocument();
    });

    it('debe inyectar limpiamente las clases opcionales de contenedor y personalización cosmética externa', () => {
        const structuralProps = {
            ...baseProps,
            bgColor: 'bg-gradient-to-tr from-zinc-900 to-black',
            containerClass: 'border-b border-zinc-800 shadow-2xl rounded-xl',
            titleSize: 'text-5xl lg:text-7xl',
        };

        const { container } = render(<GenericHeader {...structuralProps} />);

        const headerElement = container.querySelector('header');
        expect(headerElement).toBeInTheDocument();
        expect(headerElement).toHaveClass(
            'w-full',
            'overflow-hidden',
            'bg-gradient-to-tr',
            'from-zinc-900',
            'to-black',
            'border-b',
            'border-zinc-800',
            'shadow-2xl',
            'rounded-xl'
        );

        const h1Element = screen.getByRole('heading', { level: 1 });
        expect(h1Element).toHaveClass('text-5xl', 'lg:text-7xl');
    });
});

