// frontend/src/components/ui/genericButton/GenericButton.tsx
import type { ReactNode, MouseEventHandler } from "react";

/** Variantes visuales disponibles para el botón extendidas según [ADR-13]. */
type ButtonVariant = 'white' | 'search' | 'category' | 'dark' | 'primary' | 'success' | 'text';

/**
 * Props del componente GenericButton con soporte para atributos HTML nativos.
 * 
 * @interface GenericButtonProps
 */
interface GenericButtonProps {
    label?: string;
    ariaLabel?: string;
    title?: string;
    icon?: ReactNode;
    onClick?: MouseEventHandler<HTMLButtonElement>;
    variant?: ButtonVariant;
    type?: 'button' | 'submit' | 'reset';
    disabled?: boolean;
    className?: string;
    isActive?: boolean;
}

/**
 * Botón genérico reutilizable con múltiples variantes visuales y funcionales.
 * 
 * CASOS DE USO ASIGNADOS:
 * - variant='white': Botones de acción general o secundaria.
 * - variant='search': Botón redondeado para barras de búsqueda.
 * - variant='category': Elementos seleccionables en listas laterales.
 * - variant='dark': Acciones críticas oscuras (Access Denied / Auth base).
 * - variant='primary': Acciones principales del flujo (Matriculación / Configuración).
 * - variant='success': Éxito académico en hot-reload (Iniciar/Continuar asignatura).
 * 
 * @param {GenericButtonProps} props - Props del botón
 * @returns {JSX.Element} El elemento button con estilos unificados y reactivos
 */
const GenericButton = ({
    label,
    ariaLabel,
    title,
    icon,
    onClick,
    variant = 'white',
    type = 'button',
    disabled = false,
    className = '',
    isActive = false
}: GenericButtonProps) => {

    // Identificadores booleanos de variante para el enrutador de clases Tailwind v4
    const isSearch = variant === 'search';
    const isCategory = variant === 'category';
    const isDark = variant === 'dark';
    const isPrimary = variant === 'primary';
    const isSuccess = variant === 'success';

    // Clases base transversales: interactividad, transiciones y anillos de foco estandarizados
    const baseClasses = [
        'flex items-center gap-3 font-medium text-xs sm:text-sm',
        'transition-all duration-300 ease-in-out',
        'active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-500/50',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100'
    ].join(' ');
    // Enrutador semántico de clases específicas por variante visual
    const isText = variant === 'text'; // Agrega este flag arriba con los demás

    const variantClasses = isSearch
        ? 'bg-white text-gray-700 border border-gray-200 p-3 rounded-full hover:bg-blue-300'
        : isCategory
            ? (isActive
                ? 'w-full px-4 py-3 text-left rounded-xl bg-blue-100 text-blue-700 shadow-inner border border-blue-300 font-bold'
                : 'w-full px-4 py-3 text-left rounded-xl bg-white text-slate-600 hover:bg-blue-50 hover:text-blue-600 border border-transparent hover:border-blue-100') // 
            : isDark
                ? 'bg-slate-800 text-white hover:bg-slate-900 border border-transparent shadow-sm'
                : isPrimary
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700 border border-transparent shadow-sm'
                    : isSuccess
                        ? 'bg-emerald-600 text-white hover:bg-emerald-700 border border-transparent shadow-sm'
                        : isText
                            ? 'bg-transparent text-slate-500 hover:bg-slate-100 border border-transparent' // Nueva variante limpia
                            : 'bg-white text-gray-700 border border-gray-200 shadow-sm hover:bg-blue-300';

    // Clases de padding y centrado estándar para variantes no-atómicas (Excluye búsqueda y categorías)
    const additionalClasses = !isSearch && !isCategory ? 'px-4 py-2 rounded-lg justify-center' : '';

    // Unión limpia de clases: base → variante → adicionales fijas → inyección personalizada externa
    const buttonClasses = `${baseClasses} ${variantClasses} ${additionalClasses} ${className}`.trim();

    return (
        <button
            type={type}
            onClick={onClick}
            className={buttonClasses}
            disabled={disabled}
            aria-label={ariaLabel || label}
            title={title}
        >
            {/* Renderizado dinámico del icono respetando la alineación flex */}
            {icon && <span className="flex items-center shrink-0">{icon}</span>}

            {/* Renderizado del texto adaptivo leading-none */}
            {label && <span className="leading-none">{label}</span>}
        </button>
    );
};

export default GenericButton;
