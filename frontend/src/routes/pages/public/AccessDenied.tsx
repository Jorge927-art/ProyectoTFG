import { useNavigate } from "react-router-dom";
import GenericHeader from "@/components/ui/genericHeader/GenericHeader"; // Ajusta la ruta a tu GenericHeader
import GenericButton from "@/components/ui/genericButton/GenericButton"; // Ajusta la ruta a tu GenericButton

const AccessDenied = () => {
    const navigate = useNavigate();

    return (
        <main className="min-h-screen bg-slate-50 grid place-items-center px-6">
            <section className="max-w-xl w-full bg-white border border-slate-200 rounded-2xl shadow-sm p-8 flex flex-col items-center">

                {/* REFACTORIZACIÓN CORE: Cabecera estructural purificada sin propiedades inválidas [ADR-13] */}
                <GenericHeader
                    title="Acceso denegado"
                    description="Tu usuario está autenticado, pero no tiene los privilegios necesarios para acceder a esta sección."
                    align="center"
                />

                {/* REFACTORIZACIÓN CORE: Uso de componente de acción corporativo [ADR-13] */}
                <GenericButton
                    label="Volver al inicio"
                    variant="primary"
                    onClick={() => navigate("/")}
                />

            </section>
        </main>
    );
};

export default AccessDenied;
