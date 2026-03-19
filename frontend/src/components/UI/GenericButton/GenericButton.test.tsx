import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import GenericButton from './GenericButton'; 

describe('GenericButton', () => {
  
  it('debe mostrar el texto correctamente', () => {
    render(<GenericButton text="Enviar" />);
    // Buscamos si el texto "Enviar" existe en pantalla
    expect(screen.getByText(/Enviar/i)).toBeInTheDocument();
  });

  it('debe ejecutar la función onClick al hacer clic', () => {
    const mockClick = vi.fn(); // Creamos una función espía
    render(<GenericButton text="Click me" onClick={mockClick} />);
    
    const button = screen.getByRole('button'); // Buscamos el elemento por su rol HTML
    fireEvent.click(button);

    // Verificamos que la función fue llamada exactamente 1 vez
    expect(mockClick).toHaveBeenCalledTimes(1);
  });

  it('debe tener clases circulares cuando la variante es "search"', () => {
    render(<GenericButton variant="search" />);
    const button = screen.getByRole('button');
    
    // Verificamos que contenga la clase que definiste para el modo search
    expect(button.className).toContain('rounded-full');
    expect(button.className).not.toContain('rounded-lg');
  });

  it('no debe mostrar el span de texto si la prop "text" no se envía', () => {
    render(<GenericButton icon={<span>Icono</span>} />);
    // Verificamos que NO haya un elemento con texto (usamos queryBy para que no explote si no lo halla)
    const textSpan = screen.queryByText((_, element) => {
        return element?.tagName.toLowerCase() === 'span' && element.classList.contains('font-medium')
    }); 
    expect(textSpan).toBeNull();
  });
});
