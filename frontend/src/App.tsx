import Navbar from "./components/navbar/Navbar.tsx";
import GenericHeader from './components/UI/genericHeader/GenericHeader.tsx';

function App() {
  return (
    <div className="min-h-screen bg-slate-50">

      <Navbar />

      <main >
        <GenericHeader
          title="COLE"
          subtitle="Cursos OnLine Educativos"
          description="Bienvenido a COLE, tu plataforma de gestión de cursos online con recomendaciones personalizadas. Explora, aprende y crece con nosotros."
          imageSrc="/glasses-with-pile-books.jpg"
          imageAlt="Banner"
          bgColor="bg-blue-800"
          align="left"
          textPadding="p-10 md:p-32" // Mucho espacio para que no choque el texto
          imageMinHeight="min-h-[600px]"
        />
      </main>

      <footer className="py-10 text-center text-slate-400 text-sm">
        &copy; 2026 Proyecto TFG
      </footer>
    </div>
  );
}

export default App;
