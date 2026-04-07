import GenericHeader from "./ui/genericHeader/GenericHeader";

interface Testimony {
    /** Nombre completo del usuario que aporta el testimonio. */
    name: string;
    /** Cargo o perfil profesional del usuario. */
    role: string;
    /** Texto del testimonio que describe la experiencia del usuario. */
    testimony: string;
    /** Ruta de la imagen asociada al usuario. */
    image: string;
    /** Texto alternativo para la imagen del usuario. */
    imageAlt: string;
}

/**
 * Testimonios de ejemplo renderizados de forma estática.
 * La definición fuera del componente evita recrear el arreglo en cada render.
 */
const testimonials: Testimony[] = [
    {
        name: "María López",
        role: "Estudiante de Diseño Gráfico",
        testimony:
            "Gracias a COLE, pude descubrir cursos que se adaptaban perfectamente a mis intereses. La plataforma me recomendó un curso de diseño UX que me ayudó a conseguir mi primer trabajo en una agencia de diseño.",
        image: "/pexels-pavel-danilyuk-7675023.jpg",
        imageAlt: "Foto de María López",
    },
    {
        name: "Carlos Gómez",
        role: "Ingeniero de Software",
        testimony:
            "Los cursos de COLE me han ayudado a mejorar mis habilidades técnicas y a mantenerme actualizado con las últimas tendencias en desarrollo de software.",
        image: "/headway-5QgIuuBxKwM-unsplash.jpg",
        imageAlt: "Foto de Carlos Gómez",
    },
    {
        name: "Ana Martínez",
        role: "Profesora de Educación Primaria",
        testimony:
            "Como docente, COLE me ha sido de gran ayuda para encontrar cursos que me permiten mejorar mis métodos de enseñanza y ofrecer una educación más innovadora a mis alumnos.",
        image: "/pexels-cottonbro-4769486.png",
        imageAlt: "Foto de Ana Martínez",
    },
];

/**
 * Sección de testimonios de usuarios.
 * Renderiza tarjetas con texto e imagen para cada testimonio.
 */
const Testimonials = () => {
    return (
        <section className="py-20 flex flex-col gap-16 px-4">
            <h2 className="text-3xl md:text-5xl font-bold text-center text-gray-800">
                Lo que dicen nuestros usuarios
            </h2>
            {testimonials.map((testimony, index) => (
                <GenericHeader
                    key={testimony.name}
                    title={testimony.name}
                    subtitle={testimony.role}
                    description={testimony.testimony}
                    imageSrc={testimony.image}
                    imageAlt={testimony.imageAlt}
                    align={index % 2 === 0 ? "left" : "right"}
                    // Alternamos la alineación para aportar variedad visual en la sección.
                    bgColor="bg-white"
                    titleColor="text-gray-900"
                    subtitleColor="text-gray-700"
                    descriptionColor="text-gray-600"
                    titleSize="text-3xl md:text-4xl"
                    descriptionSize="text-base md:text-lg"
                    textPadding="p-10 md:p-24"
                    imageMinHeight="min-h-[300px] md:min-h-[400px]"
                    containerClass="border-b border-gray-200 rounded-xl shadow-sm overflow-hidden"
                />
            ))}
        </section>
    );
};

export default Testimonials;