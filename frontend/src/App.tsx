import Navbar from "./components/navbar/Navbar.tsx";
import GenericHeader from './components/UI/genericHeader/GenericHeader.tsx';
import { Lightbulb, BarChart3, BookOpen, BellRing } from 'lucide-react';

function App() {

  /**
   * Datos de características (pueden ser obtenidos de una API en un proyecto real)
   * Se incluyen campos para personalización de colores, tamaños y estructura, que se pasan al 
   * componente GenericHeader para máxima flexibilidad.
   */
  const features = [
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
   * Testimonios de usuarios (pueden ser obtenidos de una API en un proyecto real)
   * Se incluyen campos para personalización de colores, tamaños y estructura, que se pasan al 
   * componente GenericHeader para máxima flexibilidad.
   */
  const testimonies = [
    {
      name: "María López",
      role: "Estudiante de Diseño Gráfico",
      testimony: "Gracias a COLE, pude descubrir cursos que se adaptaban perfectamente a mis intereses. La plataforma me recomendó un curso de diseño UX que me ayudó a conseguir mi primer trabajo en una agencia de diseño.",
      Image: "/pexels-pavel-danilyuk-7675023.jpg",
    },
    {
      name: "Carlos Gómez",
      role: "Desarrollador Web",
      testimony: "COLE me ha permitido seguir aprendiendo y mejorando mis habilidades en desarrollo web. Las recomendaciones personalizadas me han ayudado a encontrar cursos avanzados que se ajustan a mi nivel y necesidades.",
      Image: "/headway-5QgIuuBxKwM-unsplash.jpg",
    },
    {
      name: "Ana Martínez",
      role: "Profesora de Educación Primaria",
      testimony: "Como docente, COLE me ha sido de gran ayuda para encontrar cursos que me permiten mejorar mis métodos de enseñanza y ofrecer una educación más innovadora a mis alumnos.",
      Image: "/pexels-cottonbro-4769486.png",
    }
  ];


  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <Navbar />

      <main >
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

        <section className="grid grid-cols-1 md:grid-cols-4 border-b border-gray-200 py-20 px-4 gap-8">
          {features.map((item, index) => (
            <GenericHeader
              key={index}
              {...item}

            />
          ))}
        </section>
        <section className="py-20 flex flex-col gap-16 px-4">
          <h2 className="text-3xl md:text-5xl font-bold text-center text-gray-800">
            Lo que dicen nuestros usuarios
          </h2>
          {testimonies.map((t, index) => (
            <GenericHeader
              key={index}
              title={t.name}
              subtitle={t.role}
              description={t.testimony}
              imageSrc={t.Image}
              imageAlt={`Foto de ${t.name}`}
              align={index % 2 === 0 ? 'left' : 'right'} // Alternamos alineación
              // Personalización de estilos para testimonios
              bgColor="bg-white"
              titleColor="text-gray-900"
              subtitleColor="text-gray-700"
              descriptionColor="text-gray-600"
              // Tamaños y espaciados específicos para testimonios
              titleSize="text-3xl md:text-4xl"
              descriptionSize="text-base md:text-lg"
              textPadding="p-10 md:p-24"
              imageMinHeight="min-h-[300px] md:min-h-full"
              containerClass="border-b border-gray-200 rounded-lg shadow-md"
            />
          ))}
        </section>
      </main>

      <footer className="py-10 text-center text-slate-400 text-sm">
        &copy; 2026 Proyecto TFG
      </footer>
    </div>
  );
}

export default App;
