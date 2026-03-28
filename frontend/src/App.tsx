import Navbar from "./components/navbar/Navbar.tsx";
import GenericHeader from './components/UI/genericHeader/GenericHeader.tsx';
import { Lightbulb, BarChart3, BookOpen, BellRing } from 'lucide-react';

function App() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <main >
        <GenericHeader
          title="COLE"
          subtitle="Cursos OnLine Educativos"
          description="Tu plataforma de aprendizaje personalizada, para descubrir cursos adaptados a tus intereses y necesidades."
          imageSrc="/glasses-with-pile-books.jpg"
          imageAlt="Banner"
          bgColor="bg-blue-800"
          subtitleColor="text-white"
          descriptionColor="text-white"
          align="left"
          textPadding="p-10 md:p-32"
          titleSize="text-4xl md:text-7xl lg:text-8xl"
          descriptionSize="text-lg md:text-2xl"
          imageMinHeight="min-h-[600px]"
        />

        <div className="grid grid-cols-1 md:grid-cols-4">
          <GenericHeader
            title="Recomendaciones Personalizadas"
            description="Descubre cursos adaptados a tus intereses y necesidades, gracias a nuestro sistema de recomendaciones impulsado por IA."
            icon={<Lightbulb size={32} className="text-green-600" />}
            bgColor="bg-green-50"
            titleColor="text-green-900"
            descriptionColor="text-black"
            titleSize="text-xl md:text-2xl"
            descriptionSize="text-base md:text-lg"
            textPadding="p-8"
          />
          <GenericHeader
            title="Dashboard de Progreso"
            description="Monitorea tu avance con estadísticas detalladas y visualizaciones claras para mantenerte motivado y enfocado en tus objetivos."
            icon={<BarChart3 size={32} className="text-blue-600" />}
            bgColor="bg-blue-100"
            titleColor="text-blue-900"
            descriptionColor="text-black"
            titleSize="text-xl md:text-2xl"
            descriptionSize="text-base md:text-lg"
            textPadding="p-8"
          />
          <GenericHeader
            title="Biblioteca de Cursos"
            description="Accede a una amplia variedad de cursos en diferentes categorías, desde tecnología hasta arte, todos diseñados para potenciar tu aprendizaje."
            icon={<BookOpen size={32} className="text-purple-600" />}
            bgColor="bg-purple-100"
            titleColor="text-purple-900"
            descriptionColor="text-black"
            titleSize="text-xl md:text-2xl"
            descriptionSize="text-base md:text-lg"
            textPadding="p-8"
          />
          <GenericHeader
            title="Notificaciones Inteligentes"
            description="Recibe alertas personalizadas sobre nuevos cursos, promociones y actualizaciones relevantes para ti, directamente en tu panel."
            icon={<BellRing size={32} className="text-red-600" />}
            bgColor="bg-red-100"
            titleColor="text-red-900"
            descriptionColor="text-black"
            titleSize="text-xl md:text-2xl"
            descriptionSize="text-base md:text-lg"
            textPadding="p-8"
          />
        </div>
      </main>

      <footer className="py-10 text-center text-slate-400 text-sm">
        &copy; 2026 Proyecto TFG
      </footer>
    </div>
  );
}

export default App;
