import { MainNavbar } from "@/components/navbar";
import Hero from "@/components/Hero";
import Features from "@/components/Features";
import Testimonials from "@/components/Testimonials";

function App() {
  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <MainNavbar />
      <main>
        <Hero />
        <Features />
        <Testimonials />
      </main>
      <footer className="py-10 text-center text-slate-400 text-sm">
        &copy; 2026 Proyecto TFG
      </footer>
    </div>
  );
}

export default App;
