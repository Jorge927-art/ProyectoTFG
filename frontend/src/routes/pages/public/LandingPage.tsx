import { MainNavbar } from "@/components/navbar";
import Hero from "@/components/Hero";
import Features from "@/components/Features";
import Testimonials from "@/components/Testimonials";
import Footer from "@/components/ui/footer/Footer";

const LandingPage = () => {
    return (
        <div className="min-h-screen bg-slate-50 font-sans">
            <MainNavbar />
            <main>
                <Hero />
                <div id="features">
                    <Features />
                </div>
                <div id="testimonials">
                    <Testimonials />
                </div>
            </main>
            <Footer />
        </div>
    );
};

export default LandingPage;