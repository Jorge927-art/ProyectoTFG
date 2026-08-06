import LegalPageLayout from './LegalPageLayout';

const PrivacyPolicyPage = () => {
    return (
        <LegalPageLayout title="Política de privacidad" lastUpdated="06 de agosto de 2026">
            <section>
                <h2>Responsable del tratamiento</h2>
                <p>
                    El responsable del tratamiento de datos es el proyecto académico Gestión de Cursos Online (TFG).
                    Para cualquier consulta sobre privacidad puedes contactar en contacto@cursosonline.com.
                </p>
            </section>

            <section>
                <h2>Datos personales que tratamos</h2>
                <p>Dependiendo de tu uso de la plataforma, podemos tratar:</p>
                <ul>
                    <li>Datos de identificación y contacto: nombre de usuario y correo electrónico.</li>
                    <li>Datos de cuenta: rol de acceso (alumno, profesor o administrador).</li>
                    <li>Datos académicos: progreso en cursos, matrículas y evaluaciones.</li>
                    <li>Documentos subidos por usuarios en los módulos de gestión académica.</li>
                </ul>
            </section>

            <section>
                <h2>Finalidad y base legal</h2>
                <p>
                    Usamos estos datos para prestar el servicio educativo, gestionar accesos, mostrar contenidos,
                    evaluar resultados y habilitar la comunicación académica entre perfiles. La base legal principal
                    es la ejecución del servicio solicitado por el usuario y, cuando proceda, el cumplimiento de
                    obligaciones aplicables en el marco del RGPD y la LOPDGDD.
                </p>
            </section>

            <section>
                <h2>Conservación de los datos</h2>
                <p>
                    Conservamos los datos durante el tiempo necesario para mantener la cuenta activa y cumplir la
                    finalidad formativa de la plataforma. Cuando los datos dejan de ser necesarios, se eliminan o se
                    anonimizan de forma segura, salvo obligación legal de conservación.
                </p>
            </section>

            <section>
                <h2>Derechos de las personas usuarias (ARCO-POL)</h2>
                <p>
                    Puedes ejercer tus derechos de acceso, rectificación, cancelación, oposición, portabilidad y
                    limitación del tratamiento escribiendo a contacto@cursosonline.com e indicando el derecho que
                    deseas ejercer.
                </p>
            </section>

            <section>
                <h2>Cesión de datos y encargados del tratamiento</h2>
                <p>
                    No se ceden datos personales a terceros con fines comerciales. El tratamiento puede apoyarse en
                    proveedores técnicos estrictamente necesarios para operar la aplicación (infraestructura o
                    alojamiento), bajo obligaciones de confidencialidad y seguridad.
                </p>
            </section>

            <section>
                <h2>Seguridad de la información</h2>
                <p>
                    Aplicamos medidas técnicas y organizativas razonables para proteger los datos personales, incluyendo
                    controles de acceso por rol, autenticación mediante tokens y limitación de acceso a recursos
                    protegidos.
                </p>
            </section>
        </LegalPageLayout>
    );
};

export default PrivacyPolicyPage;
