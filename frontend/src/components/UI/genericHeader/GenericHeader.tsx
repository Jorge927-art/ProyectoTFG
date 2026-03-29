import React from 'react';

/**
 * GenericHeader es un componente de encabezado versátil y personalizable que se adapta a diversas necesidades de diseño.
 * Permite mostrar un título, subtítulo, descripción y una imagen opcional, con una amplia gama de opciones de personalización.
 */
interface GenericHeaderProps {
    title: string;
    subtitle?: string;
    description?: React.ReactNode;
    imageSrc?: string;
    imageAlt?: string;
    icon?: React.ReactNode;
    // --- Personalización de Colores (Clases Tailwind) ---
    bgColor?: string;      // ej: 'bg-blue-700'
    titleColor?: string;   // ej: 'text-white'
    subtitleColor?: string;
    descriptionColor?: string;

    // --- Estructura y Espaciado ---
    align?: 'left' | 'center' | 'right';
    /** Altura mínima del bloque de imagen (ej: 'min-h-100' para 400px o 'min-h-screen') */
    imageMinHeight?: string;
    /** Espacio interno del texto (ej: 'p-10 md:p-32') */
    textPadding?: string;
    /** Clases adicionales para el contenedor (ej: 'py-0', 'border-b') */
    containerClass?: string;
    /** Tamaños de texto (ej: 'text-4xl md:text-7xl lg:text-8xl' para el título, 'text-lg md:text-2xl' para la descripción) */
    titleSize?: string; // ej: 'text-4xl md:text-7xl lg:text-8xl'
    /** Tamaños de texto (ej: 'text-lg md:text-2xl' para la descripción) */
    descriptionSize?: string; // ej: 'text-lg md:text-2xl'
}

const GenericHeader = ({
    title,
    subtitle,
    description,
    imageSrc,
    imageAlt = "Imagen",
    icon,
    bgColor = "",
    titleColor = "",
    subtitleColor = "",
    descriptionColor = "",
    align = 'left',
    imageMinHeight = "",
    textPadding = "",
    containerClass = "",
    titleSize = "text-2xl md:text-4xl",
    descriptionSize = "text-sm md:text-base"

}: GenericHeaderProps) => {

    // Lógica de dirección (Horizontal en desktop, vertical en móvil)
    const directionMap = {
        left: "md:flex-row",
        center: "flex-col",
        right: "md:flex-row-reverse"
    };

    const itemsAlign = {
        left: "items-start text-left",
        center: "items-center text-center",
        right: "items-start text-left" // <--- FORZAMOS que en el testimonio derecho el texto siga a la izquierda
    };

    return (
        <header className={`w-full overflow-hidden ${bgColor} ${containerClass}`}>
            <div className={`flex flex-col ${directionMap[align]} items-stretch w-full`}>

                {/* LADO TEXTO */}
                <div className={`flex-1 flex flex-col justify-center ${textPadding} ${itemsAlign[align]}`}>
                    {subtitle && (
                        <span className={`font-bold tracking-tight mb-2 ${descriptionSize} ${subtitleColor}`}>
                            {subtitle}
                        </span>
                    )}
                    {/* Título con posible ícono */}
                    <div className={`flex items-center gap-4 ${align === 'center' ? 'justify-center' : ''}`}>
                        {icon && <div className={titleColor}>{icon}</div>}
                        <h1 className={`font-black leading-[1.1] ${titleSize} ${titleColor}`}>
                            {title}
                        </h1>
                    </div>
                    {description && (
                        <div className={`mt-4 font-medium leading-relaxed ${descriptionColor} ${descriptionSize}`}>
                            {description}
                        </div>
                    )}
                </div>

                {/* LADO IMAGEN: Sin efectos, plana y ajustable */}
                {imageSrc && (
                    <div className={`flex-1 flex items-center justify-center bg-slate-50 ${imageMinHeight}`}>
                        <img
                            src={imageSrc}
                            alt={imageAlt}
                            className="w-full h-full object-cover"
                        />
                    </div>
                )}
            </div>
        </header>
    );
};

export default GenericHeader;



