import type { ReactNode, MouseEventHandler } from "react";

/** Variantes visuales disponibles para el botón. */
type ButtonVariant = 'white' | 'search' | 'category';

/**
 * Props del componente GenericButton.
 * 
 * @interface GenericButtonProps
 * @property {string} [label] - Texto que se muestra en el botón. Si no se proporciona, solo se renderiza el icono.
 * @property {ReactNode} [icon] - Icono que se muestra a la izquierda del texto. Debe ser un elemento React o componente.
 * @property {MouseEventHandler} [onClick] - Callback ejecutado al hacer clic en el botón.
 * @property {ButtonVariant} [variant='white'] - Variante visual del botón que determina estilos y comportamiento.
 *   - 'white': Botón blanco con bordes grises (default, para contextos claros)
 *   - 'search': Botón redondeado para barra de búsqueda (forma más suave)
 *   - 'category': Botón sin relleno hasta hover, para listas de categorías
 */
interface GenericButtonProps {
    label?: string;
    icon?: ReactNode;
    onClick?: MouseEventHandler<HTMLButtonElement>;
    variant?: ButtonVariant;
}

/**
 * Botón genérico reutilizable con múltiples variantes visuales.
 * 
 * CASOS DE USO:
 * - variant='white': Botones de acción general (login, submit, etc.)
 * - variant='search': Botón en barras de búsqueda
 * - variant='category': Elementos seleccionables en listas
 * 
 * El componente soporta renderizar solo icono, solo texto, o ambos combinados.
 * Los estilos se aplican en cascada: clases base → variantes específicas → validaciones.
 * 
 * @component
 * @example
 * // Botón con icono y texto
 * <GenericButton label="Search" icon={<SearchIcon />} variant="search" />
 * 
 * @example
 * // Botón de categoría sin icono
 * <GenericButton label="Technology" variant="category" onClick={handleSelect} />
 * 
 * @param {GenericButtonProps} props - Props del botón
 * @returns {JSX.Element} El elemento button con estilos aplicados
 */
const GenericButton = ({ label, icon, onClick, variant = 'white' }: GenericButtonProps) => {
    // Flags booleanos para determinar qué variante se está usando.
    // Simplifica la lógica de renderizado comparando contra la variante elegida.
    const isSearch = variant === 'search';
    const isCategory = variant === 'category';

    // Clases base aplicadas a todas las variantes.
    // Incluyen: flexbox layout, transiciones suaves, estados de foco/activo.
    const baseClasses = [
        'flex items-center gap-3',
        'transition-all duration-300 ease-in-out',
        'active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-500',
    ].join(' ');

    // Clases específicas por variante visual.
    // Cada variante tiene su propio estilo de fondo, bordes y comportamiento hover.
    // Se aplica una sola variante a la vez (se usan condicionales ternarios).
    const variantClasses = isSearch
        ? 'bg-white text-gray-700 border border-gray-200 p-3 rounded-full hover:bg-blue-300'
        : isCategory
            ? 'w-full px-4 py-3 text-left rounded-xl hover:bg-blue-50 hover:text-blue-600 border border-transparent hover:border-blue-100'
            : 'bg-white text-gray-700 border border-gray-200 shadow-sm hover:bg-blue-300'; // white (default)

    // Clases adicionales solo para la variante 'white'.
    // Se añaden padding y centrado, pero solo si NO es search ni category.
    const additionalClasses = !isSearch && !isCategory ? 'px-6 py-2 rounded-lg justify-center' : '';

    // Combinamos todas las clases en orden: base → variante → adicionales
    const buttonClasses = `${baseClasses} ${variantClasses} ${additionalClasses}`;

    return (
        <button
            onClick={onClick}
            className={buttonClasses}
            aria-label={label}
        >
            {/* Renderizar icono si existe. Se envuelve en un contenedor flex para alineación. */}
            {icon && <span className="flex items-center">{icon}</span>}

            {/* Renderizar etiqueta de texto si existe. Usa font-medium para resalte visual. */}
            {label && <span className="font-medium leading-none">{label}</span>}
        </button>
    );
};

export default GenericButton;