import type { ReactNode } from "react";
import { Lightbulb, BarChart3, BookOpen, BellRing } from "lucide-react";
import GenericHeader from "./ui/genericHeader/GenericHeader";

interface FeatureItem {
    /** Título del beneficio mostrado. */
    title: string;
    /** Descripción del beneficio. */
    description: string;
    /** Icono representativo del beneficio. */
    icon: ReactNode;
    /** Clases Tailwind para el fondo del bloque. */
    bgColor: string;
    /** Clases Tailwind para el color del título. */
    titleColor: string;
    /** Clases Tailwind para el color de la descripción. */
    descriptionColor: string;
    /** Clases Tailwind para el tamaño del título. */
    titleSize: string;
    /** Clases Tailwind para el tamaño de la descripción. */
    descriptionSize: string;
    /** Clases Tailwind para el padding interno. */
    textPadding: string;
}

const featuresData: FeatureItem[] = [
    {
        title: "Recomendaciones Personalizadas",
        description: "Descubre cursos adaptados a tus intereses y necesidades, gracias a nuestro sistema de recomendaciones.",
        icon: <Lightbulb size={32} className="text-green-600" />,
        bgColor: "bg-green-50",
        titleColor: "text-green-900",
        descriptionColor: "text-black",
        titleSize: "text-xl md:text-2xl",
        descriptionSize: "text-base md:text-lg",
        textPadding: "p-8"
    },
    {
        title: "Dashboard de Progreso",
        description: "Monitorea tu avance con estadísticas detalladas y visualizaciones claras para mantenerte motivado y enfocado en tus objetivos.",
        icon: <BarChart3 size={32} className="text-blue-600" />,
        bgColor: "bg-blue-100",
        titleColor: "text-blue-900",
        descriptionColor: "text-black",
        titleSize: "text-xl md:text-2xl",
        descriptionSize: "text-base md:text-lg",
        textPadding: "p-8"
    },
    {
        title: "Biblioteca de Cursos",
        description: "Accede a una amplia variedad de cursos en diferentes categorías, desde tecnología hasta arte, todos diseñados para potenciar tu aprendizaje.",
        icon: <BookOpen size={32} className="text-purple-600" />,
        bgColor: "bg-purple-100",
        titleColor: "text-purple-900",
        descriptionColor: "text-black",
        titleSize: "text-xl md:text-2xl",
        descriptionSize: "text-base md:text-lg",
        textPadding: "p-8"
    },
    {
        title: "Notificaciones Inteligentes",
        description: "Recibe alertas personalizadas sobre nuevos cursos, promociones y actualizaciones relevantes para ti, directamente en tu panel.",
        icon: <BellRing size={32} className="text-red-600" />,
        bgColor: "bg-red-100",
        titleColor: "text-red-900",
        descriptionColor: "text-black",
        titleSize: "text-xl md:text-2xl",
        descriptionSize: "text-base md:text-lg",
        textPadding: "p-8"
    }
];

/**
 * Sección de funcionalidades de la plataforma.
 * Renderiza un conjunto de cards con icono, título y descripción.
 */
const Features = () => {
    return (
        <section className="grid grid-cols-1 md:grid-cols-4 border-b border-gray-200 py-20 px-4 gap-8">
            {featuresData.map((item) => (
                <GenericHeader key={item.title} {...item} />
            ))}
        </section>
    );
};

export default Features;