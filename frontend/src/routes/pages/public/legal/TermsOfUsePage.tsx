import LegalPageLayout from './LegalPageLayout';

const TermsOfUsePage = () => {
    return (
        <LegalPageLayout title="Términos de uso" lastUpdated="06 de agosto de 2026">
            <section>
                <h2>Objeto y ámbito de aplicación</h2>
                <p>
                    Estos términos regulan el acceso y uso de la plataforma Gestión de Cursos Online, orientada a la
                    gestión de aprendizaje con perfiles de alumno, profesor y administrador.
                </p>
            </section>

            <section>
                <h2>Condiciones de registro y cuenta</h2>
                <p>
                    Para usar funcionalidades protegidas debes disponer de una cuenta válida y mantener la
                    confidencialidad de tus credenciales. El uso de la cuenta es personal e intransferible.
                </p>
            </section>

            <section>
                <h2>Obligaciones de uso</h2>
                <p>La persona usuaria se compromete a:</p>
                <ul>
                    <li>Usar la plataforma de forma lícita y respetuosa.</li>
                    <li>No intentar acceder a áreas o datos sin autorización.</li>
                    <li>No subir documentos o contenidos que vulneren derechos de terceros.</li>
                    <li>Utilizar evaluaciones y herramientas académicas conforme al propósito formativo del sistema.</li>
                </ul>
            </section>

            <section>
                <h2>Propiedad intelectual</h2>
                <p>
                    Los contenidos formativos, recursos didácticos y elementos del sistema están protegidos por la
                    normativa de propiedad intelectual. No se autoriza su reproducción o distribución fuera de los usos
                    permitidos en la propia plataforma.
                </p>
            </section>

            <section>
                <h2>Limitación de responsabilidad</h2>
                <p>
                    Esta aplicación forma parte de un proyecto académico (TFG) y se proporciona con finalidad educativa.
                    No se ofrece garantía comercial ni compromiso de disponibilidad continua equivalente a un servicio
                    empresarial de producción.
                </p>
            </section>

            <section>
                <h2>Modificación de los términos</h2>
                <p>
                    Estos términos pueden actualizarse para reflejar cambios funcionales, normativos o de seguridad. La
                    versión vigente será la publicada en esta página.
                </p>
            </section>

            <section>
                <h2>Legislación aplicable y jurisdicción</h2>
                <p>
                    La relación de uso de la plataforma se interpreta conforme a la legislación española y europea
                    aplicable. En caso de conflicto, se intentará una resolución amistosa previa.
                </p>
            </section>
        </LegalPageLayout>
    );
};

export default TermsOfUsePage;
