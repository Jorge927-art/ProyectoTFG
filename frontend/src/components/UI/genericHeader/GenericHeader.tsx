import type { ReactNode } from 'react';

/**
 * Props del componente GenericHeader.
 * 
 * Define el contrato de aceptación para un componente flexible de encabezado que soporta
 * múltiples variantes visuales y de layout. Las props se dividen en tres categorías:
 * 1. Contenido principal (title, subtitle, description, icon)
 * 2. Personalización de colores (clases Tailwind para texto y fondo)
 * 3. Estructura y espaciado (alignment, sizing, dimensiones)
 * 
 * El componente usa composición de clases Tailwind dinámicas, validadas en tiempo de compilación.
 */
interface GenericHeaderProps {
    // --- CONTENIDO PRINCIPAL ---

    /** 
     * Título principal del encabezado. Requerido.
     * Renderizado como <h1> con tipografía bold (font-black) y línea-height comprimida (leading-[1.1])
     * para máximo impacto visual. Acepta cualquier string (no HTML).
     */
    title: string;

    /** 
     * Subtítulo opcional que aparece encima del título.
     * Renderizado como <span> con tipografía semi-bold (font-bold) y tracking-tight.
     * Útil para complementar el título (ej: rol, categoría, badge).
     */
    subtitle?: string;

    /** 
     * Descripción de contenido flexible (texto, JSX, componentes).
     * Se muestra debajo del título con espaciado mt-4.
     * Renderizado como <div> para permitir contenido HTML arbitrario (perfecto para párrafos, listas, etc).
     */
    description?: ReactNode;

    /** 
     * URL de la imagen a mostrar. Si no se proporciona, el componente no renderiza el bloque de imagen.
     * Renderizada en un contenedor flex con object-cover para mantener proporciones.
     */
    imageSrc?: string;

    /** 
     * Texto alternativo para la imagen (accesibilidad y SEO).
     * Default: "Imagen". Se usa en el atributo <img alt>.
     */
    imageAlt?: string;

    /** 
     * Icono opcional renderizado a la izquierda del título en un contenedor flex.
     * Puede ser cualquier elemento React (lucide-react, componente custom, SVG, etc).
     * Hereda el color del título (titleColor) automáticamente.
     */
    icon?: ReactNode;

    // --- PERSONALIZACIÓN DE COLORES (Clases Tailwind) ---

    /** 
     * Clase de fondo para el contenedor principal.
     * Ejemplos: 'bg-blue-700', 'bg-gradient-to-br from-blue-600 to-blue-900', 'bg-slate-50'.
     * Default: '' (sin fondo, hereda del padre).
     */
    bgColor?: string;

    /** 
     * Clase de color para el título.
     * Ejemplos: 'text-white', 'text-slate-800', 'text-blue-600'.
     * Default: '' (hereda del padre).
     */
    titleColor?: string;

    /** 
     * Clase de color para el subtítulo.
     * Ejemplos: 'text-blue-100', 'text-slate-600', 'text-gray-400'.
     * Default: '' (hereda del padre).
     */
    subtitleColor?: string;

    /** 
     * Clase de color para la descripción.
     * Ejemplos: 'text-gray-600', 'text-slate-500', 'text-blue-200'.
     * Default: '' (hereda del padre).
     */
    descriptionColor?: string;

    // --- ESTRUCTURA Y ESPACIADO ---

    /** 
     * Alineación del contenido y dirección del layout.
     * - 'left': Texto a la izquierda, imagen a la derecha (default). En móvil: columna.
     * - 'center': Todo apilado verticalmente, centrado. Útil para secciones informativas.
     * - 'right': Texto a la derecha, imagen a la izquierda. En móvil: columna.
     * Default: 'left'.
     */
    align?: 'left' | 'center' | 'right';

    /** 
     * Altura mínima del bloque de imagen.
     * Ejemplos: 'h-96', 'h-screen', 'min-h-[500px]'.
     * Default: '' (altura según contenido de imagen).
     * Nota: El contenedor flex justifica verticalmente items-center.
     */
    imageMinHeight?: string;

    /** 
     * Padding interno del bloque de texto.
     * Ejemplos: 'p-8', 'p-8 md:p-16 lg:p-32', 'px-6 py-12'.
     * Default: 'p-8 md:p-16'. Se recomienda usar padding responsivo (con md:, lg:).
     */
    textPadding?: string;

    /** 
     * Clases Tailwind adicionales para el contenedor externo (<header>).
     * Útil para añadir bordes, sombras, o modificar overflow.
     * Default: '' (solo overflow-hidden se añade siempre).
     */
    containerClass?: string;

