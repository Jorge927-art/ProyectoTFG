import React from 'react';

interface GenericHeaderProps {
    title: string;
    subtitle?: string;
    description?: React.ReactNode;
    imageSrc: string;
    imageAlt: string;

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
}

const GenericHeader = ({
    title,
    subtitle,
    description,
    imageSrc,
    imageAlt,
    bgColor = "bg-blue-700",
    titleColor = "text-white",
    subtitleColor = "text-blue-300",
    descriptionColor = "text-blue-100",
    align = 'left',
    imageMinHeight = "min-h-100", // Corregido según la sugerencia del linter
    textPadding = "p-10 md:p-24",
    containerClass = ""
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
                        <span className={`text-sm font-bold uppercase tracking-[0.2em] mb-4 ${subtitleColor}`}>
                            {subtitle}
                        </span>
                    )}
                    <h1 className={`font-black leading-[1.1] text-4xl md:text-7xl lg:text-8xl ${titleColor}`}>
                        {title}
                    </h1>
                    {description && (
                        <div className={`mt-8 text-lg md:text-2xl font-medium ${descriptionColor}`}>
                            {description}
                        </div>
                    )}
                </div>

                {/* LADO IMAGEN: Sin efectos, plana y ajustable */}
                <div className={`flex-1 relative ${imageMinHeight}`}>
                    <img
                        src={imageSrc}
                        alt={imageAlt}
                        className="absolute inset-0 w-full h-full object-cover shadow-none border-none rounded-none"
                    />
                </div>

            </div>
        </header>
    );
};

export default GenericHeader;



