import LegalPageLayout from './LegalPageLayout';

const CookiesPage = () => {
    return (
        <LegalPageLayout title="Política de cookies" lastUpdated="06 de agosto de 2026">
            <section>
                <h2>Qué son las cookies</h2>
                <p>
                    Las cookies son pequeños archivos que el navegador guarda para recordar información de navegación o
                    preferencias técnicas durante futuras visitas.
                </p>
            </section>

            <section>
                <h2>Tecnologías propias utilizadas</h2>
                <p>
                    La autenticación de la SPA se basa principalmente en tokens de acceso y refresco almacenados en
                    localStorage del navegador, junto con cabeceras Authorization de tipo Bearer en las peticiones API.
                    Este flujo no depende de cookies de autenticación propias para mantener sesión en el cliente.
                </p>
            </section>

            <section>
                <h2>Cookies de terceros</h2>
                <p>
                    Actualmente la plataforma no integra cookies de terceros con finalidad publicitaria o de perfilado.
                    Si en el futuro se incorporan servicios externos que usen cookies, esta política se actualizará.
                </p>
            </section>

            <section>
                <h2>Cómo gestionar o desactivar cookies</h2>
                <p>
                    Puedes permitir, bloquear o eliminar cookies desde la configuración de tu navegador. Ten en cuenta
                    que desactivar ciertas cookies técnicas puede afectar al funcionamiento de algunas funciones web.
                </p>
            </section>
        </LegalPageLayout>
    );
};

export default CookiesPage;
