
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { describe, test, expect, vi } from 'vitest';
import Input from './Input';

describe('Input Component - Pruebas Unitarias de Formulario [ADR-47]', () => {

    // ESCENARIO 1: Renderizado básico con Label y atributos nativos
    test('debe renderizar la etiqueta label y aplicar los atributos HTML estándar proporcionados', () => {
        render(
            <Input
                label="Nombre de Usuario"
                placeholder="Ingresa tu alias"
                type="text"
            />
        );

        // 1. Validar presencia del Label corporativo
        expect(screen.getByText('Nombre de Usuario')).toBeInTheDocument();

        // 2. Validar que el input nativo absorba el placeholder mediante el operador spread {...props}
        const inputElement = screen.getByPlaceholderText('Ingresa tu alias') as HTMLInputElement;
        expect(inputElement).toBeInTheDocument();
        expect(inputElement.type).toBe('text');
    });

    // ESCENARIO 2: Estado de Error y Clases Visuales de Tailwind CSS
    test('debe reflejar visualmente el estado de error y mutar los bordes a color rojo', () => {
        const mensajeError = 'El formato del correo electrónico no es válido';

        render(
            <Input
                placeholder="correo@dominio.com"
                error={mensajeError}
            />
        );

        // 1. Validar que aparezca el texto del span de error debajo
        expect(screen.getByText(mensajeError)).toBeInTheDocument();

        // 2. Validar que las clases dinámicas de error de Tailwind se inyecten correctamente
        const inputElement = screen.getByPlaceholderText('correo@dominio.com');
        expect(inputElement).toHaveClass('border-red-500');
        expect(inputElement).toHaveClass('focus:ring-red-200');

        // 3. Asegurar que NO contenga los estilos del flujo normal (borde gris/azul)
        expect(inputElement).not.toHaveClass('border-gray-200');
        expect(inputElement).not.toHaveClass('focus:ring-blue-500');
    });

    // ESCENARIO 3: Propagación interactiva del evento onChange
    test('debe capturar e interceptar la propagación de eventos onChange al escribir en el campo', async () => {
        const mockOnChange = vi.fn();

        render(
            <Input
                placeholder="Escribe aquí"
                onChange={mockOnChange}
            />
        );

        const inputElement = screen.getByPlaceholderText('Escribe aquí');

        // Simulamos la interacción real del usuario usando userEvent (mejor práctica que fireEvent)
        await userEvent.type(inputElement, 'Luis');

        // Validamos que el callback se haya ejecutado por cada carácter tipeado (L-u-i-s = 4 ejecuciones)
        expect(mockOnChange).toHaveBeenCalledTimes(4);
    });

    // ESCENARIO 4: Estado Deshabilitado (Edge Case para asegurar la robustez de los formularios)
    test('debe bloquear la interacción del input si se le transfiere la propiedad disabled', async () => {
        const mockOnChange = vi.fn();

        render(
            <Input
                placeholder="Bloqueado"
                onChange={mockOnChange}
                disabled
            />
        );

        const inputElement = screen.getByPlaceholderText('Bloqueado') as HTMLInputElement;

        // 1. Validar atributo nativo
        expect(inputElement.disabled).toBe(true);

        // 2. Validar que intente escribir y no propague ninguna acción
        await userEvent.type(inputElement, 'Intento de texto');
        expect(mockOnChange).not.toHaveBeenCalled();
    });
});