    /** 
     * Tamaño responsivo del título.
     * Ejemplos: 'text-2xl md:text-4xl', 'text-4xl md:text-6xl lg:text-7xl'.
     * Default: 'text-2xl md:text-4xl'.
     * Nota: El título siempre tiene leading-[1.1] para compresión visual.
     */
    titleSize?: string;

    /** 
     * Tamaño responsivo de la descripción.
     * Ejemplos: 'text-base md:text-lg', 'text-sm md:text-base lg:text-lg'.
     * Default: 'text-sm md:text-base'.
     * Nota: Se aplica también al subtítulo si está presente.
     */
    descriptionSize?: string;
}

/**
 * Mapeo de alineación a clases Tailwind para la dirección del contenedor flex.
 * 
 * LÓGICA:
 * - En móvil: siempre 'flex-col' para apilar verticalmente independiente de align.
 * - En desktop (md:): la clase específica toma efecto.
 *   - 'left': md:flex-row (texto + imagen izq/der normal)
 *   - 'center': flex-col (sin cambio en desktop, sigue apilado)
 *   - 'right': md:flex-row-reverse (invierte orden para imagen a la izquierda)
 * 
 * TIPO: Record<'left' | 'center' | 'right', string> asegura type-safety de keys.
 */
const DIRECTION_MAP: Record<'left' | 'center' | 'right', string> = {
    left: 'md:flex-row',          // Texto izquierda, imagen derecha en desktop
    center: 'flex-col',            // Siempre apilado verticalmente
    right: 'md:flex-row-reverse'   // Texto derecha, imagen izquierda en desktop (orden invertido)
};

/**
 * Mapeo de alineación a clases para el posicionamiento del bloque de texto.
 * 
 * LÓGICA:
 * Controlamos dos aspectos con dos clases Tailwind:
 * 1. 'items-start/center/end': Alineación vertical del contenedor flex interno (título + descripción).
 * 2. 'text-left/center/right': Alineación horizontal del texto (importante para lectores de pantalla).
 * 
 * RAZÓN: En 'right', el texto no se alinea a la derecha automáticamente solo porque
 * el contenedor esté a la derecha en el layout. Deben forzarse ambas alineaciones.
 * 
 * TIPO: Record asegura que align sea exhaustivo (no hay undefined cases).
 */
const ITEMS_ALIGN: Record<'left' | 'center' | 'right', string> = {
    left: 'items-start text-left',      // Arriba a la izquierda
    center: 'items-center text-center', // Centrado
    right: 'items-end text-right'       // Abajo a la derecha (verdadera alineación derecha)
};

/**
 * Componente encabezado flexible y reutilizable para múltiples contextos visuales.
 * 
 * ARQUITECTURA:
 * El componente renderiza un <header> que contiene un layout flexible:
 * - Bloque de TEXTO: Contiene título, subtítulo e icono en un sub-flex para alineación.
 * - Bloque de IMAGEN: Renderiza solo si imageSrc está definido (renderizado condicional).
 * 
 * PATRONES APLICADOS:
 * 1. Composición de clases Tailwind: Concatenación segura de strings sin conflictos.
 *    Las clases se aplican por orden: utilidades base → variantes → sobrescrituras personalizadas.
 * 2. Alineación responsiva: Usa maps de constantes en lugar de condicionales,
 *    mejorando mantenibilidad y evitando bugs de alineación.
 * 3. Renderizado condicional: Imagen solo si imageSrc; descripción solo si description.
 *    Evita renderizar elementos vacíos que rompan layouts.
 * 
 * CASOS DE USO:
 * - Secciones hero (landing page principal con imagen grande)
 * - Testimonios (con foto de usuario y alineación alternada)
 * - Características (features sin imagen, solo texto centrado)
 * - Secciones informativas (con imagen lateral y alineación flexible)
 * 
 * @component
 * @example
 * // Hero simple con imagen y fondo degradado
 * <GenericHeader
 *   title="Bienvenido a CursosOnline"
 *   description="Aprende de los mejores expertos en tecnología"
 *   imageSrc="/images/hero.jpg"
 *   imageMinHeight="h-96 md:h-screen"
 *   bgColor="bg-gradient-to-br from-blue-600 to-blue-900"
 *   titleColor="text-white"
 *   descriptionColor="text-blue-100"
 *   titleSize="text-4xl md:text-6xl"
 * />
 * 
 * @example
 * // Testimonio con foto a la izquierda (alineación derecha)
 * <GenericHeader
 *   title="María López"
 *   subtitle="Desarrolladora Senior"
 *   description="La mejor inversión que hice en mi carrera. Contenido de alta calidad."
 *   imageSrc="/profiles/maria.jpg"
 *   imageMinHeight="h-80"
 *   align="right"
 *   descriptionColor="text-slate-600"
 * />
 * 
 * @example
 * // Tarjeta de característica centrada, sin imagen
 * <GenericHeader
 *   title="Aprendizaje Personalizado"
 *   icon={<Lightbulb size={32} className="text-blue-600" />}
 *   description="Algoritmo recomendador basado en IA que se adapta a tu ritmo"
 *   align="center"
 *   titleColor="text-blue-600"
 *   descriptionColor="text-slate-600"
 *   containerClass="bg-white rounded-lg shadow-md p-4"
 * />
 * 
 * @param {GenericHeaderProps} props - Props del componente
 * @returns {JSX.Element} Elemento <header> con layout flexible
 */
