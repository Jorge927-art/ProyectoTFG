import GenericHeader from "./ui/genericHeader/GenericHeader";

interface HeroContent {
    /** Título principal del hero. */
    title: string;
    /** Subtítulo descriptivo de la plataforma. */
    subtitle: string;
    /** Texto principal que comunica el valor del servicio. */
    description: string;
    /** Ruta de la imagen de cabecera. */
    imageSrc: string;
    /** Texto alternativo para la imagen. */
    imageAlt: string;
    /** Clase Tailwind para el fondo del hero. */
    bgColor: string;
    /** Clase Tailwind para el color del título. */
    titleColor: string;
    /** Clase Tailwind para el color del subtítulo. */
    subtitleColor: string;
    /** Clase Tailwind para el color de la descripción. */
    descriptionColor: string;
    /** Clase Tailwind para el padding interno del contenido. */
    textPadding: string;
    /** Clase Tailwind para el tamaño del título. */
    titleSize: string;
    /** Clase Tailwind para el tamaño de la descripción. */
    descriptionSize: string;
    /** Clase Tailwind para la altura mínima de la imagen. */
    imageMinHeight: string;
}

const heroContent: HeroContent = {
    title: "COLE",
    subtitle: "Cursos OnLine Educativos",
    description:
        "Tu plataforma de aprendizaje personalizada, para descubrir cursos adaptados a tus intereses y necesidades.",
    imageSrc: "/glasses-with-pile-books.png",
    imageAlt: "Banner principal de COLE",
    bgColor: "bg-blue-800",
    titleColor: "text-blue-300",
    subtitleColor: "text-white",
    descriptionColor: "text-white",
    textPadding: "p-8 md:p-16",
    titleSize: "text-4xl md:text-7xl lg:text-8xl",
    descriptionSize: "text-lg md:text-2xl",
    imageMinHeight: "min-h-[300px] md:min-h-[450px]",
};

/**
 * Hero principal de la página.
 * Renderiza una cabecera de bienvenida con imagen y texto promocional.
 */
const Hero = () => {
    return <GenericHeader {...heroContent} />;
};

export default Hero;