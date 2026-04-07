import type { InputHTMLAttributes } from 'react';

/**
 * Props del componente Input.
 * 
 * Extiende los atributos HTML nativos de <input> (value, onChange, placeholder, type, disabled, etc.)
 * y añade propiedades personalizadas para validación y labels.
 * 
 * @interface InputProps
 * @extends {InputHTMLAttributes<HTMLInputElement>}
 */
interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    /**
     * Etiqueta descriptiva que aparece encima del input.
     * Si no se proporciona, no se renderiza el <label>.
     * Renderizada como <label> con tipografía pequeña y semibold.
     */
    label?: string;

    /**
     * Mensaje de error a mostrar debajo del input.
     * Si se proporciona, el input cambia a estado de error rojo.
     * Renderizado como <span> en rojo (text-red-500).
     */
    error?: string;
}

/**
 * Componente Input: Campo de entrada de texto flexible y accesible.
 * 
 * Renderiza un campo de entrada con soporte para:
 * - Validación visual (borde rojo y ring rojo cuando hay error)
 * - Etiqueta descriptiva (opcional)
 * - Mensaje de error (opcional)
 * - Todos los atributos HTML estándar (<input> nativo)
 * 
 * ESTILOS:
 * - Estado normal: border-gray-200, focus:ring-blue-500 (azul)
 * - Estado error: border-red-500, focus:ring-red-200 (rojo)
 * - Estados: bg-gray-50 (fondo ligero), transition-all (animación suave)
 * 
 * ACCESIBILIDAD:
 * - <label> vinculada automáticamente (si label existe)
 * - outline-none solo porque usamos focus:ring para mejor compatibilidad
 * - aria-describedby se puede añadir para vincular mensajes de error
 * 
 * COMPOSICIÓN:
 * 1. Contenedor flex-col gap-1: apila label → input → error verticalmente
 * 2. Label (opcional): pequeño, semibold, con margen izquierdo para alineación
 * 3. Input: extiende InputHTMLAttributes, aplica estilos dinámicos según error
 * 4. Error (opcional): pequeño, rojo, margen izquierdo alineado con label
 * 
 * @component
 * @example
 * // Input simple sin validación
 * <Input
 *   type="email"
 *   placeholder="tu@email.com"
 *   label="Email"
 * />
 * 
 * @example
 * // Input con validación y error
 * <Input
 *   type="password"
 *   label="Contraseña"
 *   error="Password debe tener mínimo 8 caracteres"
 *   placeholder="••••••••"
 * />
 * 
 * @example
 * // Input deshabilitado
 * <Input
 *   disabled
 *   value="No editable"
 * />
 * 
 * @param {InputProps} props - Props del componente (incluye todas las props HTML nativas)
 * @returns {JSX.Element} Contenedor con label, input y mensaje de error
 */
const Input = ({ label, error, className, ...props }: InputProps) => {
    // Clases base aplicadas a todos los inputs (sin importar el estado)
    const baseStyles = 'border p-3 rounded-xl bg-gray-50 outline-none transition-all';
    
    // Clases dinámicas según estado de validación
    // Si hay error: borde rojo y ring rojo. Si no: borde gris y ring azul.
    const stateStyles = error
        ? 'border-red-500 focus:ring-2 focus:ring-red-200'
        : 'border-gray-200 focus:ring-2 focus:ring-blue-500';
    
    // Combina clases base, dinámicas y personalizadas (className del usuario)
    // El orden es importante: base → estado → personalizadas (para permitir sobrescrituras)
    const inputClasses = `${baseStyles} ${stateStyles} ${className || ''}`.trim();

    return (
        <div className="flex flex-col gap-1 w-full">
            {/* 
                Label opcional que aparece encima del input.
                - text-sm: tamaño pequeño para etiqueta.
                - font-semibold: peso medio-alto para diferenciarse del placeholder.
                - text-gray-700: color oscuro para legibilidad.
                - ml-1: margen izquierdo para alineación visual con borde del input.
            */}
            {label && (
                <label className="text-sm font-semibold text-gray-700 ml-1">
                    {label}
                </label>
            )}

            {/* 
                Input nativo con todas las props HTML estándar.
                - {...props}: acepta value, onChange, type, disabled, placeholder, etc.
                - className dinámico: cambia según error (rojo/azul).
                - transition-all: anima cambios de color/ring suavemente.
                - outline-none: removemos outline nativo porque usamos focus:ring.
            */}
            <input
                {...props}
                className={inputClasses}
            />

            {/* 
                Mensaje de error (opcional).
                - Renderizado solo si error existe.
                - text-xs: muy pequeño para estar subordinado al input.
                - text-red-500: color rojo standard para errores.
                - ml-1: alineado con label y borde del input.
            */}
            {error && (
                <span className="text-xs text-red-500 ml-1">
                    {error}
                </span>
            )}
        </div>
    );
};

export default Input;