const GenericHeader = ({
    title,
    subtitle,
    description,
    imageSrc,
    imageAlt = 'Imagen',
    icon,
    bgColor = '',
    titleColor = '',
    subtitleColor = '',
    descriptionColor = '',
    align = 'left',
    imageMinHeight = '',
    textPadding = 'p-8 md:p-16',
    containerClass = '',
    titleSize = 'text-2xl md:text-4xl',
    descriptionSize = 'text-sm md:text-base'
}: GenericHeaderProps) => {
    return (
        <header className={`w-full overflow-hidden ${bgColor} ${containerClass}`}>
            {/* 
                Contenedor principal con dirección flexible según prop align.
                - itemsStretch: asegura que los hijos (texto e imagen) ocupen altura completa.
                - DIRECTION_MAP[align]: define flex-row, flex-col, o flex-row-reverse según alineación.
                - overflow-hidden en el header previene que contenido desbordado rebase bordes.
            */}
            <div className={`flex flex-col ${DIRECTION_MAP[align]} items-stretch w-full`}>

                {/* 
                    SECCIÓN TEXTO: Contiene título, subtítulo, descripción e icono.
                    - flex-1: ocupa espacio disponible en dirección principal del flex.
                    - justify-center: centra contenido verticalmente (útil si imagen es muy alta).
                    - ITEMS_ALIGN[align]: aplica alineación horizontal y vertical específica.
                    - textPadding: espaciado interno (responsive con md:, lg:).
                */}
                <div className={`flex-1 flex flex-col justify-center ${textPadding} ${ITEMS_ALIGN[align]}`}>
                    {/* 
                        Subtítulo (opcional).
                        - Aparece ANTES del título (orden visual importante).
                        - font-bold + tracking-tight: compresión visual del subtítulo.
                        - descriptionSize: usa mismo tamaño que descripción para consistencia.
                    */}
                    {subtitle && (
                        <span className={`font-bold tracking-tight mb-2 ${descriptionSize} ${subtitleColor}`}>
                            {subtitle}
                        </span>
                    )}

                    {/* 
                        Contenedor del título con icono opcional.
                        - flex gap-4: alinea icono y título horizontalmente con separación.
                        - justify-center solo si align='center' para centrar icono + título.
                    */}
                    <div className={`flex items-center gap-4 ${align === 'center' ? 'justify-center' : ''}`}>
                        {/* 
                            Icono a la izquierda del título (opcional).
                            - Hereda color del título (titleColor) para consistencia visual.
                        */}
                        {icon && <div className={titleColor}>{icon}</div>}
                        
                        {/* 
                            Título principal.
                            - font-black: máximo peso de fuente para impacto.
                            - leading-[1.1]: línea-height comprimida (1.1 = 110%) para títulos impactantes.
                            - titleSize: tamaño responsivo (ej: text-4xl md:text-6xl).
                        */}
                        <h1 className={`font-black leading-[1.1] ${titleSize} ${titleColor}`}>
                            {title}
                        </h1>
                    </div>

                    {/* 
                        Descripción (opcional).
                        - Renderizado condicional: solo si description existe.
                        - mt-4: margen superior para separar del título.
                        - font-medium + leading-relaxed: legibilidad óptima para párrafos largos.
                        - descriptionSize: tamaño responsivo (por defecto text-sm md:text-base).
                    */}
                    {description && (
                        <div className={`mt-4 font-medium leading-relaxed ${descriptionColor} ${descriptionSize}`}>
                            {description}
                        </div>
                    )}
                </div>

                {/* 
                    SECCIÓN IMAGEN: Renderiza solo si imageSrc está definido.
                    - Renderizado condicional previene crear divs vacíos que rompan layout.
                    - flex-1: ocupa espacio disponible en dirección principal.
                    - flex items-center justify-center: centra imagen dentro del contenedor.
                    - bg-slate-50: fondo neutro para placeholder si imagen falla (low-contrast).
                    - imageMinHeight: altura mínima desde prop (ej: h-96, h-screen).
                    
                    NOTA: object-cover mantiene proporciones de imagen pero rellena contenedor.
                    Si se desea letterboxing (negro a los lados), usar object-contain en su lugar.
                */}
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



