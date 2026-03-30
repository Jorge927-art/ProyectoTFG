import GenericHeader from "./UI/genericHeader/GenericHeader";

const Hero = () => {
    return (
        <GenericHeader
            title="COLE"
            subtitle="Cursos OnLine Educativos"
            description="Tu plataforma de aprendizaje personalizada, para descubrir cursos adaptados a tus intereses y necesidades."
            imageSrc="/glasses-with-pile-books.png"
            imageAlt="Banner"
            bgColor="bg-blue-800"
            subtitleColor="text-white"
            descriptionColor="text-white"
            textPadding="p-8 md:p-16"
            titleSize="text-4xl md:text-7xl lg:text-8xl"
            descriptionSize="text-lg md:text-2xl"
            imageMinHeight="min-h-[300px] md:min-h-[450px]"
        />
    );
};

export default Hero;