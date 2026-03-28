import React from 'react';

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
    imageAlt,
    icon,
    bgColor,
    titleColor,
    subtitleColor,
    descriptionColor,
    align = 'center',
    imageMinHeight,
    textPadding,
    containerClass = "",
    titleSize,
    descriptionSize

}: GenericHeaderProps) => {

    // Lógica de dirección (Horizontal en desktop, vertical en móvil)
    const directionMap = {
        left: "md:flex-row text-left",
        center: "flex-col text-center",
        right: "md:flex-row-reverse text-right"
    };

    return (
        <header className={`w-full overflow-hidden ${bgColor} ${containerClass}`}>
            <div className={`flex flex-col ${directionMap[align]} items-stretch w-full`}>

                {/* LADO TEXTO */}
                <div className={`flex-1 flex flex-col justify-center ${textPadding}`}>
                    {subtitle && (
                        <span className={`mt-6 font-medium leading-relaxed ${descriptionSize} ${subtitleColor}`}>
                            {subtitle}
                        </span>
                    )}
                    {/* Título con posible ícono */}
                    <div className="flex items-center gap-4 ${align === 'center' ? 'justify-center' : ''}">
                        {icon && <div className={titleColor}>{icon}</div>}
                        <h1 className={`font-black leading-[1.1] ${titleSize} ${titleColor}`}>
                            {title}
                        </h1>
                    </div>
                    {description && (
                        <div className={`mt-8 text-lg md:text-xl font-medium leading-relaxed ${descriptionColor}`}>
                            {description}
                        </div>
                    )}
                </div>

                {/* LADO IMAGEN: Sin efectos, plana y ajustable */}
                {imageSrc && (
                    <div className={`flex-1 relative ${imageMinHeight}`}>
                        <img
                            src={imageSrc}
                            alt={imageAlt}
                            className="absolute inset-0 w-full h-full object-cover shadow-none border-none rounded-none"
                        />
                    </div>
                )}
            </div>
        </header>
    );
};

export default GenericHeader;



