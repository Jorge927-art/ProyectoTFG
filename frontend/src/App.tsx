import Navbar from "./components/navbar/Navbar.tsx";
import GenericHeader from './components/UI/GenericHeader.tsx';

function App(){
  return (
    <div className="min-h-screen bg-slate-50">

      <Navbar/>

      <main className="pt-24 px-6 max-w-7xl mx-auto">
          <header className="text-center pt-0 pb-10">
            <h1 className="text-4xl font-bold text-blue-500 mb-2 mt-0">
              COLE
            </h1>
          </header>

          <GenericHeader
              title="Estudios en linea" 
              subtitle="bla,bla,bla......"
              imageSrc="/futuristic-cyborg-with-robotic-arm-stands-illuminated-night-generated-by-ai.jpg"
              imageAlt="Imagen de desarrollo web"
              />
              
        </main>

        <footer className="py-10 text-center text-slate-400 text-sm">
          &copy; 2026 Proyecto TFG
        </footer>
      </div>
  );
}

export default App;
