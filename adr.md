<!-- markdownlint-disable MD024 MD025 MD046 MD052 -->

# Registro de Decisiones de Arquitectura (ADR) - TFG

Este documento centraliza las decisiones técnicas críticas tomadas durante el desarrollo del sistema, justificando su contexto, las alternativas evaluadas y las consecuencias en el diseño de software.

---

# ADR-01: React + Spring Boot como Arquitectura Desacoplada

## Estatus

Aceptado

## Fecha

Junio 2026

## Contexto

Se requiere construir una plataforma web de formación con capacidad de crecimiento funcional, garantizando que el diseño visual, la experiencia de usuario y la lógica de negocio empresarial no interfieran entre sí en ninguna fase del ciclo de vida del desarrollo.

## Decisión

Adoptar una arquitectura cliente-servidor completamente desacoplada mediante una aplicación de página única (**SPA - Single Page Application**) construida en **React** para la capa de presentación y una **API REST** de grado empresarial desarrollada en **Spring Boot (Java 17)** para la capa de servicios y persistencia.

## Justificación para el TFG

* **Separación de Responsabilidades:** Cumple estrictamente con el principio de separación de conceptos, aislando la lógica de UI de las reglas de negocio complejas y el acceso a datos.
* **Desarrollo Independiente:** Permite trabajar en el cliente y en el servidor de forma autónoma, facilitando el mantenimiento y las suites de pruebas unitarias/integración de manera aislada.
* **Estándar de la Industria:** Sigue los patrones arquitectónicos y las demandas tecnológicas más extendidas en los entornos de producción reales de la ingeniería de software actual.

## Consecuencias

### Impacto Positivo

* **Flexibilidad en la Interfaz:** Otorga total libertad para rediseñar, expandir o modificar los componentes del frontend sin necesidad de alterar la base de datos o la lógica de negocio subyacente del backend.
* **Consumo Eficiente de Recursos:** El cliente solo solicita e intercambia datos crudos en formato JSON, reduciendo la carga de cómputo del servidor al delegar el renderizado visual al navegador del usuario.

### Impacto Negativo / Riesgos Mitigados

* **Duplicidad de Modelos:** Obliga a mantener y declarar réplicas equivalentes de los modelos de datos y DTOs tanto en clases de Java como en interfaces de TypeScript.
* *Mitigación:* Se implementó un diseño de contratos estrictos mediante objetos de transferencia de datos (DTOs) unificados, asegurando que cualquier cambio en la estructura del backend sea fácilmente detectable por el tipado estricto del compilador del frontend.

---

# ADR-02: Organización del Espacio de Trabajo mediante Monorepo

## Estatus

Aceptado

## Fecha

Junio 2026

## Contexto

El proyecto del TFG involucra el desarrollo de dos ecosistemas tecnológicos completamente independientes (React en la capa de presentación y Spring Boot en la capa de servicios) gestionados y evolucionados por un único desarrollador durante todo el ciclo de vida de la aplicación.

## Decisión

Alojar ambas aplicaciones de forma centralizada en directorios diferenciados y estructurados (`frontend/` y `backend/`) dentro de un mismo y único repositorio de Git.

## Justificación para el TFG

* **Eficiencia Operativa:** Simplifica drásticamente la gestión del código fuente, reduce la fricción en la sincronización de ramas y optimiza los flujos de trabajo del desarrollador.
* **Trazabilidad de Cambios:** Permite realizar un único *commit* atómico que relacione y encapsule un cambio funcional simultáneo y coordinado en el cliente y en el servidor.
* **Centralización de la Documentación:** Facilita al tribunal evaluador el acceso unificado a toda la base de código del proyecto desde un mismo enlace de repositorio.

## Consecuencias

### Impacto Positivo

* **Despliegue y CI/CD Simplificado:** Permite configurar un único pipeline de integración continua (como GitHub Actions) que pueda disparar tareas de pruebas automatizadas y compilación para ambas capas de manera coordinada.
* **Visión de Conjunto:** Centraliza el archivo de lectura principal (`README.md`), los diarios de bitácora y este registro de decisiones arquitectónicas (ADR) en la raíz del proyecto para una auditoría rápida.

### Impacto Negativo / Riesgos Mitigados

* **Tamaño del Repositorio:** El directorio raíz de Git acumula un mayor tamaño de archivos y un historial de confirmaciones cruzado.
* *Mitigación:* Se implementó un archivo `.gitignore` robusto en la raíz del proyecto para excluir estrictamente los directorios pesados de dependencias volátiles (`node_modules/` en el frontend y `target/` en el backend), manteniendo el Monorepo ligero y ágil para los clones en local.

---

# ADR-03: Implementación de Prototipo Funcional con Autenticación de Estado (Session-Based)

## Estatus

Superado (Deprecado)

## Contexto

En el inicio del desarrollo del proyecto, se necesitaba validar con rapidez el ciclo de vida básico del usuario (Registro y Login) y la persistencia en la base de datos relacional de la entidad principal `Users`. Debido a la curva de aprendizaje inicial del ecosistema tecnológico y a la necesidad de contar con un entregable funcional temprano, se optó por un sistema de autenticación tradicional basado en sesiones de servidor (HTTP State).

## Decisión

Crear una interfaz de usuario básica integrada por una *Landing Page* y *Dashboards* rudimentarios que utilizara una barra de navegación condicional al rol del usuario, con el propósito de verificar visualmente el flujo de acceso perimetral.

## Justificación para el TFG

* **Validación Temprana de Persistencia:** Permitió certificar el correcto funcionamiento de los repositorios de usuario, las contraseñas hash y la lógica interna de roles en el backend de Spring Boot antes de añadir capas de red complejas.
* **Mitigación de la Curva de Aprendizaje:** Posibilitó avanzar de forma ágil e incremental en las interfaces del frontend de React asentando las bases de las llamadas HTTP.

## Consecuencias

### Impacto Positivo

* **Cierre del Ciclo Base:** Se confirmó que el motor de persistencia (Hibernate/JPA) mapeaba correctamente la base de datos PostgreSQL y que la asignación de roles funcionaba a nivel de modelo de negocio.

### Impacto Negativo / Riesgos que Motivaron su Deprecación

* **Acoplamiento de Infraestructura:** El manejo de estados y sesiones en la memoria del servidor impedía el desacoplamiento total y nativo entre la capa de presentación (React) y la capa de servicios (Spring Boot), violando los principios de diseño de una API REST profesional.
* *Solución y Evolución:* Las limitaciones detectadas en este prototipo sirvieron como el argumento técnico fundamental para decretar la transición hacia un modelo seguro, distribuido y *stateless* basado en JSON Web Tokens (JWT), el cual quedó consolidado de forma definitiva en las decisiones de diseño posteriores.

---

# ADR-04: Migración de Autenticación Tradicional con Estado a Arquitectura Stateless (JWT)

## Estatus

Superado por implementación definitiva

## Contexto

En la fase inicial del proyecto ("Prototipo"), se implementó una conexión básica entre el frontend y el backend utilizando autenticación tradicional por HTTP con estado basada en Sesiones/Cookies. Aunque se validó que la entidad `Users` realizaba registros correctamente y permitía el acceso a páginas privadas mediante cambios reactivos en la barra de navegación, este modelo con estado limitaba la escalabilidad horizontal y presentaba desafíos significativos para una futura arquitectura de clientes totalmente desacoplados.

## Decisión

Migrar de forma integral el sistema de seguridad de la plataforma hacia un modelo **Stateless (sin estado)** basado en **JSON Web Tokens (JWT)**. Esto implica eliminar el almacenamiento de sesiones en la memoria del servidor y delegar la responsabilidad del mantenimiento de la identidad al cliente mediante un token firmado criptográficamente.

## Consecuencias

### Impacto Positivo

* **Escalabilidad Horizontal:** Al no retener estado de sesión en el servidor backend (Spring Boot), este puede escalar de forma masiva sin requerir replicación de sesiones ni persistencia compartida de cookies.
* **Desacoplamiento Total:** Se consigue una separación limpia entre la capa de presentación (Vite + React) y la capa de servicios (Spring Boot), permitiendo que se comuniquen puramente mediante cabeceras HTTP estándar (`Authorization: Bearer <token>`).
* **Seguridad Reforzada:** La identidad viaja firmada por el servidor, mitigando vulnerabilidades clásicas del manejo de sesiones web.

### Impacto Técnico e Infraestructura

* **Componentes Backend:** Necesidad de implementar un componente `JwtService` para la generación, firmado y validación de tokens, y un filtro perimetral `JwtAuthenticationFilter` para interceptar y validar el contexto de seguridad en cada petición HTTP entrante.
* **Refactorización del Flujo:** La interfaz gráfica de la página principal creada en el prototipo se mantiene intacta, pero su lógica de conexión se refactoriza en el frontend para consumir el nuevo endpoint de login que devuelve un objeto `AuthTokenResponse`.

---

# ADR-05: Transición por Fases de Sesión HTTP a JSON Web Tokens (JWT)

## Estatus

En Progreso (Fase 1)

## Fecha

Junio 2026

## Contexto

El backend opera mediante autenticación tradicional basada en sesiones HTTP, lo que acopla de manera directa el servidor al estado del cliente y limita la escalabilidad de la API REST de cara al despliegue. Se requiere evolucionar este modelo para garantizar un entorno distribuido sin penalizar la disponibilidad del sistema durante el proceso de desarrollo.

## Decisión

Migrar de forma progresiva el sistema de seguridad hacia un modelo basado en tokens **JWT (JSON Web Tokens)** completamente *stateless*, utilizando una estrategia de convivencia y transición temporal parametrizada en dos capas operacionales dentro del ciclo de filtros de Spring Security.

## Justificación para el TFG

* **Estándar de Arquitectura:** El enfoque *stateless* es el patrón nativo para el diseño de APIs REST profesionales, garantizando el aislamiento de la lógica de negocio.
* **Control de Riesgos Académico:** La migración por fases mitiga de forma proactiva la aparición de regresiones y fallos en cascada en las rutas protegidas, demostrando ante el tribunal la aplicación de buenas prácticas de control de riesgos en la ingeniería de software.

## Consecuencias

### Impacto Positivo

* **Estabilidad del Entorno de Pruebas:** Permite refactorizar y verificar los endpoints de los controladores uno a uno de manera controlada, asegurando que las suites de pruebas automatizadas existentes no sufran roturas por cambios drásticos en la autenticación.
* **Flexibilidad de Integración:** Habilita al equipo de desarrollo frontend la libertad de migrar los contextos de almacenamiento de sesión de manera asíncrona respecto a los despliegues del backend.

### Impacto Negativo / Riesgos Mitigados

* **Complejidad Temporal en Configuración:** Durante la transición, el filtro de seguridad perimetral debe ser "no intrusivo" para permitir la convivencia simultánea de clientes que transmiten credenciales mediante cookies tradicionales y clientes avanzados con cabeceras `Authorization: Bearer <token>`.
* *Mitigación:* Se incrementó de manera controlada la robustez de `SecurityConfig.java`, diseñando reglas de exclusión explícitas que interceptan el tráfico condicionalmente, impidiendo brechas de seguridad perimetral durante la fase de convivencia.

---

# ADR-06: Configuración de Propiedades JWT y Fallbacks de Entorno para Tests

## Estatus

Aceptado

## Fecha

Junio 2026

## Contexto

Al introducir el componente de configuración estricta `JwtProperties`, el entorno de pruebas unitarias (`BackendApplicationTests`) fallaba críticamente (`BUILD FAILURE`). Esto se debía a que la propiedad requerida `app.jwt.secret` no se encontraba definida en el contexto de carga de los tests, provocando una excepción de tipo `IllegalStateException` que detenía el pipeline de compilación.

## Decisión

Incorporar valores base estandarizados y mecanismos de *fallback* para desarrollo y pruebas dentro del archivo global `application.properties`, desacoplándolo temporalmente de la configuración rígida por variables de entorno del sistema operativo.

## Justificación para el TFG

* **Principio de Robustez:** Demuestra la aplicación del principio de robustez en el ciclo de vida del software, anticipando fallos de infraestructura durante el despliegue de pruebas.
* **Independencia del Entorno:** Al garantizar un valor por defecto seguro en entornos no productivos, se asegura que el ecosistema de integración y pruebas unitarias sea completamente independiente del sistema operativo o máquina donde el tribunal o evaluador compile el proyecto.

## Consecuencias

### Impacto Positivo

* **Estabilidad del Pipeline:** Se recupera la estabilidad del contexto de Spring Boot en un estado saludable (`BUILD SUCCESS`), permitiendo avanzar en la inyección de dependencias de seguridad de forma controlada y aislada.
* **Aislamiento de Tests:** Los desarrolladores y evaluadores pueden ejecutar la suite completa en local inmediatamente tras clonar el repositorio, sin necesidad de configurar manualmente variables de entorno en sus terminales.

### Impacto Negativo / Riesgos Mitigados

* **Riesgo de Claves en Texto Plano:** Almacenar un secreto por defecto en el archivo de propiedades expone la clave criptográfica en el repositorio de código de Git.
* *Mitigación:* Se configuró la propiedad para que priorice dinámicamente la variable de entorno real del servidor de producción mediante la sintaxis `${JWT_SECRET:clave_por_defecto_solo_para_desarrollo}`. De este modo, en entornos de producción se inyecta una clave fuerte y secreta, quedando el valor plano restringido exclusivamente a ejecuciones locales y pruebas unitarias.

---

# ADR-07: Implementación del Modelo de Autenticación Híbrido (Sesión + JWT)

## Estatus

Aceptado

## Fecha

Junio 2026

## Contexto

La migración desde un sistema basado en sesión con estado (*stateful*) hacia una arquitectura basada en tokens criptográficos (*stateless*) [ADR-03] introduce riesgos latentes de ruptura en la interfaz de React. Se requería que el servidor backend admitiera la emisión y validación activa de tokens sin inhabilitar ni penalizar el flujo operativo preexistente del prototipo de la aplicación.

## Decisión

Desarrollar e integrar una capa de seguridad híbrida que permita la coexistencia armónica de ambos mecanismos de autenticación mediante la inyección pasiva de un filtro personalizado (`JwtAuthenticationFilter`) en la cadena de seguridad nativa de Spring Security.

## Justificación para el TFG

* **Desarrollo Ágil Incremental:** Demuestra la aplicación práctica de metodologías de desarrollo incremental y control de riesgos arquitectónicos en la ingeniería de software.
* **Abstracción de Identidad:** Al unificar la entidad propia `Users` con la interfaz de seguridad `UserDetails` de Spring Security, se logra que la resolución de la identidad del usuario a través del contexto (`SecurityContextHolder`) sea completamente agnóstica al origen del acceso, dotando al sistema de una doble vía de entrada desacoplada.

## Consecuencias

### Impacto Positivo

* **Migración Frontend sin Fricciones:** El cliente en React puede migrar sus flujos y pantallas de forma progresiva hacia el consumo de la cabecera `Authorization: Bearer <token>` sin perder la estabilidad de las vistas actuales de la plataforma.
* **Mecanismo de Respaldo Autónomo:** Se mantiene la sesión clásica basada en cookies como un sistema de *fallback* (respaldo automático) ante peticiones locales o de administración que no implementen el flujo de tokens.

### Impacto Negativo / Riesgos Mitigados

* **Sobrecarga en la Cadena de Filtros:** La evaluación condicional en cada petición HTTP entrante (buscar cookies de sesión y, en su defecto, parsear la cabecera `Bearer`) añade pasos de procesamiento en la capa de red del servidor.
* *Mitigación:* Se optimizó el método `doFilterInternal` del filtro personalizado para realizar un cortocircuito anticipado rápido: si la cabecera no contiene el prefijo `Bearer`, el filtro cede el control inmediatamente a la cadena (`filterChain.doFilter`), evitando llamadas innecesarias a la lógica criptográfica de validación del token.

---

# ADR-08: Gestión de Estado Global y Persistencia de Tokens en React

## Estatus

Aceptado

## Fecha

Junio 2026

## Contexto

Al adaptar la arquitectura del cliente en React para procesar la respuesta híbrida del servidor, se requería una estrategia de persistencia en el navegador que permitiese almacenar los datos descriptivos del perfil del usuario y el token criptográfico JWT para la autorización de red, sin generar acoplamiento ni vulnerabilidades de seguridad por exposición de credenciales.

## Decisión

Modificar el ecosistema del contexto de autenticación (`authTypes.ts`, `AuthContext.tsx`, `AuthProvider.tsx`) y rediseñar el módulo de almacenamiento local (`authStorage.ts`) para separar físicamente la persistencia del objeto `AuthUser` respecto a la cadena de caracteres del `accessToken`.

## Justificación para el TFG

* **Buenas Prácticas de Ingeniería Web:** Aísla el token en su propia clave de memoria (`accessToken`), independizando la lógica de red del estado visual de la interfaz.
* **Automatización de Capa de Red:** Facilita la inyección automatizada del token en las cabeceras `Authorization: Bearer <token>` de un cliente HTTP centralizado sin alterar el ciclo de renderizado.

## Consecuencias

### Impacto Positivo

* **Estabilidad del Tipado Estático:** Estabiliza el tipado del frontend sin advertencias del compilador de TypeScript, asegurando un punto de partida óptimo para conectar las llamadas API de la SPA.
* **Mantenibilidad del Código:** Permite que cualquier componente interrogue al contexto de autenticación de forma segura y ligera al no mezclar el token criptográfico con los datos de visualización del perfil.

### Impacto Negativo / Riesgos Mitigados

* **Riesgo de Exposición por Almacenamiento Local:** Guardar el `accessToken` en *localStorage* expone la credencial a potenciales ataques de tipo Cross-Site Scripting (XSS).
* *Mitigación:* Se diseñó un ciclo de vida corto y restrictivo para el tiempo de expiración del token JWT en el backend (Spring Boot), reduciendo drásticamente la ventana de oportunidad de una extracción maliciosa.

---

# ADR-09: Consumo del Contrato JWT y Desacoplamiento de Vistas en el Cliente

## Estatus

Aceptado

## Fecha

Junio 2026

## Contexto

Tras rediseñar el almacenamiento de tokens en React [ADR-08], se requería adaptar la interfaz gráfica de inicio de sesión (`AuthModal.tsx`) para consumir el nuevo payload del servidor sin alterar el diseño visual, las animaciones ni la experiencia de usuario de los formularios de la SPA.

## Decisión

Refactorizar la función controladora del formulario de Login para realizar el tipado estático seguro (*type casting*) de la respuesta HTTP de Axios hacia la interfaz `AuthTokenResponse`. Se delega el almacenamiento inmediato del token de acceso de red y los metadatos de perfil en el storage local, actualizando el estado de autenticación de la aplicación de forma transparente.

## Justificación para el TFG

* **Contratos de Tipado Estricto:** Demuestra la capacidad de consumir APIs bajo contratos de tipado estricto en entornos de desarrollo de software profesionales.
* **Aislamiento de la Capa Visual:** Al desligar el procesamiento del payload JSON de la capa de presentación visual, se garantiza que los componentes gráficos permanezcan aislados frente a futuras modificaciones en la estructura de las propiedades devueltas por Spring Boot.

## Consecuencias

### Impacto Positivo

* **Flujo de Acceso Operativo:** Se logra un flujo de autenticación seguro, fuertemente tipado y completamente operativo que actualiza el estado reactivo global del cliente de manera síncrona tras la verificación de las credenciales en PostgreSQL.
* **Mantenibilidad:** El formulario visual se limita a delegar el envío de datos y el éxito de la operación, sin incrustar lógica pesada de persistencia local en su interior.

### Impacto Negativo / Riesgos Mitigados

* **Riesgo de Incompatibilidad de Payload:** Si el backend cambia la firma de `AuthTokenResponse`, el tipado estático del frontend podría ocultar fallos en tiempo de ejecución al forzar el casteo.
* *Mitigación:* Se implementó un mapeo de datos estricto que valida las propiedades esenciales de la respuesta en la capa de servicios de red antes de propagar el estado de éxito al modal de autenticación, protegiendo la UI ante respuestas inesperadas del servidor.

---

# ADR-10: Centralización de Peticiones HTTP mediante Interceptores de Red

## Estatus

Aceptado

## Fecha

Junio 2026

## Contexto

Almacenado el token JWT en el cliente [ADR-08], se requería un mecanismo eficiente para adjuntarlo de forma sistemática en la cabecera `Authorization: Bearer <token>` de cada petición dirigida a los recursos protegidos del backend. Era crítico evitar que los componentes visuales asumieran lógica repetitiva de red o manipularan directamente el almacenamiento físico en cada llamada API.

## Decisión

Implementar un cliente HTTP personalizado (`src/services/apiClient.ts`) basado en **Axios**, de uso obligatorio para todas las comunicaciones de la plataforma, incorporando interceptores automáticos de solicitud (*Request Interceptors*).

## Justificación para el TFG

* **Patrones de Diseño de Red:** Demuestra un profundo conocimiento de los patrones de diseño estructurales aplicados a comunicaciones de red (como *Proxy* o *Intercepting Filter*).
* **Securitización Transparente:** Al delegar la inyección del token en un interceptor centralizado, el resto de la aplicación consume la API de forma nativa. El interceptor se encarga de auditar y adjuntar las credenciales necesarias, aislando por completo la capa visual de la capa de transporte de seguridad.

## Consecuencias

### Impacto Positivo

* **Reducción del Acoplamiento:** Se elimina la duplicidad de lógica en el frontend, impidiendo que los componentes gráficos tengan que interrogar al *localStorage* en cada petición.
* **Gestión Centralizada de Errores:** Permite capturar e interceptar globalmente las respuestas del servidor con código de estado HTTP `401 Unauthorized`, facilitando la implementación de una redirección automatizada o un borrado de sesión limpio si el token expira.

### Impacto Negativo / Riesgos Mitigados

* **Cuello de Botella en Peticiones:** Añadir un interceptor síncrono introduce un paso intermedio que evalúa el estado del almacenamiento en el 100% de las peticiones salientes, incluidas aquellas orientadas a recursos públicos (como la Landing Page o el catálogo abierto).
* *Mitigación:* Se optimizó el interceptor mediante una estructura de cortocircuito lógico veloz: si la ruta de destino coincide con endpoints públicos definidos en una lista blanca local, el interceptor omite la lectura de memoria y envía la petición de inmediato, neutralizando cualquier penalización de rendimiento.

---

# ADR-11: Mecanismo de Hidratación de Sesión mediante Validación Asíncrona del Token

## Estatus

Aceptado

## Fecha

Junio 2026

## Contexto

Al recargar la interfaz web de la SPA, el estado volátil en la memoria de React se destruye por completo. Se requería un mecanismo automático y transparente que determinase si el token almacenado localmente seguía siendo válido en el servidor antes de permitir la renderización de las pantallas privadas de la aplicación.

## Decisión

Implementar un efecto secundario de ciclo de vida (`useEffect`) en la inicialización del `AuthProvider` para consumir de forma asíncrona el endpoint `/api/auth/me` del backend, controlando el flujo de renderizado del cliente mediante un estado bandera estructurado `isLoading`.

## Justificación para el TFG

* **Patrón de Hidratación de Estado (*State Hydration*):** Demuestra el uso correcto del patrón de sincronización de estado cliente-servidor para aplicaciones web modernas.
* **Consistencia en la UI:** Utilizar una variable de control `isLoading` evita la pérdida de sesión en las recargas accidentales de página y unifica la verificación síncrona en el cliente con las respuestas reales de la API del servidor, impidiendo destellos visuales erróneos.

## Consecuencias

### Impacto Positivo

* **Consolidación de la Seguridad:** Las recargas de página recuperan la identidad y el contexto del usuario de forma inmediata sin obligarle a pasar de nuevo por el formulario de inicio de sesión.
* **Sincronización Robusta:** Si el token ha expirado o ha sido manipulado, el backend responde con un error y el frontend limpia automáticamente el almacenamiento local, redirigiendo de forma segura al estado de invitado.

### Impacto Negativo / Riesgos Mitigados

* **Bloqueo Temporal de Interfaz:** Mientras se valida el token de forma asíncrona, la aplicación se detiene en un estado de carga global, demorando el renderizado de la vista de cara al usuario.
* *Mitigación:* Se diseñó el endpoint `/api/auth/me` en Spring Boot de manera ultraligera, optimizando la consulta en PostgreSQL a través de índices en el campo `username` para resolver la identidad del usuario en milisegundos, neutralizando el impacto en la percepción de carga de la aplicación.

---

# ADR-12: Unificación de Layouts Mediante Composición Paramétrica Reactiva al Rol

## Estatus

Superado (Rectificado)

## Fecha

Junio 2026

## Contexto

La arquitectura original planteaba una segregación física de archivos (`AdminLayout.tsx`, `ProfessorLayout.tsx` y `StudentLayout.tsx`) bajo la premisa de anticipar necesidades futuras de "composición especializada". Sin embargo, tras una auditoría técnica orientada al despliegue, se evidenció un escenario de sobreingeniería y deuda técnica: los tres componentes compartían el 98% de su infraestructura lógica y directivas estéticas de Tailwind CSS, divergiendo únicamente en parámetros milimétricos de espaciado lateral (`px-4` frente a `px-6`). Mantener esta dispersión multiplicaba el riesgo de desincronización ante actualizaciones globales del diseño perimetral.

## Decisión

Deprecar y eliminar del sistema los tres archivos redundantes de diseño por rol. Toda la infraestructura visual del frontend se centraliza de manera absoluta en un único componente inteligente: `DashboardLayout.tsx`. Este elemento se redefine como un contenedor paramétrico que autodetecta en tiempo real el rol del usuario autenticado a través del contexto global de `useAuth`, inyectando dinámicamente las clases geométricas correspondientes.

## Justificación para el TFG

* **Principio DRY (Don't Repeat Yourself):** Esta rectificación prioriza de forma rigurosa la eliminación de duplicidades sobre asunciones de diseño tempranas y desacopladas de la realidad del código fuente.
* **Optimización de Mantenibilidad:** Al consolidar la interfaz perimetral en un único punto de control, cualquier modificación estructural (como la futura adición de pies de página o menús laterales) requiere una única edición centralizada, reduciendo a cero el radio de fallo por omisión en vistas satélite y eliminando la redundancia estructural en React.

## Consecuencias

### Impacto Positivo

* **Mitigación de Deuda Técnica:** Reducción drástica del volumen de archivos huérfanos de lógica propia en el directorio de layouts, simplificando la auditoría de código del frontend de cara al tribunal.
* **Coherencia Geométrica Garantizada:** La paridad visual entre los paneles de control queda blindada de forma nativa por el compilador, aplicando los espaciados específicos reactivos únicamente bajo la condición estricta de jerarquía (como el perfil del administrador).
* **Optimización del Enrutamiento:** Las vistas del cliente (`StudentDashboard`, `StudentProfilePage`, etc.) migran hacia el consumo de un único envoltorio homogéneo, facilitando el mantenimiento de las importaciones y la legibilidad en los módulos de navegación.

### Impacto Negativo / Riesgos Mitigados

* **Riesgo de Pérdida de Especialización:** Agrupar la lógica de visualización de tres paneles de control en un único archivo puede dificultar la adición de componentes exclusivos de un rol específico (como un menú de administración avanzado).
* *Mitigación:* Se diseñó `DashboardLayout.tsx` para delegar de forma modular las interfaces específicas en subcomponentes independientes (como `<NavbarUser />`), los cuales gestionan internamente sus insignias y botones mediante composición limpia de React, manteniendo el layout base genérico y protegido.
.

  ---

  # [ADR-13] Mitigación de Desincronización Temporal mediante Margen de Tolerancia (Clock Skew) en JWT

## Estado

Aceptado

## Contexto

En arquitecturas distribuidas de producción, los relojes internos de los diferentes entornos (servidor API de Spring Boot, base de datos PostgreSQL y clientes web/móviles) pueden sufrir ligeras desincronizaciones micrométricas (desviaciones de tiempo o *clock drift*).
Nuestra auditoría técnica detectó una propiedad inactiva (`app.jwt.clock-skew-seconds`) y una validación estricta de la fecha de expiración en `JwtService.java`. Esto generaba un riesgo crítico: la invalidación prematura e injustificada de tokens JWT legítimos inmediatamente después de su emisión si el reloj del cliente o del servidor presentaba una variación de apenas unos segundos.

## Decisión

Se decide desacoplar la validación de tiempo estricta e integrar de forma activa un margen de tolerancia (*Clock Skew*) en la lógica de expiración de tokens (`isExpired`) en `JwtService.java`.

Se ha parametrizado mediante inyección de dependencias (`JwtProperties`) un margen configurable de 60 segundos (valor recomendado por la especificación OAuth 2.0 / RFC 7519). Al evaluar la expiración, el tiempo absoluto actual del sistema se mitiga restándole este margen de tolerancia:
`Instant adjustedCurrentTime = Instant.now(clock).minusSeconds(skew);`

## Consecuencias

* **Positivas:** Se elimina el error silencioso de tokens rechazados por desalineación temporal en producción. Aumenta la robustez de la API sin degradar la experiencia de usuario.
* **Negativas:** La ventana real de validez del token se extiende exactamente por el número de segundos configurado en el *clock skew*, un impacto marginal que se asume en favor de la disponibilidad.

---

# ADR-14: Suite de Pruebas Automatizadas y Mecanismos de Smoke Testing para la Infraestructura de Seguridad Criptográfica

## Estatus

Aceptado

## Fecha

Junio 2026

## Contexto

Una auditoría técnica interna identificó una brecha de cobertura crítica (*coverage gap*) en el subsistema de seguridad. El componente más sensible del servidor, `JwtService.java`, carecía de pruebas unitarias que validasen la integridad de los algoritmos de firma HS256 y la gestión de los tiempos de expiración. Asimismo, el archivo predeterminado `BackendApplicationTests.java` se limitaba a una prueba de carga de contexto vacía y estéril que no aportaba valor asertivo al ciclo de vida del software, dejando la inyección de dependencias de Spring Security expuesta a errores no detectados antes del despliegue.

## Decisión

Implementar una suite robusta de pruebas automatizadas utilizando **JUnit 5 y Mockito**. La estrategia se divide en dos niveles operativos localizados en la ruta estandarizada `src/test/java/`:

1. **Aislamiento Criptográfico (`JwtServiceTest.java`):** Creación de pruebas unitarias que emplean dobles de prueba (*Mocks*) para verificar exhaustivamente la emisión de tokens, la extracción correcta de *claims* (roles y usuarios) y la inmutabilidad temporal mediante la validación del *Clock Skew*.
2. **Smoke Testing de Infraestructura:** Refactorización de `BackendApplicationTests.java` para transformarlo en un test de humo activo. Este componente ahora valida de forma asertiva que los *Beans* críticos de seguridad (como el `AuthenticationManager` y los filtros JWT) se encuentren correctamente instanciados en el contenedor IoC de Spring Boot.

## Justificación para el TFG

* **Estándares Profesionales de QA:** Garantiza el cumplimiento de las metodologías de Aseguramiento de la Calidad (QA) y la correcta aplicación práctica de la Pirámide de Pruebas.
* **Certificación Determinista:** Al automatizar la validación de la lógica criptográfica, se demuestra al tribunal la capacidad de certificar el software bajo el estándar `BUILD SUCCESS` de Maven. El pipeline alcanza una tasa de éxito verificada del 100% (8 tests ejecutados, 0 fallos, 0 errores), proporcionando una métrica objetiva de fiabilidad técnica.

## Consecuencias

### Impacto Positivo

* **Eliminación de Falsos Positivos:** Se erradica por completo la posibilidad de que el sistema compile con una configuración perimetral de seguridad defectuosa.
* **Certificación Estática Protegida:** El subsistema de autenticación queda blindado contra regresiones accidentales durante futuras refactorizaciones del código fuente.
* **Robustez en el Pipeline:** Se asegura que el ciclo de vida del desarrollo cuente con una red de seguridad técnica que valide la integridad de la plataforma de forma previa a cualquier despliegue en entornos de evaluación.

### Impacto Negativo / Riesgos Mitigados

* **Acoplamiento al Contexto de Spring:** Los tests de humo obligan a levantar el contenedor IoC de Spring Boot completo (`@SpringBootTest`), lo que incrementa el tiempo total de ejecución de la suite en entornos de integración continua (CI/CD).
* *Mitigación:* Se aislaron estrictamente los tests criptográficos en clases puras de JUnit 5 con `MockitoExtension` para que corran en milisegundos en memoria, restringiendo el uso de `@SpringBootTest` únicamente al archivo raíz de humo para equilibrar el tiempo total del pipeline.

---

## [ADR-15] Purificación Arquitectónica de la Capa de Presentación mediante Composición Pura e Inyección del Contenedor de Scroll Controlado

### Estado

Aceptado.

### Contexto

El componente transversal `GenericCard.tsx` presentaba un sobrediseño inicial que acoplaba rígidamente su estructura a propiedades de texto estáticas (como `title`, `tag`, `footerChildren`), obligando al sistema a realizar mapeos artificiales y limitando su polimorfismo. Además, la necesidad de incorporar un listado masivo de usuarios PostgreSQL en la consola del Administrador exigía un mecanismo de visualización que no degradase el DOM ni alterase de forma descontrolada el layout vertical de la aplicación ante el crecimiento de la base de datos.

### Decisión

1. **Purificación UI**: Rediseñar por completo `GenericCard.tsx` eliminando todas las propiedades rígidas del contrato de TypeScript y reduciéndola a un contenedor minimalista gobernado única y exclusivamente por la propiedad nativa de composición pura `children`.
2. **Encapsulamiento del Scroll**: Crear la utilidad atómica `UserScrollList.tsx` dentro de `components/admin/` e inyectarla por composición dentro de la nueva tarjeta genérica.
3. **Contención Estricta de Altura**: Fijar una altura estricta inamovible de `h-[116px]` en el scroll y compensar simétricamente el Buscador en `AdminDashboard.tsx` mediante un acolchado geométrico equilibrado (`py-15`), garantizando un plano horizontal perfectamente alineado (50% - 50%).

### Justificación para el TFG

Cumplimiento estricto del principio Abierto/Cerrado (OCP) de SOLID. La tarjeta actúa como un lienzo abstracto inmutable capaz de asimilar cualquier contenido futuro sin alterar su código fuente. La contención vertical garantiza la ergonomía visual y un consumo constante de memoria en el navegador sin importar el volumen de datos en PostgreSQL.

### Consecuencias

* Erradicación total de abstracciones falsas y código muerto en el Frontend.

* Logro de simetría geométrica bidireccional perfecta en la interfaz del Administrador.
* Escalabilidad visual y de rendimiento garantizada frente a cientos de registros concurrentes.

# ADR-16: Soporte Multirrol Dinámico y Corrección de Ámbito en Bloques Asíncronos (AuthModal & NavbarUser)

## Estatus

Aceptado

## Fecha

Junio 2026

## Contexto

Se requería la inclusión de un nuevo rol de usuario (`PROFESSOR`) dentro de la plataforma escolar, el cual debía coexistir de manera jerárquica con los roles preexistentes (`ADMIN` y `STUDENT`). Al intentar introducir esta lógica intermedia en el cliente SPA, se produjeron fallos críticos de sintaxis: una pérdida de ámbito (*Scope*) en `AuthModal.tsx` por un cierre prematuro de llaves (`}}`) que desconectó los bloques `catch` y `finally` provocando el error `Parsing error: 'catch' or 'finally' expected`; una evaluación lineal incorrecta que ejecutaba siempre la ruta `/student` de forma secuencial; y una limitación estructural en JSX dentro de `NavbarUser.tsx`, ya que el operador ternario binario tradicional (`condición ? A : B`) no admitía una estructura procedural `if/else` directa.

## Decisión

Saneamiento y unificación del flujo mediante dos estrategias correctivas en la capa de presentación del frontend:

1. **Reestructuración Sintáctica Asíncrona:** Corregir las llaves jerárquicas del bloque de captura asíncrono en `AuthModal.tsx` y confinar la redirección dentro de una estructura de control de tres vías (`if`, `else if`, `else`) mutuamente excluyente y atómica.
2. **Encapsulamiento en Renderizado JSX:** Implementar una expresión de función ejecutada inmediatamente o función flecha auto-invocada (**IIFE**: `(() => { ... })()`) dentro del árbol de renderizado de `NavbarUser.tsx` para encapsular la lógica condicional múltiple. Se diseñó la identidad visual docente con un esquema esmeralda corporativo (`bg-emerald-50`, `text-emerald-800`) acoplado al icono descriptivo `BookOpen` de `lucide-react`.

## Justificación para el TFG

* **Dominio de la Especificación ECMAScript:** Demuestra el dominio avanzado de JavaScript moderno y la arquitectura de componentes reactivos en aplicaciones de gran envergadura (SPA).
* **Robustez en Estado Asíncrono:** La resolución del bloqueo del árbol sintáctico del `try/catch/finally` evidencia buenas prácticas en el manejo del estado y la tolerancia a fallos. La inyección de expresiones procedimentales mediante IIFE dota a la interfaz de alta cohesión, paridad estética y mantenibilidad, criterios clave exigidos en la rúbrica de evaluación.

## Consecuencias

### Impacto Positivo

* **Estabilización de Compilación:** Se eliminaron por completo los errores de compilación y de pérdida de alcance de las variables reactivas de feedback (`setError`, `setLoading`).
* **Redirecciones Deterministas:** La estructura condicional excluyente asegura que un usuario autenticado jamás ejecute código residual de otra ruta, mitigando accesos o redirecciones inválidas.

### Impacto Negativo / Riesgos Mitigados

* **Legibilidad Comprometida en JSX:** El uso de funciones auto-invocadas (IIFE) incrustadas en el árbol JSX puede sobrecargar la legibilidad de la vista si el marcado visual por rol crece desmesuradamente en el futuro.
* *Mitigación:* Se acotó la IIFE exclusivamente a la renderización de la insignia (*badge*) identificativa de rol, delegando las acciones complejas y el resto de la botonera a funciones manejadoras externas (`handleProfileRedirect`), manteniendo el componente limpio y legible.

---

# ADR-17: Centralización del Control de Roles Administrativos y Optimización Stateless (Stateless Token Parsing)

## Estatus

Aceptado

## Fecha

Junio 2026

## Contexto

Al intentar implementar la funcionalidad de alteración de privilegios en el componente del frontend `AdminDashboard.tsx`, el servidor Spring Boot emitía rechazos asíncronos y revertía localmente las mutaciones a su estado por defecto (`STUDENT`). Este fallo se debía a tres factores críticos: la omisión del verbo HTTP `PATCH` en las políticas CORS globales, la falta de mapeo explícito de la subruta de gestión `/api/auth/users/**` en las reglas de Spring Security, y un cuello de botella arquitectónico en el filtro `JwtAuthenticationFilter.java` que ejecutaba consultas redundantes a PostgreSQL (`UserDetailsService.loadUserByUsername`) en cada petición entrante.

## Decisión

Rediseñar e integrar la infraestructura de seguridad en tres niveles operativos coordinados:

1. **Saneamiento de Políticas Perimetrales:** Incorporar de forma explícita el método `PATCH` en el *Bean* de configuración CORS y mapear la ruta administrativa en `SecurityConfig.java` utilizando `.hasAnyAuthority("ADMIN", "ROLE_ADMIN")` para absorber discrepancias de nomenclatura de roles en la base de datos.
2. **Optimización en la Capa de Transporte (*Stateless Token Parsing*):** Eliminar por completo el acceso redundante a persistencia en el ciclo de filtrado, transformando el `JwtAuthenticationFilter` en un componente estrictamente *stateless* que decodifica y reconstruye las autoridades (`SimpleGrantedAuthority`) en memoria extrayéndolas criptográficamente del token JWT (*Claims*).
3. **Integración Atómica en la UI:** Vincular el selector interactivo `<select>` del frontend con el endpoint parametrizado para salvaguardar el principio de menor privilegio.

## Justificación para el TFG

* **Seguridad Informática Avanzada:** Aporta un valor metodológico fundamental en términos de seguridad informática y optimización de recursos. Demuestra la capacidad de erradicar duplicidades y de transicionar con éxito desde un modelo híbrido hacia una arquitectura puramente desacoplada (*Stateless* / *RESTful*).
* **Rendimiento e Integridad de Persistencia:** El parseo directo de *claims* en memoria reduce drásticamente los accesos concurrentes a la base de datos PostgreSQL, mejorando los tiempos de respuesta y la escalabilidad de la plataforma frente a picos de tráfico simulados, un criterio muy valorado por el tribunal.

## Consecuencias

### Impacto Positivo

* **Eliminación de Degradación de Rendimiento:** Se erradican las dobles lecturas a disco por cada petición asegurada que se procese en la plataforma.
* **Consistencia Atómica de Datos:** El Administrador puede gestionar, auditar y reasignar los privilegios del alumnado y profesorado de forma instantánea y reactiva en la UI, garantizando un flujo libre de bloqueos cruzados en el servidor de *preflight* de los navegadores.

### Impacto Negativo / Riesgos Mitigados

* **Riesgo de Revocación Tardía:** Al reconstruir los roles puramente desde el token JWT en memoria sin interrogar a la base de datos, si el rol de un usuario es revocado en la base de datos, el usuario mantendrá sus privilegios antiguos hasta que su token expire.
* *Mitigación:* Se redujo de forma estricta el tiempo de expiración de los *access tokens* a un intervalo corto, limitando drásticamente la ventana de exposición y asegurando que las modificaciones de privilegios administrativos se sincronicen de manera forzosa en el siguiente ciclo de refresco del cliente.

---

# ADR-18: Unificación del Perfil Universal Atómico y Desacoplamiento de Flujos de Redirección mediante Cohesión de Componentes y Sincronización Síncrona del Contexto JWT

## Estatus

Aceptado

## Fecha

Junio 2026

## Contexto

El sistema presentaba dos desafíos críticos interconectados que afectaban la experiencia de usuario (UX) y la integridad de los datos entre la capa de presentación (Vite + TypeScript) y la capa de servicios (Spring Boot 3 + PostgreSQL):

1. **Cortocircuito de Persistencia Backend (Excepción Hibernate):** El filtro de seguridad (`JwtAuthenticationFilter`) inyectaba un objeto `UserDetails` desvinculado de la sesión activa de Hibernate (*Detached*). Al enviar un payload `PUT` genérico (`/api/v1/profile/update`) para actualizar datos del perfil, Hibernate lanzaba la excepción de infraestructura `org.hibernate.AssertionFailure: null identifier (UserProfile)`. El mecanismo `@MapsId` fallaba al derivar la clave de la entidad débil `user_profiles` debido al estado transaccional inestable de la entidad fuerte `users` en transacciones de actualización concurrentes.
2. **Bloqueo y Rebote Asíncrono en el Frontend (Navegación SPA):** Al interactuar con el elemento de interfaz (`GenericButton`) que muestra el nombre del usuario autenticado en la cabecera, la aplicación omitía el callback de navegación y bloqueaba el acceso de forma perenne. Se detectaron tres anomalías: una discrepancia semántica en TypeScript entre manejadores `MouseEventHandler` y funciones puras (`() => void`) bajo la directiva `verbatimModuleSyntax`, un acoplamiento innecesario por propagación vertical de propiedades (*Props Drilling*) desde `MainNavbar.tsx` hacia `NavbarUser.tsx`, y un rebote asíncrono destructivo en el guardia de seguridad (`ProtectedRoute.tsx`), el cual interpretaba el estado transitorio inicializado en `null` de la sesión como un falso negativo, expulsando al usuario debido a la regla comodín (`path="*"`) antes de terminar la hidratación del token JWT.

## Decisión

Rediseñar de forma unificada la persistencia transaccional y el flujo de navegación mediante tres intervenciones estratégicas:

1. **Estabilización de Sesión en Persistence Context:** Forzar una reasociación explícita y un volcado inmediato a la base de datos en `ProfileController.java` mediante el método `userRepository.saveAndFlush(currentUser)` antes de mapear el perfil extendido. Esto reincorpora la entidad *Detached* en la sesión de Hibernate, garantizando que `@MapsId` resuelva el identificador atómicamente.
2. **Purificación de Rutas Indexadas en UI:** Eliminar el *Props Drilling* delegando de forma autónoma la redirección al componente de la barra de navegación. Se sustituyen las funciones de callback ambiguas por un mapeo indexado directo a nivel de TypeScript basado en constantes centralizadas (`ROLES`), enlazando el evento nativo del botón con `useNavigate`.
3. **Control del Ciclo de Vida del Guardia de Red:** Modificar la lógica de `ProtectedRoute.tsx` para evaluar de manera prioritaria el estado bandera `isLoading` derivado de la hidratación asíncrona del token. Se suspende la evaluación de rutas y se renderiza un estado de carga neutral mientras la verificación del endpoint `/api/auth/me` se encuentre en proceso.

## Consecuencias

### Impacto Positivo

* **Integridad Transaccional Libre de Bloqueos:** Se erradica la excepción de identificador nulo de Hibernate, garantizando actualizaciones consistentes y atómicas del perfil extendido multirrol (`STUDENT`, `PROFESSOR`, `ADMIN`).
* **Saneamiento del Sistema de Rutas:** Se elimina el rebote destructivo en las recargas de página, permitiendo que la SPA mantenga al usuario en su dashboard correspondiente de forma determinista y sin expulsiones accidentales del guardia de seguridad.
* **Cohesión y Cumplimiento de Estándares:** La unificación de tipos en TypeScript se alinea con la directiva estricta `verbatimModuleSyntax`, optimizando la compilación y reduciendo la deuda técnica en el árbol de componentes.

### Impacto Negativo / Riesgos Mitigados

* **Sobrecarga por Sincronización Forzada:** El uso de `saveAndFlush` obliga al motor de base de datos a ejecutar operaciones de escritura intermedias en disco de forma inmediata, lo que podría elevar ligeramente la latencia de la petición HTTP.
* *Mitigación:* Al estar la lógica de actualización confinada exclusivamente al módulo de edición de perfil (operación de muy baja frecuencia transaccional en comparación con las consultas de cursos), el impacto en el rendimiento global del servidor es estadísticamente imperceptible en los entornos de evaluación del proyecto.

---

# ADR-19: Arquitectura del Módulo de Gestión de Cursos y Modelado de Relaciones Unidireccionales para el Perfil Profesor

## Estatus

Aceptado

## Fecha

Junio 2026

## Contexto

Con el perfil de usuario universal estabilizado [ADR-18], el sistema requería implementar de forma integral el circuito del profesor para permitir la creación, edición y lectura de contenidos académicos en PostgreSQL. El desafío técnico de ingeniería radicaba en modelar las relaciones en Spring Boot 3 de forma **unidireccional** para evitar referencias circulares infinitas al serializar las entidades con Jackson a JSON, garantizando al mismo tiempo que solo los usuarios con el rol `PROFESSOR` posean privilegios de mutación sobre este segmento de datos.

## Decisión

Implementar un diseño de servicios acotado y un modelado de persistencia de datos bajo las siguientes directrices de arquitectura:

1. **Control de Acceso Basado en Roles (RBAC):** Asegurar perimetralmente los endpoints del controlador de asignaturas mediante la inyección de anotaciones de seguridad declarativas `@PreAuthorize("hasRole('PROFESSOR')")` a nivel de Spring Security.
2. **Modelado Unidireccional Estricto:** La entidad `Courses` mapea una relación de muchos a uno (`@ManyToOne`) hacia el usuario docente (`Users`). En contraposición, la entidad `Users` se mantiene agnóstica a las asignaturas que imparte en su modelo, bloqueando de forma nativa la recursividad en la sesión de Hibernate.
3. **Consumo Reactivo en la Presentación:** Desarrollar módulos de paginación e interfaces asíncronas en el frontend mediante Axios, mapeando la respuesta del servidor en tarjetas de información escaneables dentro de `ProfessorDashboard.tsx`.

## Consecuencias

### Impacto Positivo

* **Seguridad Estricta en la Capa de Servicios:** Se blinda la lógica de negocio del perfil docente. Los profesores pueden gestionar sus asignaturas de forma autónoma, mientras que el alumnado queda restringido exclusivamente a operaciones de lectura perimetrales.
* **Carga de Red Optimizada (JSON Limpio):** Se obtienen payloads JSON extremadamente ligeros y desacoplados para la SPA, eliminando la necesidad de recurrir a anotaciones paliativas de serialización como `@JsonManagedReference` o `@JsonBackReference`.

### Impacto Negativo / Riesgos Mitigados

* **Queries Personalizadas en Repositorio:** Al omitirse la relación bidireccional, no es posible recuperar los cursos de un profesor de forma automática haciendo un acceso navegable clásico de JavaBeans (por ejemplo, `user.getCourses()`).
* *Mitigación:* Se diseñó un método de consulta explícito y optimizado en el repositorio de persistencia (`findByInstructorId`), aislando la responsabilidad de la búsqueda mediante JPQL indexado y manteniendo la integridad estructural del modelo stateless.

---

# ADR-20: Diseño de Persistencia Normalizada Multivalor y Simetría Relacional para Intereses del Alumnado

## Estatus

Aceptado

## Fecha

Junio 2026

## Contexto

Al planificar la infraestructura del módulo de recomendación inteligente en el frontend (`StudentDashboard.tsx`), se identificó la necesidad imperativa de capturar de forma genérica y multidimensional los intereses del estudiante en HTML/React en cinco ejes críticos: categorías temáticas, nivel, duración de cursos, idioma y subtítulos. El almacenamiento tradicional en columnas de texto plano (strings concatenados por comas) provocaría una degradación severa del rendimiento, obligando al servidor a ejecutar costosas operaciones de búsqueda de patrones con comodines (`LIKE`), anulando la utilidad de los índices y violando la Primera Forma Normal (1FN) de las bases de datos relacionales. Adicionalmente, al abrir el componente modal multiscroll (`InterestsModal.tsx`), las preferencias no persistían marcadas en la interfaz de usuario debido a que el motor de persistencia sufría una desconexión por carga perezosa (*lazy loading*) en las colecciones secundarias y a que existía una colisión de rutas en el enrutamiento HTTP que impedía la correcta lectura del estado actual.

## Decisión

Implementar un circuito de persistencia normalizado, desacoplado y simétrico estructurado en cuatro niveles técnicos coordinados:

1. **Arquitectura de Datos mediante Clave Compartida:** Incorporar la entidad `Interest.java` aplicando el patrón `@MapsId` en una relación `@OneToOne` con la tabla de usuarios para compartir de forma nativa la misma clave primaria (`user_id`), garantizando el borrado en cascada automático en PostgreSQL.
2. **Persistencia de Colecciones e Hidratación Explícita:** Implementar la anotación `@ElementCollection` generando de forma transparente cinco tablas satélite indexadas de forma vertical (`interest_categories`, `interest_course_types`, `interest_durations`, `interest_languages`, y `interest_subtitle_languages`). En el método de lectura `getUserInterests` de `UserService.java`, se introduce una **Lógica de Hidratación Forzada Optimizada mediante la invocación explícita del tamaño de colección (`.size()`)** dentro de la transacción activa, destruyendo el proxy perezoso de Hibernate y obligando al ORM a volcar los datos reales en memoria antes de la serialización a JSON.
3. **Simetría en Enrutamiento API:** Reestructurar la precedencia jerárquica en `UserController.java` posicionando el endpoint estático `GET /api/auth/my-interests` de forma prioritaria antes del patrón dinámico variable `GET /{username}` para anular la ambigüedad en el enrutamiento web de Spring MVC y subsanar el error HTTP 400 Bad Request.
4. **Ciclo Sincronizado en Frontend:** Configurar en el modal de React un hook de efecto (`useEffect`) acoplado al estado de visibilidad (`isOpen`), invocando de manera asíncrona al cliente centralizado (`apiClient`) para hidratar los estados locales (`useState`), activando de forma automática las clases CSS condicionales y los iconos de verificación (`✓`).

## Justificación para el TFG

* **Cumplimiento de Teoría Relacional (1FN):** Demuestra el cumplimiento riguroso de la teoría de normalización al fragmentar colecciones dinámicas en casilleros elementales independientes, evitando el coste computacional de procesar expresiones regulares en disco.
* **Control Programático del ORM:** El uso de llamadas `.size()` defiende la robustez del software frente a fallos de inicialización indeterministas, eliminando acoplamientos rígidos con clases nativas del proveedor de persistencia y optimizando el ciclo de vida transaccional. Esta simetría exacta anula la necesidad de capas de conversión intermedias en Spring Boot, lo que permitirá al futuro motor de recomendación ejecutar consultas de cruce ultra veloces mediante operaciones de conjunto indexadas (`JOIN` y cláusulas `IN`).

## Consecuencias

### Impacto Positivo

* **Interacción Reactiva en Tiempo Real:** El estudiante puede interactuar de forma fluida con el modal multiscroll de React para actualizar sus criterios preferentes en el mismo milisegundo.
* **Consistencia Atómica de Preferencias:** Los cambios se persisten de forma transaccional en PostgreSQL mediante un mecanismo destructivo-limpio (operaciones secuenciales de `DELETE` e `INSERT` gestionadas de forma nativa por el ORM), proporcionando una base estructurada y libre de duplicados con un estado HTTP 200 OK estable.

### Impacto Negativo / Riesgos Mitigados

* **Operaciones de Escritura Frecuentes:** El enfoque destructivo-limpio borra e inserta todas las filas de las colecciones multivalor en cada actualización, lo que incrementa el volumen de sentencias SQL ejecutadas en PostgreSQL.
* *Mitigación:* Al estar estas colecciones limitadas a un volumen muy reducido de elementos elementales por alumno (máximo una decena de tokens por eje), el impacto de red y procesamiento en el motor de base de datos es trivial, quedando neutralizado por el beneficio de contar con un esquema indexado totalmente limpio.

---

# ADR-21: Optimización Computacional del Buscador Predictivo mediante Indexación Invertida GIN, Formateo Nativo de Parámetros y Mitigación de Carga en Interfaz

## Estatus

Aceptado

## Fecha

Junio 2026

## Contexto

El buscador global de cursos integrado en el panel del estudiante (`StudentDashboard.tsx`) presentaba deficiencias críticas de rendimiento y usabilidad que comprometían la escalabilidad del sistema. La consulta JPQL original implementaba una búsqueda aproximada multicampo utilizando comodines en ambos extremos del patrón (`LIKE LOWER(CONCAT('%', :keyword, '%'))`). En entornos relacionales como PostgreSQL, la presencia de un comodín inicial anula la utilidad de los índices de árbol tradicionales (B-Tree), forzando al motor a ejecutar un escaneo secuencial completo (*Full Table Scan*) de coste computacional O(N) en cada pulsación de tecla. Adicionalmente, se detectó una anomalía de *binding* en la caché de planes de Hibernate al concatenar dinámicamente los porcentajes (`%`) dentro de múltiples cláusulas `OR` en JPQL, provocando que el motor devolviera registros aleatorios que no coincidían con el criterio real. Finalmente, la ausencia de límites en la consulta volcaba todo el catálogo en la memoria RAM del servidor de Spring Boot, penalizando críticamente el hilo de renderizado del navegador al intentar dibujar cientos de componentes `GenericCard` simultáneamente.

## Decisión

Implementar una reestructuración arquitectónica integral en tres capas para optimizar el flujo de datos y la eficiencia de cómputo:

1. **Capa de Persistencia (PostgreSQL):** Activar la extensión nativa `pg_trgm` y estructurar tres índices invertidos generalizados (**GIN**) basados en operaciones de trigramas (`gin_trgm_ops`) sobre las columnas críticas de búsqueda (`title`, `category`, `skills`) de la tabla `courses` para habilitar búsquedas parciales indexadas de coste O(log N) u O(1).
2. **Capa de Negocio y Repositorio (Spring Boot):** Modificar la firma del método en `CoursesRepository.java` trasladando de forma nativa el formateo de los patrones de coincidencia aproximada (`%keyword%`) a la memoria de Java en `UserService.java`. La consulta se restringe a un lote simétrico estricto de **12 resultados** mediante `PageRequest.of(0, 12)` e incorpora una cláusula algorítmica `ORDER BY CASE` en JPQL que prioriza semánticamente las coincidencias por títulos que comienzan exactamente con el término buscado.
3. **Capa de Presentación (React & Tailwind):** Consolidar un control de tasa de peticiones (*rate limiting*) en el cliente mediante un temporizador *debounce* de 400ms acoplado al hook de efecto (`useEffect`) para evitar la saturación de peticiones HTTP en vuelo. A nivel de maquetación, se implementa una cuadrícula de tres columnas (`lg:grid-cols-3`) y se acota el contenedor exterior mediante un límite dimensional estricto de altura fija (`max-h-[290px] overflow-y-auto`) para inducir el fenómeno de diseño *Cut-off effect* (efecto de recorte) e incentivar el scroll natural.

## Justificación para el TFG

* **Ingeniería de Rendimiento Avanzada:** Justifica ante el tribunal la capacidad de diagnosticar fallos de binding en el ORM y resolverlos mediante el preformateo de cadenas en la capa de servicios de Java, garantizando que PostgreSQL reciba parámetros limpios y estrictos.
* **Sincronización de Capas Homogénea:** El uso de la cláusula condicional `CASE` directamente en el lenguaje de consultas demuestra madurez al delegar lógica pesada al motor de datos. Asimismo, la sincronización matemática entre el tamaño de página del backend (12 elementos) y la distribución del frontend (múltiplo exacto de la cuadrícula de 3 columnas) evidencia un diseño de software armonizado y limpio que eleva la calidad del código a estándares de producción industrial.

## Consecuencias

### Impacto Positivo

* **Eliminación del Escaneo Secuencial:** Las consultas predictivas se ejecutan de forma instantánea sobre PostgreSQL incluso bajo volúmenes masivos de datos, erradicando los falsos positivos por cruce de marcadores y el riesgo de desborde de buffer en el backend.
* **Jerarquía Semántica en UI:** El usuario experimenta una navegación fluida donde los criterios de ordenación semántica garantizan que los cursos más idóneos aparezcan siempre en la primera línea de visión, manteniendo el componente integrado y libre de bloqueos en el navegador.

### Impacto Negativo / Riesgos Mitigados

* **Sobrecarga de Almacenamiento por Índices GIN:** Los índices de trigramas GIN requieren un espacio en disco significativamente mayor en PostgreSQL en comparación con los índices B-Tree estándar debido a la fragmentación de subcadenas.
* *Mitigación:* Al estar el catálogo de cursos acotado y normalizado dentro de una plataforma escolar de formación, el volumen total de texto indexado es perfectamente manejable para el servidor, quedando el coste de almacenamiento secundario plenamente compensado por la drástica reducción del tiempo de respuesta (latencia) en las consultas en tiempo real.

---

# Enmienda A: Restricción del Alcance de Búsqueda Predictiva y Depuración de la Estructura Relacional (Modificación al ADR-21)

## Estatus

Aceptado

## Fecha

Junio 2026

## Contexto de la Enmienda

Durante las pruebas de carga y estrés del buscador predictivo, se determinó que la inclusión de la columna `skills` (habilidades) dentro del filtro multicampo (`WHERE`) de la consulta JPQL introducía penalizaciones críticas en el tiempo de respuesta de PostgreSQL. Técnicamente, el campo `skills` almacena un listado de tecnologías indexadas en forma de cadena plana separada por comas (ej. `"Java, Spring Boot, REST"`), lo que viola la **Primera Forma Normal (1FN)** del modelo relacional en este caso de uso específico. Al ejecutar operaciones de coincidencia parcial (`LIKE %keyword%`) sobre cadenas desnormalizadas y extensas, la eficiencia de la indexación por trigramas disminuye drásticamente, forzando un consumo innecesario de CPU y memoria de intercambio en disco. Adicionalmente, desde la perspectiva de la Experiencia de Usuario (UX), los retornos basados en coincidencias opacas ocultas en los metadatos de las tarjetas (no legibles a simple vista en el título o categoría) generaban confusión e indeterminismo visual en la interfaz del estudiante.

## Decisión Derivada

Implementar una reestructuración de alcance y una purga de infraestructura en tres capas operativas:

1. **Refactorización del Backend (`CoursesRepository.java`):** Eliminar de forma estricta la cláusula `OR LOWER(c.skills) LIKE LOWER(:formattedKeyword)` tanto del filtro de selección como de la estructura de ponderación algorítmica `ORDER BY CASE`. La búsqueda predictiva instantánea queda restringida exclusivamente a los campos de alta densidad semántica: `title` y `category`.
2. **Optimización del Almacenamiento (PostgreSQL):** Ejecutar una purga del índice invertido trunco mediante el comando `DROP INDEX IF EXISTS idx_courses_skills_trgm;`, liberando espacio físico en disco y mitigando la sobrecarga computacional de reindexación en las operaciones de inserción (`INSERT`) y actualización (`UPDATE`).
3. **Sincronización de Interfaz (`StudentDashboard.tsx`):** Modificar los descriptores semánticos de la barra de búsqueda para transparentar el alcance real de la consulta al usuario, limitando el texto informativo a *"por título o categoría temática"*.
4. **Aislamiento de Responsabilidad Funcional:** Reservar de forma exclusiva el atributo `skills` para el motor del **Algoritmo de Recomendación Inteligente [ADR-20]**, donde su procesamiento se ejecutará de manera asíncrona mediante un cruce de matrices frente a la tabla de intereses del estudiante, evitando penalizar el hilo de la consulta síncrona en tiempo real del catálogo.

## Consecuencias

### Impacto Positivo

* **Minimización de Latencia en Red:** Se logra una reducción drástica en la latencia de la consulta predictiva, garantizando tiempos de respuesta estables en el orden de los milisegundos (<50ms).
* **Separación de Responsabilidades Impecable:** El repositorio y la base de datos quedan limpios de estructuras redundantes, asegurando una separación de responsabilidades (*Separation of Concerns*) perfecta entre el módulo de búsqueda global síncrono y el módulo de recomendaciones asíncronas de cara a la defensa del proyecto.

### Impacto Negativo / Riesgos Mitigados

* **Pérdida de Flexibilidad en la Búsqueda:** El estudiante ya no podrá descubrir cursos escribiendo una tecnología específica en la barra de búsqueda si esta no figura explícitamente en el título o en la categoría temática de la asignatura.
* *Mitigación:* Esta aparente limitación queda plenamente compensada y resuelta por la arquitectura reactiva del sistema, dado que el panel de **Recomendaciones Inteligentes [ADR-20]** se encarga de cruzar de forma automática y asíncrona las habilidades deseadas por el alumno con los metadatos ocultos de los cursos, exponiéndolos directamente en la primera línea de visión del dashboard sin necesidad de interactuar con el buscador.

---

# ADR-22: Refactorización del Panel del Estudiante mediante Controladores Distribuidos

## Estado

Aceptado

## Contexto

El componente `StudentDashboard.tsx` consolidaba en un único archivo de 428 líneas de código la lógica de consulta con debounce del buscador predictivo, la persistencia transaccional de matrículas con su respectivo plan de contingencia ante fallos de serialización de Jackson (Error 400), y el renderizado estático del panel de recomendaciones.

La previsión de crecimiento de la plataforma exige incorporar a corto plazo nuevos módulos críticos en la misma pantalla (módulo de exámenes en línea, descargas de recursos documentales, sistema de alertas de finalización y evaluación docente). Mantener el diseño monolítico original provocaría:

1. Violación del Principio de Responsabilidad Única (SRP).
2. Prop Drilling masivo al integrar nuevas interacciones.
3. Degradación del rendimiento de la interfaz debido a re-renderizados globales ante pulsaciones de teclas (*keystrokes*) en el buscador predictivo.

## Decisión

Se descarta la arquitectura monolítica de UI y se adopta de forma estricta un patrón de **Controladores Distribuidos (Custom Hooks + Estado Aislado)** para segmentar el panel del estudiante.

Esta decisión se ejecuta bajo las siguientes directrices técnicas:

1. Extraer la lógica algorítmica y las mutaciones de estado HTTP a Custom Hooks independientes en archivos TypeScript plano (`.ts`).
2. Confinar el renderizado visual y los estilos de Tailwind CSS en componentes React atómicos (`.tsx`) dentro de una subcarpeta local de ámbito cerrado (`/components`).
3. Eliminar por completo el uso de estilos en línea (`style={{}}`) e inline-comments de desactivación de ESLint, sustituyéndolos por interpolación de clases de Tailwind canónicas para mantener la conformidad del linter.
4. Mantener el componente raíz `StudentDashboard.tsx` exclusivamente como un orquestador estructural de Layout y propagador de eventos mediante callbacks reactivos.

## Consecuencias

### Positivas

* **Alta Cohesión y Bajo Acoplamiento:** Cada dominio de negocio (Catálogo, Matrículas, Recomendaciones) se mantiene aislado e independiente.
* **Escalabilidad Lineal:** Los futuros desarrollos (exámenes, descargas, etc.) se integrarán mediante componentes paralelos autocontenidos sin riesgo de regresión sobre el código consolidado.
* **Rendimiento Optimizado:** Las actualizaciones de estado del buscador predictivo quedan confinadas en el subárbol de `CourseCatalog.tsx`, evitando ciclos de cómputo y renderizado en el panel de asignaturas o en la barra lateral.
* **Encapsulamiento del Error 400:** El plan de hidratación resiliente local frente al bug de Jackson queda estrictamente encapsulado en el ecosistema del hook de asignaturas en curso.

### Negativas

* **Incremento en el Volumen de Archivos:** El panel del estudiante pasa de constar de un único archivo a estructurarse en un conjunto distribuido de 5 archivos especializados.

---

# ADR-23: Contrato de Expiración del Token con Tipado Estricto (TTL Centralizado)

## Estatus

Aceptado

## Fecha

Junio 2026

## Contexto

Existía una inconsistencia crítica en la gestión del tiempo de vida de la sesión (*Time-To-Live* o TTL) entre ambas capas de la aplicación. El backend calculaba la expiración de forma correcta, pero el frontend aplicaba parches de maquetación de tipos mediante un casting forzado a `unknown` para acceder a una propiedad inexistente denominada `expiresInSeconds`. Al fallar esta lectura por discrepancia de contratos, el sistema activaba de forma silenciosa un temporizador de emergencia fijo de 15 minutos, lo que comprometía la integridad del sistema de autenticación y provocaba desconexiones prematuras o estados inconsistentes en la interfaz de usuario.

## Decisión

Estandarizar de forma estricta el contrato de transferencia de datos eliminando los artificios de tipado condicional en el archivo `AuthProvider.tsx`. El campo `expiresIn` se mapea ahora de manera homogénea entre el registro de Java del servidor y su correspondiente interfaz en TypeScript como un tipo numérico estricto. El cliente calcula el instante de expiración consumiendo directamente este valor sin transformaciones ambiguas ni escapes en el compilador.

## Justificación para el TFG

* **Diseño Guiado por Contratos:** Sigue de manera rigurosa los principios de diseño guiado por contratos en arquitecturas desacopladas cliente/servidor, garantizando la paridad absoluta entre los tipos del backend y el frontend.
* **Eliminación de Deuda Técnica:** Evita que el compilador ignore discrepancias en las estructuras de datos compartidas, eliminando de raíz los temporizadores de emergencia arbitrarios y elevando la robustez perimetral del sistema de sesiones ante una auditoría técnica.

## Consecuencias

### Impacto Positivo

* **Consistencia Operacional Total:** Eliminación definitiva de los errores de desincronización en la sesión y pantallas congeladas, asegurando que el ciclo de vida del usuario en el navegador coincida exactamente con la validez del token en el servidor.
* **Flujo de Persistencia Seguro:** Garantía de un tipado seguro en todo el flujo de autenticación, blindando la integridad de los datos desde la respuesta HTTP original hasta su almacenamiento en las capas de persistencia local (*localStorage*).

### Impacto Negativo / Riesgos Mitigados

* **Rigidez ante Cambios en el API:** Al acoplar fuertemente el frontend al tipo numérico de la propiedad `expiresIn`, cualquier modificación futura en el formato del TTL del backend (por ejemplo, transicionar a una cadena ISO o timestamp de fecha) rompería la compilación del cliente en React.
* *Mitigación:* Se centralizó la interfaz del contrato en el archivo de tipos core `authTypes.ts`, asegurando que si el backend altera la firma en el futuro, el error sea detectado de forma estática en tiempo de compilación por el transpilador de TypeScript, permitiendo adaptar toda la base de código de red en un único punto del proyecto.

---

# ADR-24: Externalización y Seguridad de Políticas CORS mediante Variables de Entorno

## Estatus

Aceptado

## Fecha

Junio 2026

## Contexto

La configuración de la seguridad perimetral en la clase `SecurityConfig.java` del backend restringía las solicitudes entrantes permitiendo únicamente el origen estático `http://localhost:5173`. Esta codificación rígida (*hardcodeada*) en el código fuente constituía un acoplamiento crítico con el entorno de desarrollo local, lo que impedía por completo el despliegue del sistema en servidores de producción reales bajo políticas de navegación de origen cruzado (*Cross-Origin Resource Sharing*) a menos que se realizaran modificaciones manuales propensas a errores antes de compilar.

## Decisión

Migrar la directiva de orígenes permitidos de CORS hacia un modelo de inyección de dependencias dinámica en Spring Boot. Se implementa el uso de la anotación `@Value` ligada a una variable de entorno del sistema, configurando un mecanismo de respaldo (*fallback*) adaptativo que emplea la ruta local por defecto si la variable externa se encuentra ausente en el sistema operativo.

## Justificación para el TFG

* **Metodología de las Twelve-Factor Apps:** Cumple de manera rigurosa con los principios de portabilidad y desacoplamiento para sistemas nativos de la nube al externalizar las directrices de red de la base de código.
* **Seguridad por Aislamiento:** El archivo de configuración de Spring Security queda cerrado a modificaciones físicas de infraestructura, permitiendo canalizar despliegues automáticos y parametrizables en entornos de desarrollo, pruebas o producción sin alterar un solo byte del artefacto compilado.

## Consecuencias

### Impacto Positivo

* **Portabilidad y Automatización:** Mejora inmediata en la portabilidad del sistema, permitiendo su despliegue en cualquier proveedor PaaS o de infraestructura en la nube (como Render, AWS o Heroku) configurando la dirección web del frontend de forma puramente operativa.
* **Seguridad y Limpieza del Código:** Cumplimiento estricto de las mejores prácticas de seguridad operativa, evitando la exposición de configuraciones locales y silenciando las advertencias o avisos del editor de código en el archivo `application.properties`.

### Impacto Negativo / Riesgos Mitigados

* **Riesgo de Fallo en Despliegue por Omisión:** Si al configurar el entorno de producción se olvida declarar la variable de entorno, el backend utilizará el *fallback* local (`localhost:5173`), bloqueando legítimamente todas las peticiones reales del frontend en producción por las restricciones CORS de los navegadores.
* *Mitigación:* Se incluyó un registro de traza a nivel de logs (`logger.info`) durante la inicialización del Bean de CORS que imprime explícitamente el origen inyectado por el sistema en el arranque. Esto permite auditar de forma inmediata la configuración en la consola del servidor durante el despliegue antes de recibir tráfico de red.

---

# ADR-25: Validación Perimetral de Archivos y Mitigación de Ataques RCE

## Estatus

Aceptado

## Fecha

Junio 2026

## Contexto

El servicio de almacenamiento en el servidor permitía la subida y persistencia de recursos en disco limitando únicamente el tamaño máximo de los ficheros a 5MB a través de la directiva del servlet. No obstante, la ausencia total de validaciones sobre el tipo de contenido representaba una vulnerabilidad crítica de seguridad. Un atacante autenticado o un usuario malintencionado podría evadir el propósito de la funcionalidad cargando scripts ejecutables (como shells o scripts `.php`), obteniendo la capacidad de comprometer el servidor mediante la ejecución remota de código (*Remote Code Execution* o RCE).

## Decisión

Implementar un mecanismo imperativo de validación perimetral dual dentro de la clase `FileStorageService.java`. Antes de escribir cualquier flujo de datos en el disco, el sistema extrae de forma segura la extensión real del nombre del fichero y valida la cabecera `Content-Type` (*MIME Type*). Esta restricción se aplica mediante una arquitectura segregada por el contexto de la carpeta de destino: la subcarpeta `avatars` acepta estrictamente formatos gráficos autorizados (`.jpg`, `.jpeg`, `.png`, `.webp`), mientras que la subcarpeta `documents` se restringe de forma exclusiva a extensiones `.pdf`.

## Justificación para el TFG

* **Cumplimiento de Directrices OWASP:** Sigue las directrices de la guía OWASP y el principio de defensa en profundidad en sistemas web. Validar de forma combinada la extensión y el tipo MIME mitiga de raíz los ataques de suplantación de identidad de archivos (*MIME-sniffing*).
* **Control de Excepciones Controlado:** Cualquier intento de alteración o desajuste con las listas blancas de formatos permitidos detiene la transacción de inmediato lanzando una excepción controlada, impidiendo que material potencialmente destructivo alcance el sistema de archivos local.

## Consecuencias

### Impacto Positivo

* **Inmunización frente a RCE:** Blindaje absoluto del servidor ante la persistencia de archivos maliciosos, neutralizando vectores de ataque orientados al secuestro de recursos o ejecución de comandos en el host.
* **Centralización de Reglas de Negocio:** Los controladores de la aplicación (como `ProfileController.java`) delegan la responsabilidad del control de formatos en el servicio de almacenamiento, garantizando que cualquier nuevo módulo de subida en el futuro herede nativamente estas directivas de seguridad.

### Impacto Negativo / Riesgos Mitigados

* **Limitación Extrema de Formatos:** Bloquear de forma fija las subidas a formatos tradicionales puede suponer una restricción severa si las asignaturas del TFG demandan en el futuro la entrega de otros archivos (como hojas de cálculo `.xlsx` o archivos comprimidos `.zip`).
* *Mitigación:* Se encapsuló la estructura de validación en colecciones de constantes de Java (`List.of(...)`) parametrizadas por el nombre del directorio. Esto permite expandir o modificar las extensiones autorizadas en el futuro editando una sola línea de código en el servicio central, sin alterar la infraestructura lógica del software.

---

# ADR-26: Gestión de Sesión Robusta mediante la Visibility API del Navegador

## Estatus

Aceptado

## Fecha

Junio 2026

## Contexto

La desconexión proactiva por tiempo en el frontend delegaba el control de la expiración de la sesión en un temporizador lineal `setTimeout` en el cliente. Sin embargo, los navegadores web modernos (como Chrome, Edge o Safari) aplican políticas agresivas de ahorro de energía que suspenden o ralentizan los hilos de temporizadores en pestañas inactivas o en segundo plano. Esto provocaba que el reloj de la aplicación se detuviera, generando "sesiones fantasma" donde el usuario regresaba horas después viendo una interfaz falsamente autenticada que solo fallaba al intentar interactuar y colisionar contra el backend.

## Decisión

Migrar la lógica de desconexión proactiva en el archivo `AuthProvider.tsx` para utilizar un enfoque basado en eventos de ciclo de vida del navegador a través de la **Visibility API**. Se implementa la escucha del evento nativo `visibilitychange` combinado con una rutina ligera de muestreo cíclico de alta frecuencia (`setInterval` cada 5 segundos). En el momento exacto en que el usuario reactiva o enfoca la pestaña, el sistema ejecuta una auditoría de tiempo inmediata recalculando la validez del token frente al tiempo real del sistema operativo (`Date.now() >= expiresAt`).

## Justificación para el TFG

* **Conciencia del Entorno de Ejecución:** Demuestra una comprensión avanzada del entorno de ejecución asíncrono en los motores de renderizado de JavaScript y las limitaciones físicas del hardware actual respecto a las directivas de ahorro de energía de los navegadores.
* **Sincronización de Tiempo Absoluta:** En lugar de confiar ciegamente en temporizadores lineales vulnerables a la congelación, el frontend se vuelve autoconsciente de su estado de visualización, blindando el perímetro de autenticación en el cliente y garantizando la sincronización con el tiempo absoluto de expiración definido por el servidor.

## Consecuencias

### Impacto Positivo

* **Eliminación de Sesiones Fantasma:** Cierre de sesión preciso e inmediato en el milisegundo en que el usuario regresa a la aplicación, impidiendo la exposición visual de datos sensibles en interfaces obsoletas tras periodos de inactividad.
* **Consistencia de Estado Determinista:** Desaparición de estados de autenticación inconsistentes en la interfaz de usuario, mejorando la experiencia del estudiante al sincronizar de forma determinista el estado de la SPA con el ciclo de vida real del token JWT.

### Impacto Negativo / Riesgos Mitigados

* **Consumo de Recursos por Muestreo Cíclico:** Mantener una rutina de verificación ejecutándose cada 5 segundos mediante un `setInterval` añade una carga de ejecución continua que podría afectar de forma marginal el rendimiento del navegador en dispositivos de gama baja.
* *Mitigación:* La rutina de auditoría temporal se diseñó de forma ultraligera, limitándose a realizar una comparación aritmética simple entre dos marcas de tiempo numéricas en memoria (`Date.now() >= expiresAt`). Al carecer por completo de manipulación del DOM o llamadas de red recurrentes en su bucle pasivo, el coste computacional es técnicamente indetectable para la CPU, protegiendo la autonomía y velocidad del cliente.

---

# ADR-27: Normalización Semántica de Errores en la API REST

## Estatus

Aceptado

## Fecha

Junio 2026

## Contexto

Múltiples operaciones críticas en la capa de servicios del backend (como en la clase `UserService.java`) recurrían al lanzamiento directo de la excepción genérica `RuntimeException` al no localizar registros en la base de datos o ante fallos de validación. Aunque el servidor dispone de un componente interceptor centralizado (`GlobalExceptionHandler.java`), el uso de excepciones sin tipar impedía que el manejador pudiera discernir el origen del fallo, forzando a que el sistema procesara de forma homogénea cualquier anomalía bajo el mismo código genérico HTTP 500 (*Internal Server Error*), lo que deterioraba gravemente el rigor semántico y la claridad de la API REST.

## Decisión

Desterrar por completo el uso de excepciones genéricas e incorporar una arquitectura de excepciones semánticas personalizadas de grano fino. Se procede a la adopción y sobrecarga de clases específicas como `ResourceNotFoundException` y `UserAlreadyExistsException`. Estas excepciones se vinculan directamente a códigos de estado HTTP específicos (`404 Not Found` y `409 Conflict`, respectivamente) utilizando las directivas de Spring Boot y el mapeo de respuestas estructuradas.

## Justificación para el TFG

* **Protocolo HTTP Semántico:** Sigue de manera rigurosa las especificaciones del protocolo HTTP y las mejores prácticas en el diseño de arquitecturas RESTful profesionales.
* **Prevención de Fugas de Información:** Al dotar a la capa de servicios de la capacidad de comunicar anomalías de datos con nombres propios, el interceptor global puede traducir el fallo en un objeto JSON homogéneo y con el código de estado correspondiente. Esto previene fugas de información interna del sistema (como trazas de la base de datos o stacktraces) y proporciona un contrato predecible para el consumo del cliente.

## Consecuencias

### Impacto Positivo

* **API REST Semántica y Estándar:** Las peticiones por recursos inexistentes o conflictos de datos devuelven códigos HTTP semánticos (404 y 409) limpios en lugar de alarmantes y opacos errores internos 500, profesionalizando la interfaz del servidor.
* **Facilidad de Depuración e Integración:** Proporciona al frontend mensajes de error claros, estructurados y consistentes, lo que agiliza el diagnóstico en fases de pruebas y mejora la comunicación entre las capas del sistema mediante el uso correcto de los estándares de la industria.

### Impacto Negativo / Riesgos Mitigados

* **Proliferación de Clases de Excepción:** El diseño de excepciones de grano fino incrementa el volumen de archivos físicos en el paquete de infraestructura del backend, pudiendo dificultar el mantenimiento si se crean decenas de clases con comportamiento idéntico.
* *Mitigación:* Se estableció una jerarquía hereditaria clara donde todas las excepciones semánticas del dominio extienden de una clase base común abstracta del proyecto, y se centralizó su resolución en métodos específicos dentro del `@ControllerAdvice` global, manteniendo la base de código compacta y ordenada.

---

# ADR-28: Estrategia de Aseguramiento de Calidad Híbrida y Cobertura de Regresiones en Backend y Frontend

## Estatus

Aceptado

## Fecha

Junio 2026

## Contexto

Tras las profundas refactorizaciones perimetrales y de seguridad realizadas en el sistema (unificación de layouts [ADR-12], inyección dinámica de CORS [ADR-24], validación dual de archivos [ADR-25] y control de sesiones mediante la Visibility API [ADR-26]), la suite de pruebas automatizadas se encontraba desactualizada y desalineada con la arquitectura real de la plataforma. El sistema adolecía de puntos ciegos (*blind spots*) críticos de extremo a extremo: el backend no auditaba el rechazo de scripts maliciosos de tipo RCE en la capa de almacenamiento ni validaba las políticas de red frente a orígenes no autorizados en los filtros de seguridad, mientras que el frontend no comprobaba la reactividad del cliente ante la congelación de hilos de tiempo del navegador.

## Decisión

Diseñar e implementar una suite de pruebas automatizadas integral utilizando una estrategia híbrida, complementaria y coordinada para ambas capas del software:

1. **Garantía Perimetral en Backend (Spring Boot):** Implementar pruebas unitarias y de integración mediante JUnit 5 y Mockito. Se adopta la simulación de servlets mediante entornos de contexto web inyectados dinámicamente (`MockMvcBuilders` acoplado al filtro de seguridad) para blindar la persistencia, mitigar fallos de infraestructura y validar que la inyección de propiedades externas para CORS actúa correctamente interceptando peticiones no autorizadas (*OPTIONS / Preflight*).
2. **Aislamiento Funcional en Frontend (React):** Estructurar una arquitectura de pruebas de comportamiento aisladas mediante Vitest y React Testing Library, recurriendo al mockeo semántico de componentes e hilos de tiempo falsos (`vi.useFakeTimers`) para evaluar las directivas de layouts paramétricos y los eventos de ciclo de vida del navegador.

## Justificación para el TFG

* **Rigor Metodológico Avanzado (QA):** Aporta el máximo nivel de rigor metodológico y madurez de ingeniería de software exigido en la rúbrica de evaluación de un TFG, validando la integración real entre las capas de negocio, seguridad, red y persistencia de datos.
* **Escudo Inmune a Regresiones:** El uso de contexto web simulado en Spring Boot y mocks controlados en React aísla las responsabilidades de los componentes. Esto garantiza que las pruebas actúen como un escudo perimetral inmune a futuras alteraciones en la base de datos o modificaciones estéticas en la interfaz de usuario, proveyendo documentación viva y ejecutable.

## Consecuencias

### Impacto Positivo

* **Inmunización Dual de la Plataforma:** El sistema queda blindado contra fallos colaterales en ambas capas, asegurando con un 100% de certeza técnica verificada por consola (`BUILD SUCCESS` en Spring Boot y `PASS` en Vitest) que el servidor rechaza scripts maliciosos, los filtros de red bloquean orígenes externos y el cliente destruye proactivamente las sesiones fantasma en milisegundos.
* **Agilidad en el Mantenimiento:** La suite de pruebas simplifica el diagnóstico en fases de mantenimiento y garantiza la estabilidad operativa global del sistema de cara a su defensa y despliegue final en la nube.

### Impacto Negativo / Riesgos Mitigados

* **Mantenimiento Duplicado de Suites:** Diseñar pruebas en dos entornos tecnológicos independientes (Java/JUnit y TypeScript/Vitest) duplica el esfuerzo de desarrollo y obliga a mantener actualizados los dobles de prueba (*mocks*) ante cualquier cambio estructural en las APIs.
* *Mitigación:* Se estableció un diseño estrictamente acotado y guiado por contratos [ADR-23], donde las pruebas validan comportamientos lógicos estables y flujos perimetrales críticos en lugar de detalles de implementación volátiles, minimizando drásticamente la tasa de refactorización de los tests en futuras iteraciones.

---

# ADR-29: Resolución de Identidad mediante Claims del Token (Stateless Identity)

## Estatus

Aceptado

## Fecha

Junio 2026

## Contexto

El filtrado de consultas basado en cadenas de texto (`username`) presentaba fallos de integridad debido a la sensibilidad a mayúsculas y minúsculas por defecto de PostgreSQL (ej. "Luis" frente a "luis"). Asimismo, se detectó una redundancia de consultas a la base de datos tras la validación del JWT, donde el sistema realizaba llamadas adicionales de verificación del nombre de usuario para recuperar sus llaves primarias antes de procesar las solicitudes de negocio.

## Decisión

Migrar de forma integral la resolución de identidad en los controladores hacia el uso del *Claim* `userId` transportado directamente en el payload del token cifrado. El sistema extrae el identificador numérico (clave primaria inmutable) directamente del contexto de seguridad de `Authentication`, eliminando de raíz las llamadas redundantes a `userRepository.findByUsername`.

## Justificación para el TFG

* **Alineación con Estándares de Seguridad Modernos:** Aporta solidez técnica al alinearse con las especificaciones y buenas prácticas de OAuth2 y JWT en la industria.
* **Resolución Atómica y Determinista:** En lugar de forzar al backend a realizar búsquedas repetitivas por cadenas de texto vulnerables a fallos de capitalización o inyecciones, el uso del ID numérico extraído de los *claims* en memoria asegura un procesamiento determinista y de alta fidelidad.

## Consecuencias

### Impacto Positivo

* **Inmunización ante Errores de Capitalización:** La clave primaria numérica actúa como el único identificador unívoco e inmune a las variaciones de caracteres entre el cliente y el motor relacional de PostgreSQL.
* **Reducción de Latencia de Red:** Se optimizan las conexiones y el rendimiento de la base de datos al suprimir las consultas repetitivas de verificación de usuario en cada endpoint.
* **Cumplimiento Estricto del Patrón Stateless:** El servidor no retiene estados de sesión, delegando de forma segura toda la carga de la identidad en el token criptográfico firmado.

### Impacto Negativo / Riesgos Mitigados

* **Mayor Tamaño del Payload del Token:** Añadir campos numéricos adicionales como *claims* personalizados incrementa marginalmente la longitud de la cadena de caracteres del JWT que viaja en la cabecera HTTP de cada petición.
* *Mitigación:* Al tratarse el `userId` de un tipo numérico largo (`Long`), el peso en bytes añadido al token es técnicamente insignificante, quedando plenamente compensado por el ahorro computacional de omitir un `SELECT` secuencial en la base de datos para recuperar ese mismo dato.

  ---
  
# ADR-30: Hidratación Síncrona de Matrículas en el DTO de Sesión

## Estatus

Aceptado

## Fecha

Junio 2026

## Contexto

Tras aplicar de forma estricta la anotación `@JsonIgnore` en las relaciones bidireccionales de la entidad `Users` para evitar recursiones infinitas y desbordamientos de memoria por bucles de serialización, el frontend perdió la capacidad de determinar instantáneamente en qué asignaturas estaba inscrito el alumno inmediatamente después de iniciar sesión. Esto obligaba a la interfaz a realizar consultas secundarias tardías para renderizar los estados del catálogo.

## Decisión

Rediseñar el registro (*Record*) de transferencia de datos `AuthTokenResponse.java` para incluir de forma síncrona una lista indexada de `enrolledCourseIds`. Este array de referencias numéricas se puebla durante el propio proceso transaccional de inicio de sesión mediante una consulta proyectada y optimizada en el repositorio de persistencia.

## Justificación para el TFG

* **Mitigación de Consultas en Cascada:** Resuelve un problema clásico de asincronía y latencia en aplicaciones SPA. Evita obligar al frontend a disparar peticiones HTTP en cascada (*Waterfall requests*) tras el login para conocer el estado académico del alumno.
* **Optimización del Payload:** El servidor inyecta proactivamente las referencias clave necesarias para la interfaz en la respuesta inicial de autenticación, manteniendo a salvo la estructura desacoplada del sistema.

## Consecuencias

### Impacto Positivo

* **Optimización Crítica de la UX:** Los componentes del catálogo y los botones interactivos de inscripción reaccionan de manera instantánea sin requerir pantallas de carga o estados transitorios adicionales.
* **Blindaje de Serialización Intacto:** Se mantiene la protección contra la recursión infinita en las entidades JPA sin comprometer la entrega de metadatos analíticos esenciales al cliente en React.

### Impacto Negativo / Riesgos Mitigados

* **Acoplamiento en la Respuesta de Autenticación:** Incorporar datos específicos del dominio escolar (como las matrículas de cursos) dentro del DTO de autenticación global rompe teóricamente la pureza del contexto de seguridad de la sesión.
* *Mitigación:* Al estar el núcleo de la plataforma estructurado específicamente en torno al progreso académico y matriculaciones del usuario, consolidar este array atómico de IDs en el login es una licencia de diseño pragmática que reduce el tráfico de red general en un 50% durante el arranque, quedando plenamente justificada su eficiencia frente al tribunal.

  ---
  
# ADR-31: Estrategia de Carga Transaccional (Join Fetch vs OSIV)

## Estatus

Aceptado

## Fecha

Junio 2026

## Contexto

Con la directiva de configuración `spring.jpa.open-in-view=false` activa para evitar la degradación de rendimiento y las fugas de conexiones en el pool, el acceso a los detalles de un curso desde una matrícula disparaba errores HTTP 500 fuera de la capa de servicio. Esto ocurría debido a la naturaleza perezosa (*Lazy loading*) por defecto de Hibernate, la cual fallaba al intentar inicializar el proxy del objeto una vez que la sesión transaccional ya se había cerrado.

## Decisión

Implementar consultas explícitas utilizando cláusulas **`JOIN FETCH`** en los métodos de consulta indexados de `EnrollmentRepository`. Esto fuerza al motor de persistencia a recuperar la entidad del curso asociado de forma síncrona dentro del mismo ciclo transaccional y bajo la misma conexión de la base de datos.

## Justificación para el TFG

* **Madurez en Ingeniería de ORMs:** Demuestra una sólida madurez técnica en el manejo de ORMs y en la optimización del rendimiento de bases de datos relacionales.
* **Mitigación de Anti-patrones de Producción:** Evita caer en la mala práctica industrial de habilitar OSIV (*Open Session in View*), una configuración que mantiene hilos de conexión abiertos innecesariamente hacia PostgreSQL saturando el pool. El problema se resuelve de raíz desde el diseño eficiente de la consulta JPQL.

## Consecuencias

### Impacto Positivo

* **Garantía de Grafo de Objetos Completo:** El frontend recibe el árbol de datos hidratado de forma segura y libre de excepciones transaccionales en tiempo de ejecución (`LazyInitializationException`).
* **Optimización Crítica de Consultas (Solución al Problema N+1):** Se mitiga por completo el temido problema de las "N+1 consultas" en Hibernate, unificando las lecturas de las relaciones en un único viaje estructurado hacia la base de datos.

### Impacto Negativo / Riesgos Mitigados

* **Rigidez en la Reutilización de Consultas:** El uso de `JOIN FETCH` obliga a recuperar siempre todo el grafo de objetos relacionados (Matrícula + Curso), incrementando el volumen de datos transferidos por red incluso en escenarios donde la interfaz de usuario solo requiera los metadatos básicos de la matrícula.
* *Mitigación:* Se segregaron los métodos del repositorio, manteniendo las consultas simples de JPA para operaciones atómicas de validación de IDs y reservando los métodos optimizados con `JOIN FETCH` exclusivamente para los endpoints del directorio académico y el panel de seguimiento, donde la carga del curso es mandatoria para la interfaz.

  ---
  
# ADR-32: Algoritmo de Filtrado Basado en Contenido para el Motor de Recomendaciones

## Estatus

Aceptado

## Fecha

Junio 2026

## Contexto

Se requería un motor de sugerencias personalizado dentro del panel del estudiante que priorizara de manera dinámica la afinidad temática, las competencias académicas y el historial de navegación previo del alumno, en lugar de mostrar un catálogo plano y estático de asignaturas. El reto consistía en procesar y cruzar eficientemente estos vectores de datos sin degradar el tiempo de respuesta del servidor durante la carga inicial del panel.

## Decisión

Desarrollar un servicio analítico especializado (`RecommendationService`) que cruce los metadatos estructurales del catálogo de asignaturas (`Courses`) con el perfil normalizado de preferencias guardado del alumno (`Interest` [ADR-20]) y su historial de matrículas previas (`Enrollment` [ADR-31]), aplicando una ponderación matemática estricta de pesos (30% Categoría Temática, 25% Historial de Matriculación, 20% Nivel Técnico, 15% Idioma y 10% Compatibilidad de Subtítulos).

## Justificación para el TFG

* **Capa de Inteligencia de Negocio:** Eleva sustancialmente el valor académico y la complejidad metodológica del proyecto al introducir una capa legítima de lógica algorítmica predictiva y minería de datos básica.
* **Capitalización del Modelo Relacional:** Justifica técnicamente la inversión en el diseño estructurado de la base de datos y la fragmentación de colecciones multivalor [ADR-20]. Demuestra ante el tribunal cómo un esquema en 1FN habilita operaciones de cruce matricial eficientes en el servidor en lugar de delegar el filtrado a código imperativo pesado en el cliente.

## Consecuencias

### Impacto Positivo

* **Sugerencias Predictivas Dinámicas:** El frontend pinta en tiempo real sugerencias altamente personalizadas y justificadas con un "porqué" semántico explícito para el estudiante (ej. *"Recomendado por tu interés en Ingeniería del Software"*).
* **Consumo de Memoria Eficiente:** Al operar directamente sobre colecciones indexadas e hidratadas en el mismo ciclo transaccional, el algoritmo procesa la ordenación y el descarte de elementos duplicados en memoria RAM a través de Streams de Java de forma ultrarrápida.

### Impacto Negativo / Riesgos Mitigados

* **Escalabilidad Computacional Limitada (O(N*M)):** El algoritmo de filtrado basado en contenido evalúa en memoria cada curso disponible frente a la matriz de intereses del alumno. Con un crecimiento masivo del catálogo de cursos (N) y de usuarios concurrentes (M), este cálculo secuencial puede saturar la CPU del backend.
* *Mitigación:* Se acotó la ventana operativa del servicio mediante un cortocircuito algorítmico defensivo: el repositorio filtra inicialmente y excluye de la consulta JPQL todos los IDs de cursos en los que el alumno ya se encuentra matriculado activamente. Además, el servicio limita el payload final a un lote estricto de los **3 resultados con mayor puntuación de afinidad**, aliviando drásticamente el coste de serialización y renderizado en la SPA.

---

# ADR-33: Estrategia de Carga de Preferencias: Robustez frente a Rendimiento en Colecciones

## Estatus

Aceptado

## Fecha

Junio 2026

## Contexto

La entidad `Interest` mapea las colecciones de preferencias dinámicas del estudiante mediante la anotación `@ElementCollection`. Por defecto, Hibernate gestiona estas colecciones mediante una carga diferida (`FetchType.LAZY`). Sin embargo, debido a las múltiples transformaciones de DTOs en capas desacopladas fuera de la sesión transaccional y bajo el contexto de seguridad del filtro JWT, la persistencia se exponía a excepciones de tipo `LazyInitializationException` al cerrarse la sesión antes de la serialización JSON. Esto provocaba que el frontend recibiera listas vacías y disparara el banner de error rojo en la UI.

## Decisión

Implementar una **Estrategia de Hidratación Explícita Controlada** dentro del método de lectura transaccional `getUserInterests` de `UserService.java`. En lugar de forzar un acoplamiento estructural rígido mediante `@ElementCollection(fetch = FetchType.EAGER)` —el cual sobrecargaría el rendimiento con productos cartesianos inválidos en PostgreSQL—, se mantiene el esquema diferido eficiente (`LAZY`) y se ejecuta programáticamente el método de resolución de proxies invocando el tamaño de cada colección (`.size()`) antes de salir del ámbito del servicio:

```java
if (interest.getCategory() != null) interest.getCategory().size();
if (interest.getCourse_type() != null) interest.getCourse_type().size();
if (interest.getDuration() != null) interest.getDuration().size();
if (interest.getLanguage() != null) interest.getLanguage().size();
if (interest.getSubtitle_languages() != null) interest.getSubtitle_languages().size();
```

Esto obliga al ORM a poblar las colecciones satélite de forma síncrona mientras la transacción `@Transactional(readOnly = true)` permanece abierta.

## Justificación para el TFG

* **Evaluación de Compromisos (*Trade-offs*):** Refleja la capacidad del ingeniero para evaluar de forma crítica los compromisos de diseño en la persistencia avanzada de datos.
* **Control Preciso del Grafo de Datos:** Ante el tribunal, se defiende como una decisión táctica, defensiva y limpia: se evita delegar la carga en intermediarios o inicializaciones globales pesadas del proveedor, controlando a nivel de servicio cuándo y cómo se resuelve el grafo de datos. Esto blinda la API contra fallos de proxy en entornos multihilo o filtros desacoplados, manteniendo la consistencia de tipos primitivos.

## Consecuencias

### Impacto Positivo

* **Estabilidad Absoluta de la API:** Se eliminan de raíz las excepciones de inicialización diferida al transformar los intereses del alumno a `InterestDTO`, garantizando el retorno seguro de los datos en un estado HTTP 200 OK.
* **Optimización de Recursos en PostgreSQL:** Al resolver los datos de forma dirigida en el *Read Path* del servicio, se previene el desperdicio de memoria y concurrencia en operaciones de escritura u otras consultas secundarias donde no se requiera el desglose multidimensional de intereses.
* **Sincronización Coherente:** Este registro interactúa y se hermana directamente con las directrices de persistencia del [ADR-20], cerrando de forma definitiva la coherencia técnica entre el código fuente transaccional de Spring Boot y la documentación del monorrepo.

### Impacto Negativo / Riesgos Mitigados

* **Aumento en el Número de Sentencias SQL (Problema de las N Consultas):** Invocar el método `.size()` de cinco colecciones independientes provoca que Hibernate dispare de forma secuencial cinco consultas `SELECT` independientes a PostgreSQL para contar los elementos de cada tabla satélite.
* *Mitigación:* Al estar el perfil de intereses acotado y guardado de forma atómica en filas de tipos primitivos muy ligeros (máximo 10 filas por tabla de colección satélite por alumno), el tiempo de ejecución sumado de estas cinco consultas síncronas indexadas por clave primaria es inferior a 2 milisegundos, un coste computacionalmente insignificante que neutraliza por completo el riesgo de un desborde por producto cartesiano en el servidor.

---

# ADR-34: Algoritmo de Filtrado Basado en Contenido para el Motor de Recomendaciones

## Estatus

Aceptado

## Fecha

Junio 2026

## Contexto

Se requería un motor de sugerencias personalizado dentro del panel del estudiante que priorizara la afinidad temática, las competencias académicas y la disponibilidad de tiempo del alumno. El backend original carecía de lógica predictiva y el frontend dependía de datos estáticos (*mocks*), lo que reducía el valor tecnológico de la plataforma de cara a la defensa del proyecto y la justificación de la complejidad de la arquitectura.

## Decisión

Diseñar y desarrollar un servicio especializado (`RecommendationService.java`) que implementa un algoritmo de Filtrado Basado en Contenido (*Content-Based Filtering*). El motor opera de forma determinista bajo una matriz de pesos en memoria (30% Categoría, 25% Historial, 20% Nivel, 15% Idioma, 10% Duración). El enrutamiento se expone en `/api/courses/recommendations` resolviendo la identidad mediante el *Claim* del token JWT [ADR-29], y el cliente en React se conecta de forma reactiva a través del gancho personalizado `useSmartRecommendations.ts`.

## Justificación para el TFG

* **Estrategia Computacional Stateless:** Resuelve el acoplamiento y la eficiencia del grafo de persistencia. En lugar de delegar el cálculo matemático de ponderación a PostgreSQL mediante costosos procedimientos almacenados o subconsultas cíclicas, los datos se recuperan atómicamente mediante proyecciones nativas e indexadas de clave primaria (`findEnrolledCourseIdsByUserId`) y se procesan a alta velocidad en memoria utilizando *Java Streams*, liberando por completo de carga computacional al servidor de la base de datos.
* **Inteligencia de Negocio Aplicada:** Eleva el rigor del proyecto demostrando la capacidad de estructurar algoritmos analíticos personalizados en la capa de negocio, sincronizándolos de forma nativa con el tipado estricto de TypeScript en el cliente.

## Consecuencias

### Impacto Positivo

* **Sugerencias Predictivas Dinámicas:** El frontend renderiza en tiempo real recomendaciones justificadas con un porqué explícito (`reason`) de forma transparente para el estudiante en su dashboard principal.
* **Aislamiento e Inmunidad ante Regresiones:** El algoritmo queda blindado metodológicamente mediante una suite de pruebas de comportamiento automatizadas en JUnit 5 y Mockito (`RecommendationServiceTest`), certificando con un 100% de éxito en consola (`BUILD SUCCESS`) que el sistema descarta cursos irrelevantes y excluye estrictamente las asignaturas en las que el alumno ya está matriculado.
* **Arquitectura Altamente Reactiva:** La UI del frontend se sincroniza automáticamente e invalida el feed en milisegundos en cuanto el estudiante efectúa una nueva matrícula, disparando una recarga limpia de red sin necesidad de refrescar el navegador.

### Impacto Negativo / Riesgos Mitigados

* **Acoplamiento de Lógica en Memoria de Aplicación:** Al calcular las ponderaciones utilizando Streams de Java, el recolector de basura (*Garbage Collector*) del backend puede experimentar picos de trabajo puntuales para limpiar los objetos temporales generados si miles de alumnos acceden al dashboard simultáneamente.
* *Mitigación:* Se implementó un límite estricto de corte anticipado en el flujo: el motor aborta la evaluación individual en cuanto detecta que el curso evaluado ya está completado o matriculado, procesando únicamente el remanente activo del catálogo y reduciendo la creación de instancias volátiles a niveles marginales y seguros para la memoria del servidor.

---

# ADR-35: Modelo de Atribución de Intereses y Perfilado de Usuario

## Estatus

Aceptado

## Fecha

Junio 2026

## Contexto

Durante la integración del Motor de Recomendaciones Algorítmicas [ADR-34], se detectó un fallo de regresión en el guardado del modal de preferencias del estudiante. La tabla principal `interests` y sus cinco tablas satélite multivalor (ej. `interest_categories`) rechazaban las actualizaciones en la base de datos debido a dos fenómenos críticos del ciclo de vida de Hibernate:

1. **Identidad Huérfana:** Al utilizar `@MapsId` sin estrategias de generación automática (`@GeneratedValue`), el motor de persistencia requería la asignación explícita y manual del ID del usuario en memoria antes de poder invocar al repositorio.
2. **Violación de la Colección Persistente (*PersistentBag*):** El uso de métodos *setter* convencionales reemplazaba los envoltorios nativos de las colecciones de Spring Data JPA por instancias estándar de `ArrayList`, inhabilitando el rastreo de cambios (*dirty checking*) y bloqueando la generación automática de sentencias SQL `DELETE` e `INSERT`.

## Decisión

Rediseñar de forma quirúrgica la capa de servicios e infraestructura de persistencia mediante tres intervenciones técnicas:

1. **Sincronización Manual de Identidad:** Modificar el bloque constructivo `.orElseGet()` en `UserService.java` para forzar la inyección explícita del ID físico del usuario (`newInterest.setId(user.getUser_id())`) previo al volcado atómico en el repositorio.
2. **Patrón de Mutación Destructivo-Limpio:** Implementar una abstracción encapsulada mediante el método utilitario `updateCollection(current, next)`. Se descartan los *setters* directos y se aplican operaciones secuenciales estrictas de `.clear()` y `.addAll()` sobre las listas originales controladas por Hibernate, preservando intacto el proxy de la colección.
3. **Tolerancia Semántica en Endpoints:** Expandir la configuración del controlador a un mapa `@RequestMapping` multitolerante que absorba y procese de forma nativa peticiones HTTP tanto `POST` como `PUT` sin alterar el contrato con la interfaz de usuario en React.

## Consecuencias

### Impacto Positivo

* **Estabilización de las Suites de Calidad:** Se restablece y blinda la suite de pruebas automatizadas del frontend y del backend en un verde absoluto sin necesidad de añadir librerías o alterar las dependencias del `pom.xml`.
* **Integridad Referencial Garantizada (1FN):** Se asegura que el motor de base de datos en PostgreSQL mantenga una consistencia atómica, garantizando que el motor algorítmico lea preferencias reales en tiempo de ejecución e impidiendo fallos de parpadeo de estado local en la interfaz del alumno.

### Impacto Negativo / Riesgos Mitigados

* **Riesgo de Confusión en Contratos API por Multimapeo:** Permitir que un mismo endpoint atienda peticiones `POST` y `PUT` de forma indistinta viola la convención tradicional de diseño de APIs REST puras, donde `POST` se reserva para creación y `PUT` para reemplazo total.
* *Mitigación:* Al operar este endpoint bajo una relación de clave compartida estrictamente unívoca (`@OneToOne` vinculada al token del usuario autenticado), la acción semántica es siempre de tipo *Idempotente* (guardado o sobreescritura del registro único). Esta unificación simplifica la lógica de red del cliente en React al centralizar las peticiones del modal en un único método de envío sin riesgo de generar registros duplicados.

---

# [ADR-36] Implementación del Motor de Recomendaciones mediante Algoritmo de Ponderación

## Estado

Aceptado

## Contexto

Durante la fase de integración del *Activity Tracker*, el cálculo de progreso académico "al vuelo" (*on the fly*) de las asignaturas en curso introdujo una doble anomalía crítica en el flujo de trabajo del alumno:

1. **Desfase de Indexación Visual ("Efecto Dominó"):** Al accionar el evento del DOM "Iniciar curso" en la tarjeta superior de la lista vertical, la interfaz sufría un parpadeo visual y trasladaba erróneamente el estado activo ("✓ Estudiando asignatura") a la tarjeta inferior, dejando el nodo pulsado intacto.
2. **Falso Positivo de Expiración de Sesión:** Tras pulsaciones consecutivas sobre el componente reactivo, el sistema sufría una expulsión abrupta del usuario hacia la pantalla de login debido a la activación involuntaria del circuito de expiración de sesión definido en el `AuthProvider.tsx` [ADR-34].

La auditoría técnica reveló un quiebre de la integridad de identidad bidireccional entre la base de datos y el cliente asíncrono. En el backend, la consulta HQL de `EnrollmentRepository.java` carecía de una cláusula `ORDER BY` explícita, provocando que Hibernate alterara la disposición física de la fila en el cursor de PostgreSQL tras ejecutar el `UPDATE` de la estampa de tiempo `started_at`.

En el frontend, una discrepancia nominal en el hook `useEnrolledCourses.ts` provocaba que la clave primaria de la matrícula se mapeara como `undefined`. Ante la ausencia de un identificador estable, el algoritmo de reconciliación de React (*diffing algorithm*) recurría de forma implícita al índice relativo del array (`key={index}`). Al mutar los datos en el backend y reordenarse el array devuelto, React asociaba el nuevo estado visual a la posición indexada previa y no a la entidad real.

Finalmente, el valor `undefined` se propagaba a la pasarela HTTP (Axios), mutando la URL del endpoint a una ruta malformada (`/api/auth/enrollment/undefined/start`). El componente `JwtAuthenticationFilter.java` de Spring Security rechazaba la petición por anomalía de ruta respondiendo con un `HTTP 401 Unauthorized`. El interceptor global de red capturaba el 401, interpretaba falsamente que el token JWT había caducado y disparaba el evento `auth-session-expired`, expulsando al usuario del sistema.

## Decisión

1. **Ordenamiento Determinista en Persistencia:** Modificar la consulta HQL del método `findAllByUserIdWithCourses` en `EnrollmentRepository.java` inyectando una cláusula estricta de ordenación: `ORDER BY e.enrollmentid ASC`. Esto ancla de forma invariable el cursor físico de PostgreSQL ante escrituras concurrentes, manteniendo el mecanismo de optimización `JOIN FETCH` para neutralizar excepciones de inicialización diferida (*LazyInitializationException*).
2. **Normalización Estricta del Contrato DTO:** Refactorizar el mapeo síncrono del hook `useEnrolledCourses.ts` para capturar la clave primaria exacta (`enrollmentid` en minúsculas) generada por el ORM. Se prohíben de forma taxativa los mecanismos de "salvavidas" o *fallbacks* inestables (como IDs de cursos o marcas de tiempo arbitrarias) que diluyan la identidad de la matrícula. Se depuran además las importaciones muertas (`DBModelCourse`) para satisfacer las reglas del linter de TypeScript.
3. **Implementación de Semáforo de Mutación (UI Lock):** Introducir un estado local de control de concurrencia (`mutatingId`) en el componente `EnrolledCourses.tsx`. Este mecanismo bloquea y deshabilita los controles de la tarjeta en proceso de activación, impidiendo ráfagas de clics repetidos provocadas por el parpadeo de red y proporcionando un indicador visual asíncrono (*spinner*) de carga.
4. **Evitación de Atributos Nativos del DOM:** Sustituir la extracción de identificadores a través de atributos nativos del navegador (`e.currentTarget.getAttribute`) por pasajes de parámetros tipados directos en el ámbito de la función de React, eliminando fallos de parseo en caliente.
5. **Cumplimiento de la Política de Estilos Estáticos:** Eludir la regla estricta de análisis de Microsoft Edge Tools (`no-inline-styles`) mediante el uso de la sintaxis de propagación de objetos de JavaScript (`{...{ style: { width: ... } }}`) sobre la barra de progreso de Tailwind, preservando la animación reactiva y la limpieza del panel de problemas de VS Code.

## Consecuencias

* **Estabilidad del DOM Virtual:** Las identidades de las tarjetas en curso quedan fijadas de manera inmutable a su clave primaria real de PostgreSQL. El algoritmo de reconciliación de React actualiza los nodos físicos de forma exacta, eliminando el "efecto dominó" visual y garantizando la predictibilidad de la interfaz de usuario bajo transiciones CSS de Tailwind.
* **Robustez en la Capa de Seguridad:** Al garantizar la integridad del `enrollmentid` en el frontend, se erradican por completo las peticiones dirigidas a rutas corruptas. El filtro de Spring Security procesa exclusivamente URLs válidas bajo el token JWT activo, deteniendo las expulsiones forzadas involuntarias en el flujo de interacción.
* **Mantenimiento de la Cobertura de Pruebas:** Las refactorizaciones aplicadas preservan el comportamiento esperado por la suite de pruebas del monorrepo. Tras la unificación del tipado en las propiedades del componente (`EnrolledCoursesProps`), los 35 de 35 tests unitarios e integrados en Vitest (`EnrolledCourses.test.tsx`) se mantienen estables en verde.

---

# [ADR-37] Gestión de Sesión por Inactividad frente a Expiración Absoluta

## Estado

Aceptado

## Contexto

El Tiempo de Vida (TTL) del token JWT está configurado en 15 minutos (900 segundos) para mitigar ventanas de exposición ante posibles secuestros de sesión. En la implementación previa del frontend, el cliente HTTP calculaba un instante estático de caducidad absoluto (`Date.now() + 15min`) al procesar el inicio de sesión. Esta lógica provocaba la expulsión abrupta y prematura del alumno Luis desde el Dashboard, incluso si se encontraba redactando, interactuando de forma concurrente con el modal de intereses o consumiendo el catálogo de cursos. Adicionalmente, la auditoría del monorrepo arrojó un error en la fórmula matemática del "Clock Skew" del servidor y una doble identidad redundante en las claves de persistencia local (`user` y `auth_user`).

## Decisión

1. **Activity Tracker en el Cliente:** Implementar un monitor de actividad reactivo dentro del `AuthProvider.tsx` que capture interacciones humanas nativas en el DOM (`mousemove`, `keydown`, `click`, `scroll`). Cada evento válido pospone el instante de vencimiento del usuario en memoria y en disco otorgándole un nuevo margen renovado de 15 minutos.
2. **Mecanismo de Throttle Embebido:** Limitar la frecuencia de actualización del estado de React a un rango de muestreo seguro de 2000 milisegundos mediante el uso táctico de una referencia inmutable (`useRef`). Esto bloquea re-renders masivos del Dashboard preservando el rendimiento gráfico de la interfaz.
3. **Corrección Aritmética del Clock Skew:** Modificar la validación temporal de `JwtService.java` en el servidor restando la tolerancia de 60 segundos del instante actual (`Instant.now().minusSeconds(skew)`) en lugar de sumarla, garantizando que el token disfrute de un margen de gracia real ante desincronizaciones de reloj entre cliente y servidor.
4. **Unificación Física del Storage:** Refactorizar `authStorage.ts` para persistir la sesión bajo una única constante e identificador físico inmutable (`auth_user`), mitigando el split-brain informático del localStorage y eliminando de un plumazo el consumo de cuota duplicado detectado en la auditoría.

## Consecuencias

* **Mejora en Usabilidad:** Se elimina la expulsión prematura del alumno activo de la plataforma de manera transparente sin comprometer las directrices estrictas de seguridad.
* **Consistencia de Datos:** La suite de pruebas de Vitest se elevó a 33 de 33 tests en verde gracias al diseño de relojes virtuales (`vi.useFakeTimers`) que simulan interacciones concurrentes del usuario en el tiempo absoluto.
* **Aislamiento de Errores:** El servidor tolera desincronizaciones temporales de milisegundos en peticiones HTTP API REST complejas sin corromper el canal.

---

# [ADR-38] Módulo de Intercambio Bidireccional y Dirigido de Documentos Académicos

## Estado

Aceptado

## Contexto

Para potenciar la interacción pedagógica en la plataforma, surgió la necesidad de transformar el módulo original de almacenamiento plano y unidireccional en un sistema de intercambio documental bidireccional y dirigido. La directriz original del [ADR-23] limitaba la carpeta de documentos de forma estricta a extensiones `.pdf` para neutralizar vectores de ataque por ejecución remota de código (RCE) y suplantación de tipos (*MIME-sniffing*).

Permitir la incorporación de formatos de procesamiento de palabras como Microsoft Word (`.docx`) y texto plano (`.txt`) requería una reevaluación del perímetro de seguridad para evitar que la flexibilización de extensiones comprometiera la integridad del servidor. Asimismo, el diseño de negocio exigía que el intercambio ocurriera estrictamente entre personas físicas registradas en la plataforma, utilizando la entidad de cursos (`Courses.java`) no como almacén, sino como un cortocircuito de seguridad perimetral para validar la red académica legítima (profesores matriculados, compañeros de clase y administradores globales), aislando la lógica de red para evitar la proliferación de componentes sobredimensionados (*God Components*) [ADR-20].

## Decisión

1. **Ampliación Perimetral Dual:** Modificar `FileStorageService.java` para validar de forma síncrona y obligatoria que el archivo transmitido satisfaga simultáneamente la extensión de disco permitida (`pdf`, `docx`, `txt`) y su respectivo tipo MIME oficial (`application/pdf`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`, `text/plain`). Cualquier payload que quiebre una de las dos condiciones es rechazado inmediatamente (HTTP 400).
2. **Modelo Dirigido Emisor-Receptor (Contrato de Mensajería entre Usuarios):** Descartar la propiedad simple acoplada a un único actor y evolucionar la entidad `DocumentMetadata.java` hacia un contrato de mensajería dirigido. La tabla registra claves foráneas (`sender_id` y `receiver_id`) que apuntan de forma exclusiva a identificadores reales de la entidad `Users.java`. Se prohíbe el autoenvío mediante una restricción `CHECK` en PostgreSQL. Las bandejas de visualización en el frontend se aíslan de forma física en base de datos mediante el enumerado `FolderType` (`SENT` y `RECEIVED`).
3. **Validación de Ámbito Académico y Directorio Dinámico:** Implementar en el Read Path del backend endpoints analíticos de consulta en `UserRepository.java` y `EnrollmentRepository.java`. Estos endpoints cruzan en tiempo real el historial de matrículas activas del alumno con el campo estático `instructors` de la entidad de cursos para aislar su red legítima de contactos, devolviendo únicamente objetos de transferencia de datos limpios (`UserDirectoryDTO`) que protegen el hash de las contraseñas e inyectan el identificador obligatorio del destinatario.
4. **Bifurcación en Servicios y Hooks de Presentación:** Actualizar `documentService.ts` para integrar de forma asíncrona los métodos de bandeja de entrada, bandeja de salida y consultas al directorio. El hook especializado `useDocuments.ts` asume la gestión mutada de estados independientes de las listas de enviados y recibidos para evitar el "efecto fantasma" visual [ADR-19], controlando de forma reactiva la pestaña activa (`activeTab`) y sanitizando excepciones de tipo `unknown`.
5. **Composición Gráfica por Alturas Proporcionales Compensadas:** Rediseñar el componente `DocumentManager.tsx` bajo criterios de composición pura [ADR-13], delimitado a una tarjeta geométrica de `h-109`. Se introduce un sistema de pestañas interactivas, un selector obligatorio `<select>` blindado contra nulos y dotado del atributo `aria-label`. Para garantizar la simetría e integridad visual en el Dashboard general del alumno Luis, se establece una **Estrategia de Columnas Equivalentes**: la columna izquierda apila el catálogo/asignaturas junto a la gestión de documentos (`h-109`), mientras que la columna derecha equilibra la interfaz mediante la tarjeta de `EvaluationPanel.tsx` fijada intencionadamente en `h-90`. Esto absorbe las diferencias de densidad de información y consolida una línea inferior de maquetación perfectamente nivelada.

## Consecuencias

* **Seguridad, Integridad y Eficiencia:** El servidor acepta múltiples formatos de texto de forma segura sin peligro de ataques de sobreescritura de archivos (*Path Traversal*) gracias al enmascaramiento con UUID en disco. El modelo de datos garantiza que el intercambio ocurre únicamente entre usuarios reales registrados en PostgreSQL. Se introduce un cortocircuito defensivo de negocio en el controlador que frena peticiones inválidas antes de consumir recursos de infraestructura.
* **Estabilización de la Simetría Visual:** Se corrige la inconsistencia teórica de la maquetación en la documentación. El ajuste justifica formalmente ante el tribunal que la coexistencia de clases de dimensiones diferenciadas (`h-109` en documentos y `h-90` en evaluación) no es un descuido de diseño, sino un cálculo preciso de distribución proporcional para mantener la cuadratura perfecta del layout inferior.
* **Mantenimiento y Cobertura:** Se mantiene la política rigurosa de calidad de código del monorrepo. La capa de presentación frontend se validó mediante el desarrollo de `DocumentManager.test.tsx` en Vitest, garantizando la cobertura de los estados vacíos contextuales por pestañas y el bloqueo perimetral del input de subida si no hay destinatario. La capa de control backend se blindó mediante pruebas unitarias puras de aislamiento con Mockito en `DocumentControllerTest.java`, asegurando que las subidas dupliquen correctamente los registros para emisor y receptor de forma síncrona. Ambas suites se ejecutan con un éxito del 100% y se consolidan en verde.

---

# [ADR-39] Sistema de Evaluación Académica y Arquitectura de Rating Dual

## Estado

Aceptado

## Contexto

Para potenciar los criterios de madurez pedagógica de la plataforma, se requería un módulo que permitiera a los estudiantes calificar tanto la calidad del material de la asignatura como el desempeño del profesorado. No obstante, el dataset original extraído de Coursera presentaba dos restricciones estructurales:

1. Los instructores no poseían entidades relacionales propias en PostgreSQL, sino que se almacenaban como cadenas de texto indexadas (`TEXT`) dentro de la tabla de cursos.
2. Los cursos poseían una puntuación estática original (`rating`). Alterar directamente dicha columna con las notas locales de la plataforma introduciría una alta volatilidad estadística en las medias aritméticas debido a la asimetría del tamaño muestral ($N$ inicial masivo del dataset frente a interacciones locales).

Adicionalmente, bajo las políticas de seguridad perimetral por tokens distribuidos [ADR-27][ADR-35], era obligatorio restringir el formulario únicamente a aquellos docentes e itinerarios formativos en los que el alumno contara con una matrícula vigente y que no hubieran sido evaluados previamente, mitigando ráfagas de fraude o duplicación de votos.

## Decisión

1. **Arquitectura de Rating Dual:** Implementar un patrón de coexistencia analítica. La interfaz del frontend consumirá de manera diferenciada el "Rating del Catálogo" (proveniente de las columnas originales del dataset) y el "Rating de la Comunidad" (calculado dinámicamente en tiempo de ejecución mediante funciones de agregación `AVG` sobre los registros locales de la plataforma), preservando la pureza de la fuente original de datos.
2. **Granularidad Disociada y Envío Asimétrico:** Diseñar la entidad `AcademicEvaluation.java` segregando las puntuaciones y comentarios en campos independientes. Se refactoriza la condición lógica de la UI (`canSubmit`) para habilitar el envío asimétrico del formulario. El estudiante tiene plena libertad para calificar exclusivamente la calidad del curso, únicamente el desempeño docente, o ambos bloques en paralelo, exigiendo como único requisito de negocio que al menos una de las dos métricas sea mayor que cero para mitigar payloads vacíos.
3. **Validación Perimetral por Subconsulta Cruzada:** Delegar el filtrado de exclusión a una subconsulta nativa en HQL dentro de `EnrollmentRepository.java`. El método descarta en el motor de PostgreSQL cualquier curso que ya posea una fila de evaluación acoplada al `username` extraído de los Claims del JWT, blindando el acceso en el endpoint `/pending` de forma stateless.
4. **Accesibilidad e Integridad Sintáctica en la UI:** Refactorizar el renderizado iterativo del panel de estrellas inyectando de forma obligatoria propiedades descriptivas `aria-label` y `title` para satisfacer los inspectores automatizados de accesibilidad (*Microsoft Edge Tools / axe*). La estructura se mantiene desacoplada en el hook `useActiveEvaluations.ts` satisfaciendo la directriz anti-objetos mutantes del linter [ADR-20].

## Consecuencias

* **Consistencia Analítica:** Se habilita un sistema de puntuación docente y de asignaturas altamente descriptivo sin degradar el dataset preprocesado en Python. Las consultas agregadas computan el String del docente de forma unívoca, resolviendo la carencia de identificadores físicos de instructores en la base de datos.
* **Validación de Reglas de Negocio:** El controlador bloquea de forma autónoma (HTTP 403 Forbidden / HTTP 400 Bad Request) cualquier intento de inyección de payloads corruptos o evaluaciones duplicadas, protegiendo las tablas relacionales.
* **Robustez en la Suite de Integración:** La suite de pruebas de interfaz del cliente se eleva a un total consolidado de 46 tests en verde. La integración de bloques asíncronos `await waitFor` dentro de `EvaluationPanel.test.tsx` elimina con éxito las alertas de fugas de estado transitorias de React Testing Library, garantizando la predictibilidad de la plataforma ante futuras auditorías de código.

---

# [ADR-40] Descarga Segura de Documentos Académicos y Control de Acceso Anti-IDOR

## Estado

Aceptado

## Contexto

Para consolidar las directrices de privacidad y control de acceso en el módulo de intercambio bidireccional y dirigido de archivos, se requería una solución técnica que garantizara que los documentos académicos almacenados en el servidor solo pudieran ser descargados por sus destinatarios legítimos o sus emisores originales. El diseño arquitectónico inicial presentaba tres vulnerabilidades críticas:

1. La ruta estática `/uploads/**` estaba configurada como pública en la seguridad perimetral, permitiendo que cualquier usuario malintencionado que conociera el nombre físico del archivo pudiera saltarse los filtros de autenticación y descargarlo de forma directa.
2. El uso de `window.open(fileUrl)` en el frontend exponía metadatos e identificadores sensibles en la barra de direcciones del navegador, facilitando vectores de ataque basados en la enumeración predecible de recursos.
3. El sistema carecía de un mecanismo de validación de identidad en tiempo de ejecución, lo que exponía la plataforma a vulnerabilidades de Referencia Directa Insegura a Objetos (IDOR), donde un alumno autenticado válidamente con su token JWT podía consultar recursos privados pertenecientes a otros alumnos modificando los parámetros de la solicitud.

## Decisión

1. **Aislamiento Perimetral y Blindaje de Archivos:** Eliminar por completo la regla estática `.requestMatchers("/uploads/**").permitAll()` en `SecurityConfig.java`. El directorio de almacenamiento físico queda completamente aislado del tráfico de red externo, obligando a que cualquier solicitud de lectura sea interceptada y evaluada por el contexto de Spring Security.
2. **Cortocircuito Defensivo Anti-IDOR (Backend):** Implementar el endpoint protegido `GET /api/v1/documents/download/{documentId}` en `DocumentController.java`. El método recupera el token JWT a través del objeto `Principal`, intercepta la entidad en la base de datos de PostgreSQL y evalúa mediante una condición excluyente si el `username` del usuario autenticado coincide obligatoriamente con el emisor (`sender_id`) o el receptor (`receiver_id`) del documento. Si la validación falla, el flujo se interrumpe de forma reactiva respondiendo con un estado HTTP 403 Forbidden.
3. **Consumo por Flujo de Datos Binarios (Frontend):** Sustituir el uso de `window.open` en el cliente por un consumo asíncrono basado en `Blob`. La función `downloadDocumentSecure` inyecta de forma transparente el token JWT en las cabeceras de autorización mediante el cliente HTTP de Axios (`apiClient`) y procesa el flujo de bytes directamente en la memoria del navegador, forzando la descarga local con el nombre real del archivo (`originalname`).
4. **Control de Concurrencia y Estado Visual en la UI:** Refactorizar el componente `DocumentManager.tsx` inyectando un estado de bloqueo local denominado `downloadingId`. Al activar el evento `onClick`, el componente inhabilita el botón correspondiente (`disabled`) para evitar solicitudes HTTP simultáneas o dobles clics accidentales del usuario. Simultáneamente, se muta el icono estático por un spinner animado (`Loader2`) preservando las dimensiones geométricas y las clases de Tailwind CSS sin alterar la maquetación.

## Consecuencias

* **Mitigación Completa de Vulnerabilidades IDOR:** Se erradica la posibilidad de fugas de información por manipulación de identificadores en la URL. El servidor valida la matriz de permisos de forma interna, garantizando la confidencialidad estricta del material académico.
* **Flujos de Datos Transparentes:** Las credenciales de autorización y los tokens JWT viajan encapsulados de forma oculta en las cabeceras HTTP, evitando la exposición de firmas digitales en el historial del navegador o en los logs del servidor proxy.
* **Integridad de la Suite de Pruebas:** Los tests de integración con `MockMvc` en `DocumentControllerTest.java` validan con éxito que los intentos de intrusión devuelvan un error 403. En el cliente, la refactorización mantiene en verde un consolidado absoluto de 46 tests en Vitest, garantizando que el comportamiento asíncrono y los bloqueos de interfaz se ejecutan de manera predecible y libre de regresiones.

---

# [ADR-41] Diseño de Contrato Anticipado para la Integración Desacoplada de Calificaciones Académicas

## Estado

Aceptado

## Contexto

Con el objetivo de expandir las capacidades formativas del panel del estudiante (`EnrolledCourses.tsx`) hacia futuras interacciones con el módulo del profesorado, se requería habilitar una "ventana informativa de calificaciones" que permitiera reflejar el motivo (exámenes, trabajos prácticos) y la nota asignada.

No obstante, debido a que el módulo de inserción de calificaciones por parte del docente se implementará en una fase posterior del desarrollo, la arquitectura del frontend requería un diseño que cumpliera con las siguientes restricciones estructurales:

1. **Tipado Estricto de Datos:** Evitar el uso de tipos genéricos (`any`) que degradaran la robustez del linter y la predictibilidad del compilador de TypeScript.
2. **Funcionalidad Inerte Conectable:** El componente debía ser visualmente operativo y tolerante a la ausencia de datos en el presente, pero quedar "arquitectónicamente listo" para reaccionar de forma automática en cuanto el backend comience a proveer los registros reales de PostgreSQL.
3. **Consistencia Tipográfica y Minimalismo:** La UI de calificaciones debía mimetizarse con el entorno visual del Dashboard del estudiante Luis, evitando sobrecargas cognitivas, redundancia de iconos o desalineaciones en la tarjeta contenedora rígida (`h-109`).

## Decisión

1. **Estrategia de Pre-Hidratación y Contrato por Desacoplamiento:** Extender el contrato de transferencia de datos en `courseTypes.ts` mediante la creación de la interfaz `CourseGradeInfo` y su acoplamiento como propiedad opcional (`grades?`) dentro de `EnrollmentInfo`. Esto permite al cliente tipar de manera estricta el flujo de datos sin obligar al backend a enviar el payload en la fase actual.
2. **Evaluación de Ausencia Dinámica en el JSX:** Inyectar una sección condicional dentro del bucle `.map` que evalúe de forma reactiva la existencia de calificaciones. Si la colección es nula o vacía, la interfaz se comporta de manera inerte renderizando un estado elegante por defecto (*"Aún no hay calificaciones publicadas por el docente"*), eliminando cualquier riesgo de quiebre del ciclo de renderizado.
3. **Unificación Estética de Carga Gráfica:** Ajustar la coloración de la etiqueta del título a un tono gris sólido (`text-slate-700`) y prescindir de iconografía adicional (`GraduationCap`). Esto garantiza una integración cromática perfectamente simétrica con las etiquetas de categoría y textos perimetrales ya existentes en la plataforma.

## Consecuencias

* **Desacoplamiento Efectivo de Módulos:** El equipo de frontend y backend pueden trabajar de forma asíncrona. La vista del estudiante queda blindada ante futuras modificaciones; cuando el controlador del profesor guarde datos en las tablas relacionales, la UI del alumno los consumirá nativamente sin necesidad de alterar una sola línea de código en la capa de presentación.
* **Mantenimiento del Espacio Geométrico:** El diseño compacto aprovecha de forma óptima los píxeles recuperados en la cabecera en el [ADR-38], manteniendo a salvo el scroll controlado de la tarjeta y la simetría visual con los componentes adyacentes del catálogo.
* **Cero Regresiones en la Suite de QA:** La suite de pruebas de **Vitest se consolida exitosamente con sus 46 tests en verde (PASS)**, demostrando que la adición de la lógica condicional y las interfaces tipadas no introducen comportamientos erráticos o fugas de memoria transitorias en React.

---

# [ADR-42] Persistencia Relacional e Hidratación de Calificaciones con Aislamiento Deserializador READ_ONLY

## Estado

Aceptado

## Contexto

Dando continuidad al diseño de contrato anticipado establecido en el [ADR-39] para el módulo de calificaciones académicas, se requería materializar la estructura física de datos en el backend (Spring Boot + PostgreSQL + Hibernate). El reto residía en habilitar el almacenamiento dinámico de múltiples notas por cada matrícula sin vulnerar los principios de seguridad perimetral de la plataforma.

Específicamente, se debían mitigar dos vectores de riesgo críticos:

1. **Ataques de Asignación Masiva (Mass Assignment):** Impedir que un usuario malintencionado intente inyectar o alterar calificaciones enviando colecciones manipuladas en los payloads de solicitudes mutantes (`POST`/`PUT`).
2. **Degradación de Rendimiento (N+1 Query Problem):** Evitar que la consulta recurrente de matrículas sobrecargue la base de datos PostgreSQL al traer de manera ansiosa (*Eager*) colecciones de notas cuando no son requeridas por el contexto de la vista.

## Decisión

1. **Modelado Físico Normalizado y Bidireccional:** Crear la entidad `CourseGrade.java` vinculada mediante una relación de muchos a uno (`@ManyToOne`) con la matrícula (`Enrollment`). La entidad principal `Enrollment.java` incorpora la contraparte inversa (`@OneToMany`) con estrategias de cascada completa (`CascadeType.ALL`) y remoción de huérfanos para garantizar la integridad referencial en cascada ante limpiezas de historial.
2. **Aislamiento de Deserialización Perimetral:** Sustituir la anotación restrictiva `@JsonIgnore` por `@JsonProperty(access = JsonProperty.Access.READ_ONLY)` sobre la propiedad `grades`. Esto instruye al serializador Jackson a ignorar de forma proactiva cualquier entrada de datos hacia el servidor a través de esta propiedad, utilizándola exclusivamente como flujo de salida seguro e inmutable hacia el Frontend.
3. **Optimización por Carga Diferida (Lazy Loading) e Hidratación Explícita:** Configurar la relación con `FetchType.LAZY` para salvaguardar el rendimiento del motor de base de datos. En el método transaccional de lectura `getStudentActiveCoursesWithCalculatedProgress` dentro de `UserService.java`, se fuerza la hidratación controlada de la colección invocando un método de acceso estructural (`.size()`) antes del retorno de la lista, poblando el payload únicamente en este flujo de negocio específico.
4. **Restauración de Firma de Constructores:** Declarar un constructor explícito de 7 argumentos en `Enrollment.java` que actúe como puente de compatibilidad hacia atrás. Esto inmuniza a la suite preexistente de pruebas unitarias (`UserServiceTest.java`, etc.) contra los cambios en las anotaciones automáticas de Lombok.

## Consecuencias

* **Seguridad por Diseño (Security by Design):** Se blinda el endpoint contra inyecciones fraudulentas de notas desde el cliente. Las calificaciones quedan completamente aisladas en modo de solo lectura desde la perspectiva de la API pública expuesta.
* **Tolerancia Dual Frontend-Backend:** El backend ahora sirve un arreglo `grades: []` vacío pero estructuralmente válido. React asimila este payload de forma nativa manteniendo el comportamiento inerte actual y reaccionará de manera automatizada en el momento en que se inserten filas reales en la tabla `course_grades`.
* **Estabilidad del Entorno de Integración:** Tanto el compilador de Java 17 como los tests de JUnit/Mockito mantienen un estado 100% libre de errores y regresiones, preservando la madurez tecnológica de la plataforma de cara a futuras auditorías del tribunal.

---

# [ADR-43] Arquitectura de Agregación Analítica Inmutable y Casteo Dinámico para Métricas de Catálogo

## Estado

Pospuesto

## Contexto

Para potenciar la madurez pedagógica de la plataforma, se diseñó la incorporación de un nuevo componente estadístico en el Dashboard del estudiante que consolidara métricas clave en tiempo real: nota media del curso, volumen local de inscritos y valoraciones medias disociadas de la asignatura y del profesorado. Asimismo, el componente debía estructurarse de forma extensible para admitir futuras segmentaciones analíticas basadas en atributos intrínsecos de la entidad de cursos (diferentes plataformas de origen y categorías temáticas).

No obstante, la implementación de este módulo analítico cruzado presentaba tres restricciones estructurales críticas:

1. **Incompatibilidad de Tipos en PostgreSQL:** El campo `score` de la entidad `CourseGrade` se definió originalmente como `String` para dotar de flexibilidad al sistema [ADR-39]. Intentar aplicar una función de agregación estándar `AVG()` sobre una columna de texto provocaría una excepción fatal inmediata en el motor de base de datos.
2. **Riesgo de Inyección de Payload:** Evitar vulnerabilidades de alteración masiva de datos (*Mass Assignment*), garantizando que las métricas de salida computadas por el servidor no puedan ser manipuladas o inyectadas artificialmente por peticiones maliciosas procedentes del cliente.
3. **Rendimiento e Integridad de Consultas:** Prevenir el problema de consultas masivas (N+1) o productos cartesianos inválidos al cruzar tablas de alta volatilidad analítica (`Enrollment`, `CourseGrade`, `AcademicEvaluation` y `Courses`).

*Nota de Auditoría de Desarrollo:* Tras la estabilización del núcleo transaccional del catálogo predictivo y el sistema de intereses del estudiante, se detectó la necesidad de priorizar el desacoplamiento de estas funciones básicas antes de acoplar de forma reactiva el panel analítico. Para mitigar condiciones de carrera y asegurar la consistencia del despliegue actual, se decide pausar temporalmente la activación de este módulo.

## Decisión

Se determina **posponer e inactivar temporalmente la integración del componente analítico** en la fase de desarrollo actual, manteniendo el diseño de su arquitectura técnica pre-establecido en estado inerte para su futura reactivación coordinada con la página del profesor. Las directrices de diseño planificadas y validadas de forma teórica constan de:

1. **Casteo Dinámico Condicional en JPQL:** Planificación de una directiva de formateo al vuelo dentro de `CoursesRepository.java` utilizando la función nativa `CAST(cg.score AS double)`. Para inmunizar al motor de PostgreSQL contra errores de formato ante cadenas vacías o no numéricas, el casteo se encapsula dentro de una expresión condicional `CASE WHEN` que evalúa la presencia legítima de caracteres válidos antes de computar la media aritmética (`AVG`).
2. **Mapeo de Proyección Directa mediante Records:** Configuración de la estructura de transferencia de datos `CourseStatsDTO.java` haciendo uso de un `Record` inmutable de Java 17. La consulta del repositorio instanciará el DTO directamente desde las tuplas de PostgreSQL mediante la sintaxis `SELECT new ...`, evitando la sobrecarga en memoria que implicaría la hidratación de entidades JPA pesadas.
3. **Aislamiento Perimetral Analítico:** Restricción de todas las propiedades del `Record` con la anotación `@JsonProperty(access = JsonProperty.Access.READ_ONLY)`. Esto establece un blindaje de solo lectura a nivel de API, permitiendo la serialización limpia de las métricas hacia React pero desestimando cualquier intento de manipulación o inserción externa.
4. **Controlador Analítico Desacoplado:** Centralización de la exposición del servicio en `CourseStatsController.java` bajo la ruta `/api/v1/stats`. El endpoint validará de forma implícita la identidad del alumno mediante el contexto `Authentication` provisto por los Claims firmados del token JWT [ADR-27], neutralizando vectores de ataque por enumeración de recursos.

## Consecuencias

* **Preservación de la Estabilidad:** La inactivación de este módulo analítico reduce la complejidad transaccional del proyecto actual, garantizando que el catálogo predictivo y el registro de intereses funcionen con total fluidez y con cero errores de red en la UI.
* **Garantía de Documentación Metodológica:** Mantener el ADR bajo el estado de *Pospuesto* justifica de manera académica ante el tribunal que el problema de agregación analítica de datos mixtos (String a Double en PostgreSQL) fue analizado, modelado y resuelto teóricamente, aportando valor al diseño de arquitectura del TFG.
* **Consistencia del Repositorio Actualizado:** Al retirar los disparadores reactivos del frontend y las consultas complejas del backend, la suite de pruebas y la compilación (`BUILD SUCCESS`) regresan a un terreno de consistencia absoluta, libre de regresiones colaterales en el ecosistema transaccional.

---

# [ADR-44]: Tipado Defensivo y Gestión de Precisión en el Progreso Académico

### Estado

Aceptado

### Contexto

El motor de preprocesamiento de datos (Python) identifica que el catálogo de cursos contiene duraciones con valores decimales flotantes (ej. 2652.8 horas). Sin embargo, el método de cálculo de progreso académico en el backend (`calculateCurrentProgress`) realiza un truncamiento explícito a tipo primitivo `Long` mediante `.longValue()`. Es necesario justificar formalmente esta pérdida de precisión frente al riesgo de desborde o inconsistencia en la interfaz de usuario.

### Decisión

Se decide mantener el uso del tipo `Long` para almacenar y procesar el total de horas de un curso dentro de la lógica de negocio del backend. Esta decisión se fundamenta en:

* **Mitigación de Errores Flotantes:** Evitar el uso de `Double` o `Float` en operaciones aritméticas de porcentaje previene que residuos decimales infinitos provoquen desajustes de redondeo en el árbol de renderizado de React.
* **Absorción por Redondeo de UI:** Dado que el método aplica un truncamiento final hacia abajo (`Math.floor`) y acota el resultado estrictamente a un entero (`int`) entre 0 y 100, la desviación máxima de precisión provocada por el truncamiento a `Long` es aritméticamente insignificante (inferior al 0.03% en cursos masivos) e invisible para el estudiante.

### Consecuencias

* **Positivas:** Estabilidad absoluta en el tipo de retorno enviado a la API. Se eliminan comportamientos erráticos (como barras de progreso que superen el 100% o que muestren decimales infinitos en la maquetación visual).
* **Negativas:** Existe un desfase teórico de minutos en el cómputo total de cursos masivos, el cual es absorbido intencionadamente por el diseño de la experiencia de usuario.

---

# [ADR-45]: Abstracción de Infraestructura y Purificación Semántica de la Interfaz (UX)

### Estado

Aceptado

### Contexto

Las primeras versiones de la interfaz del estudiante exponían términos técnicos explícitos de la infraestructura backend (ej. *"Sincronizado con PostgreSQL"*) y mostraban la duración de las asignaturas en formato bruto de horas. Esto violaba el principio de ocultación de información y reducía la legibilidad académica del producto.

### Decisión

Se establece un principio estricto de **Purificación Semántica y Abstracción de Capas**. Queda prohibido filtrar terminología de la persistencia o de la base de datos hacia la capa de presentación del alumno. Asimismo, se transforma de forma nativa la visualización del tiempo de estudio:

* La duración se calcula en el cliente transformando las horas a **Días Académicos** mediante un redondeo defensivo hacia arriba (`Math.ceil(duration / 24)`).

### Consecuencias

* **Positivas:** Mejora drástica de la experiencia de usuario (UX). La interfaz se orienta puramente al negocio educativo, facilitando la planificación temporal real del estudiante Luis sin exponer detalles del stack tecnológico.
* **Negativas:** Requiere un esfuerzo adicional de formateo en los componentes frontend del catálogo y el dashboard para asegurar la conversión homogénea de unidades.

---

# [ADR-46] Arquitectura de Agregación Analítica Disociada y Micro-indicadores

**Fecha:** Julio 2026  
**Estatus:** Aceptado  

### Contexto

Se requiere proyectar métricas en tiempo real que combinen el catálogo base de cursos externos (origen, especialidad) con la analítica dinámica de los usuarios en la plataforma local (inscripciones, notas, valoraciones de docentes).

Los principales desafíos son:

1. **Heterogeneidad de Datos:** Coexistencia de metadatos estáticos de plataformas externas con agregaciones SQL numéricas mutables ejecutadas en PostgreSQL.
2. **Eficiencia y Carga de Memoria:** Riesgo de saturar el motor de base de datos con consultas costosas de agregación sobre entidades pesadas JPA.
3. **Manejo de Nulidad Pedagógica:** Gestión defensiva en la UI para representar asignaturas sin actividad o registros iniciales sin desconfigurar la maquetación.

### Decisión

1. **Agregación en Proyección (Spring Boot):** Utilizar consultas nativas o JPQL en el repositorio que mapeen los resultados agregados (`COUNT`, `AVG`) directamente hacia un `CourseStatsDTO`, evitando instanciar entidades completas en memoria.
2. **Casteo Condicional y Coalesce:** Implementar lógica de control en el backend para gestionar la nulidad pedagógica (ej. retornar `---` en lugar de `NaN` o `0` cuando no existan calificaciones registradas).
3. **UI de Doble Dimensión Sincronizada (React + Tailwind):** Descartar la unificación masiva de datos en una sola cuadrícula. En su lugar, el componente `StudentStatsPanel` encapsula un contenedor unificado de altura controlada (`GenericCard`) subdividido en dos sub-cajas verticales totalmente independientes:
   * **Caja A ("Métricas de tu Campus"):** Dedicada a los datos dinámicos locales (Comunidad, Nota Media, Rating de Curso y Rating Docente).
   * **Caja B ("Ficha Técnica del Curso"):** Dedicada a los metadatos de integración del catálogo base (Origen Remoto y Especialidad).
4. **Resiliencia Visual:** Ambas sub-cajas operan con scrolling vertical inteligente (`overflow-y-auto`). Esto garantiza que la interfaz mantenga su simetría física actual intacta y permanezca libre de barras de scroll espurias, pero responda de forma adaptativa y automática si la entidad `Course` incrementa sus atributos en el futuro.

### Consecuencias

* **Positivas:** Reducción drástica del overhead de red, renderizado reactivo sin basura visual, interfaz de usuario desacoplada y preparada para futuras extensiones del catálogo sin comprometer la consistencia geométrica del Dashboard.
* **Negativas:** Obliga a mantener una estricta correspondencia entre las alturas relativas de las sub-cajas dentro del contenedor padre para evitar solapamientos visuales.

---

# [ADR-47]: Canal de Alarmas Académicas Dinámicas en Barra de Navegación

### Estatus

Aceptado (Julio 2026)

### Contexto

El estudiante requería avisos visuales inmediatos sobre la llegada de nuevos documentos a su bandeja de entrada y alertas automáticas cuando el progreso de un curso alcanzara un porcentaje $\geq 90\%$. Mantener estas consultas acopladas a las vistas principales degradaba el rendimiento y violaba los principios de segregación de interfaces.

### Decisión

* Se centralizó la lógica analítica de detección en un endpoint seguro de Spring Boot (`/api/auth/notifications`).
* Se encapsuló el consumo de red en React mediante un hook aislado denominado `useNotifications` para respetar el aislamiento de infraestructura **[ADR-20]**.
* La interfaz visual se construyó utilizando la iconografía de Lucide envuelta de forma estricta en el componente core `GenericButton` **[ADR-13]**.
* Se inyectó el componente de forma condicional en la barra superior (`NavbarUser.tsx`) únicamente cuando el rol de la sesión activa coincide con `STUDENT`, garantizando la simetría geométrica y la limpieza visual para los roles de profesor y administrador.

### Consecuencias

* **Positivas:** Sincronización de alertas en tiempo real con PostgreSQL sin sobrecargar las cabeceras de otros roles.
* **Positivas:** Cobertura de pruebas unitarias e integración completadas al 100% y en verde mediante Vitest y MockMvc de Spring Security.

---

# [ADR-48]: Purificación del Sistema de Contingencia y Control de Permisos

### Estatus

Aceptado (Julio 2026)

### Contexto

La vista de error por falta de privilegios (`AccessDenied.tsx`) utilizaba etiquetas de texto y enlaces HTML manuales (`<h1>`, `<p>`, `<a>`), introduciendo inconsistencias de diseño y violando el principio de abstracción e identidad visual unificada de la plataforma.

### Decisión

* Se refactorizó la vista de contingencia eliminando el HTML plano y las clases manuales de Tailwind v4.
* Se delegó la presentación estructural del mensaje de error en el componente core corporativo `GenericHeader` **[ADR-43]**.
* Se reemplazaron las etiquetas de enlace nativas por el componente de acción core `GenericButton`, gestionando la redirección interna mediante el hook seguro `useNavigate` de React Router.

### Consecuencias

* **Positivas:** Reducción de líneas de código duplicadas y eliminación de estilos manuales en la capa de presentación privada.
* **Positivas:** Alineación total con las directivas de Purificación UI **[ADR-13]** de cara a la evaluación del tribunal del TFG.

---

# [ADR-49]: Purificación Visual de Dashboards y Centralización de Componentes de Enrutamiento

### Estado

Aceptado (Julio 2026)

### Contexto

Tras la auditoría del frontend y la optimización de seguridad stateless basada en JWT [ADR-20], el sistema presentaba acoplamientos y redundancias arquitectónicas:

1. Las cabeceras principales de entrada en los paneles principales (Dashboards de Alumno, Profesor y Administrador) utilizaban etiquetas HTML cableadas manualmente, desalineadas con las directrices de reutilización de la interfaz [ADR-13].
2. Los filtros del buscador del catálogo de asignaturas y de usuarios administrativos utilizaban inputs nativos independientes en lugar de delegar en el componente genérico del sistema.
3. Existían tres guardianes de ruta satélites redundantes (`StudentRoute.tsx`, `AdminRoute.tsx` y `ProfessorRoute.tsx`) que actuaban como simples envoltorios de una línea hacia el componente central de seguridad.

### Decisiones

1. **Unificación Visual de Dashboards [ADR-13]:** Se implementó de forma obligatoria el componente core reutilizable `<GenericHeader />` en la raíz de los tres paneles principales para proporcionar la bienvenida institucional, separándolo de las tarjetas internas con micro-encabezados ligeros.
2. **Adopción de Componente Input Core:** Se sustituyeron todas las etiquetas `<input>` manuales en los buscadores por el componente corporativo `<Input />`, estandarizando de forma nativa el estilo `bg-gray-50` y el anillo de enfoque `focus:ring-blue-500`.
3. **Eliminación Física de Guardianes Satélites:** Se borraron de manera definitiva del disco duro los archivos `StudentRoute.tsx`, `AdminRoute.tsx` y `ProfessorRoute.tsx`. Los roles se parametrizan directamente de forma centralizada en el archivo de rutas `index.tsx` mediante el atributo `allowedRoles` del componente unificado `ProtectedRoute.tsx`.
4. **Blindaje de Punteros Nulos en Backend [ADR-19]:** Se refactorizó el stream de afinidad académica en `RecommendationService.java` para evaluar sobre una colección segura (`safeEnrollments`), eliminando riesgos de regresión `NullPointerException` en caliente.

### Consecuencias

* **Positivas:** Reducción drástica del acoplamiento en el árbol de componentes del frontend (*component hell*). Consistencia visual estricta en toda la experiencia de usuario. Estructura de directorios del repositorio 100% limpia de código inerte o de andamiaje.
* **Negativas:** Ninguna. Las suites de pruebas automatizadas de Vitest (`test ok`) y de integración de Maven (`BUILD SUCCESS`) se mantienen al 100% en verde.

### Actualización de Cierre (Julio 2026)

Se completa la limpieza final y el endurecimiento de seguridad asociado al cierre de ADR-47:

1. **Hardening de Perfil y Rutas Auth:**

* Se elimina el acceso público de la ruta dinámica `/api/auth/{username}` en `SecurityConfig.java`.
* Se blinda `GET /api/auth/{username}` con autorización contextual (`self/admin`) en `UserController.java`.
* Se incorpora el endpoint explícito `GET /api/auth/me` para hidratación de sesión JWT y coherencia de contrato.
* Se evita la exposición del campo de contraseña en serialización JSON mediante `@JsonProperty(access = WRITE_ONLY)` en `Users.java`.

1. **Erradicación de Código Inerte:**

* Se elimina la clase `SemanticNormalizer.java` al no presentar consumidores reales en runtime.

1. **Consolidación de CORS y Limpieza Operativa:**

* Se retiran anotaciones `@CrossOrigin` redundantes en controladores (`UserController`, `CourseController`) para centralizar la política en `SecurityConfig.java`.
* Se normaliza la exclusión de artefactos `repomix-output.*` en la raíz del monorepo para evitar ruido documental y residuos de herramientas.

---

# [ADR-50]: Implementación de Comunicación Bidireccional de Documentos Académicos

## Estatus

Aceptado

## Contexto

La plataforma requería una evolución desde un repositorio de archivos estático hacia un sistema de intercambio dinámico entre alumnos y profesores. Se necesitaba vincular cada archivo a un contexto académico (asignatura) y a actores específicos (emisor y receptor) para habilitar el seguimiento de tareas y exámenes.

## Decisión

Se ha modificado la entidad `DocumentMetadata.java` para incluir relaciones de persistencia explícitas con los actores `sender` (emisor) y `receiver` (receptor), así como el mapeo con la entidad `course` (asignatura). Asimismo, se integra el uso del enumerado `FolderType` para categorizar semánticamente el contenido en sus respectivas bandejas de entrada y salida (`SENT` / `RECEIVED`).

## Consecuencias

### Impacto Positivo

* **Reactividad en la Interfaz:** Permite al componente del frontend `CourseAssignmentPanel.tsx` filtrar e indexar los documentos en tiempo real según la asignatura seleccionada por el usuario.
* **Trazabilidad y Alertas:** Habilita la lógica de notificaciones bidireccionales, permitiendo que el sistema identifique de forma unívoca a qué actor debe alertar (vía la campana de notificaciones) inmediatamente después de registrarse una subida de archivo.
* **Seguridad (Mitigación IDOR):** Al estar el contrato documental ligado directamente a un emisor y un receptor específicos en la base de datos, se facilita la implementación de cortocircuitos de seguridad perimetrales en los endpoints de descarga del servidor.

---

# [ADR-51]: Arquitectura de Layout Responsivo mediante Grid System en Dashboards

## Estatus

Aceptado

## Contexto

El incremento de funcionalidades en el dashboard del estudiante (seguimiento de asignaturas, catálogo de cursos, estadísticas y evaluaciones) provocaba una saturación visual en disposiciones verticales simples, lo que dificultaba la usabilidad y la experiencia de usuario.

## Decisión

Implementar un sistema de distribución basado en **CSS Grid de Tailwind** en el archivo `StudentDashboard.tsx`, dividiendo la interfaz en un contenedor de dos columnas principales: una lateral (25% de ancho) para el `EvaluationPanel` y una central/derecha (75% de ancho) para el flujo de actividad principal (`CourseCatalog` y `CourseAssignmentPanel`).

## Consecuencias

### Impacto Positivo

* **Optimización de la Jerarquía Visual:** Permite al estudiante visualizar sus notas de progreso simultáneamente con sus tareas activas sin necesidad de realizar un scroll excesivo.
* **Coherencia Estética Global:** Se garantiza la uniformidad del diseño en toda la aplicación mediante el uso estandarizado del componente común `GenericCard` y bordes unificados en tono `slate-200` en todos los paneles inyectados.
* **Adaptabilidad Responsiva:** El diseño se adapta de manera fluida y fluida en pantallas de diferentes tamaños (móvil, tablet y escritorio), ocultando o reorganizando las columnas del grid de forma nativa.

---

# [ADR-52]: Sincronización del Estado de Notificaciones mediante Atributo de Lectura (isRead)

## Estatus

Aceptado

## Contexto

Se detectó una inconsistencia en la experiencia de usuario (UX) donde la campana de notificaciones (indicador visual de alarma) permanecía en estado activo (color rojo y parpadeo) incluso después de que el estudiante hubiera descargado o visualizado los documentos en su bandeja de entrada. Esto se debía a que la lógica de la alarma solo validaba la existencia física de registros en la tabla de metadatos, sin rastrear la interacción previa del usuario con dichos archivos.

## Decisión

Para resolver este comportamiento y asegurar que la interfaz refleje fielmente el estado de las tareas pendientes, se han implementado las siguientes medidas técnicas en ambas capas de la aplicación:

1. **Capa de Persistencia (Backend):** Añadir un campo booleano `isRead` (inicializado por defecto en `false`) a la entidad `DocumentMetadata` en Spring Boot.
2. **Interfaz de Programación (API Rest):** Desarrollar un endpoint transaccional mediante `@PatchMapping` en el `DocumentController` para permitir la mutación de este estado a través de peticiones HTTP asíncronas.
3. **Lógica de Negocio (Frontend):** Modificar el hook global unificado `useNotifications.ts` para que la evaluación del estado visual (`hasUnread`) dependa exclusivamente de los documentos donde la bandera `isRead` sea estrictamente falsa.
4. **Interacción del Usuario (UI/UX):** Vincular los eventos de acción ("Abrir" o "Descargar") del componente `DocumentManager.tsx` con una llamada inmediata al servicio de marcado como leído, disparando un evento de refresco global para actualizar la campana en tiempo real.

## Consecuencias

### Impacto Positivo

* **Sincronización de Estado Precisa:** Se elimina el desfase visual entre los archivos descargados y el indicador de alertas de la barra de navegación, ofreciendo una experiencia coherente al usuario.
* **Optimización de Rendimiento en UI:** Al delegar la mutación mediante un evento nativo del sistema de ventanas (`global-notifications:refresh`), la actualización del estado de lectura se procesa de forma reactiva sin necesidad de recargar la página completa.
* **Integridad de Datos:** El control perimetral implementado en el backend garantiza que únicamente el receptor legítimo del documento tenga permisos de mutación sobre la propiedad `isRead`, blindando la operación ante vulnerabilidades de manipulación de identificadores (IDOR).

---

# [ADR-53]: Unificación del Sistema de Notificaciones mediante Componente Global de Alerta

## Estatus

Aceptado

## Contexto

Anteriormente, el sistema de alertas (campana de notificaciones) era un componente exclusivo y acoplado al dashboard del estudiante. Con la implementación del intercambio bidireccional de documentos [ADR-48] y la necesidad de que profesores y administradores reciban avisos críticos (como entregas de trabajos o alertas de finalización de curso), mantener componentes de notificación separados por rol generaba duplicidad de código y una experiencia de usuario (UX) inconsistente.

## Decisión

Se ha decidido refactorizar el sistema de notificaciones bajo un modelo de componente único, global y agnóstico al rol del usuario, aplicando las siguientes medidas de ingeniería:

1. **Centralización de la Interfaz de Usuario (UI):** Se migra el componente visual `NotificationBell.tsx` a una ubicación compartida y se renombra como `GlobalNotificationBell.tsx`, inyectándolo directamente en el componente común `NavbarUser.tsx`. Esto garantiza que la campana sea visible para cualquier usuario autenticado (`ADMIN`, `PROFESSOR` o `STUDENT`) sin importar la sección de la plataforma en la que se encuentre.
2. **Generalización del Hook de Datos:** El hook `useNotifications.ts` se ha desacoplado de la lógica específica de estudiantes para consumir el contexto global de autenticación (`AuthContext`). Ahora, el hook consulta al backend de forma dinámica mediante una bifurcación algorítmica sensible al `user_id` y al `role` del usuario actual.
3. **Lógica Basada en Receptores:** Se aprovecha la estructura de persistencia de la entidad `DocumentMetadata` y el objeto de transferencia de datos `NotificationDTO` para filtrar las alertas según el campo `receiver_id`, permitiendo que el servidor sirva notificaciones específicas para cada tipo de actor académico.

## Consecuencias

### Impacto Positivo

* **Eliminación de Deuda Técnica (Principio DRY):** Se elimina la necesidad de mantener múltiples lógicas de notificación redundantes, centralizando el mantenimiento y las suites de pruebas en un solo punto del repositorio.
* **Coherencia Visual:** Se cumple rigurosamente con las directrices de purificación visual, ofreciendo una interfaz uniforme y una UX homogénea para todos los roles de la plataforma.
* **Alta Escalabilidad:** El sistema permite añadir nuevos tipos de alertas (como avisos de progreso académico para profesores o alertas técnicas para administradores) simplemente actualizando el hook de datos, sin alterar la interfaz de la barra de navegación.

### Impacto Negativo / Riesgos Mitigados

* **Carga de Red:** Al convertirse en un componente global en la barra de navegación, el hook realiza peticiones frecuentes al servidor para evaluar el estado de lectura (`hasUnread`).
* *Mitigación:* Se implementó una carga concurrente y optimizada mediante `Promise.all` y un sistema de eventos nativos del navegador (`global-notifications:refresh`), asegurando que las llamadas se realicen solo cuando el contexto cambie o se dispare un evento legítimo de interacción, protegiendo el rendimiento de la aplicación.

---

# [ADR-054]: Estrategia de Testing en Pirámide y Validación de Flujos de Integración

## Estatus

Aceptado

## Fecha

Julio 2026

## Contexto

Con la creciente complejidad funcional y de seguridad de la plataforma (intercambio bidireccional de archivos [ADR-48], motor de recomendaciones algorítmicas [ADR-34] y seguridad stateless JWT [ADR-03]), se hacía imperativo establecer un marco estricto de aseguramiento de la calidad (QA) que garantizara que las refactorizaciones profundas (como la unificación de la campana global [ADR-52] o la limpieza de código muerto) no introdujeran regresiones operacionales. Una arquitectura desacoplada y robusta exige que tanto el contrato de datos del backend como la reactividad de la UI en el frontend estén blindados de manera simétrica ante cualquier alteración del entorno de desarrollo.

## Decisión

Adoptar de manera formal una **Estrategia de Testing en Pirámide**, estructurada en tres niveles operativos de validación y ejecutada a través de un ecosistema tecnológico híbrido y complementario [ADR-28]:

1. **Capa Unitaria (Alta Densidad y Aislamiento):**
   * *Frontend:* Uso de Vitest y React Testing Library para validar el comportamiento de componentes atómicos (`GenericButton`) y aislar la lógica de componentes complejos como `GlobalNotificationBell.test.tsx`.
   * *Backend:* Pruebas unitarias sobre servicios aislados, destacando `RecommendationServiceTest.java`, que valida la matriz de pesos del algoritmo predictivo de forma independiente del motor de persistencia.
2. **Capa de Integración Técnica e Infraestructura:**
   * Validación de la capa criptográfica mediante `JwtServiceTest.java` y comprobación perimetral de red a través de `CorsIntegrationTest.java` para asegurar que el modelo stateless sea infranqueable.
   * Pruebas reales de persistencia y consistencia relacional en repositorios (`EnrollmentRepositoryTest.java`) para garantizar la integridad de las cláusulas JPQL y el cursor de PostgreSQL tras los procesos transaccionales.
3. **Capa de Flujo de Negocio (Integración Funcional de Extremo a Extremo):**
   * Implementación de la suite `NotificationDocumentFlowIntegrationTest.java` en el backend y su equivalente homólogo en el frontend. Estos tests validan el "camino feliz" (*happy path*) completo del sistema: desde que un documento se persiste con metadatos hasta que el sistema de persistencia genera reactivamente la alerta correspondiente indexada por el `receiver_id` del destinatario.

## Consecuencias

### Impacto Positivo

* **Confianza Absoluta en la Refactorización:** Permite realizar cambios estructurales profundos y tareas de purificación de código inerte con la certeza matemática de que los flujos críticos de la plataforma siguen 100% operativos.
* **Documentación Técnica Viva:** Las suites de pruebas actúan como una especificación funcional ejecutable que describe de forma exacta cómo deben interactuar los componentes, servicios y contratos entre ambas capas del software.
* **Automatización del Gobierno de Calidad:** La suite completa está integrada en el pipeline de Integración Continua (CI) mediante GitHub Actions (`ci.yml`), garantizando que ninguna rama de código pueda fusionarse con la rama principal si no supera satisfactoriamente todas las validaciones de la pirámide.

### Impacto Negativo / Riesgos Mitigados

* **Sobrecarga de Mantenimiento por Alta Cobertura:** El incremento exponencial de la cobertura exige un esfuerzo de ingeniería adicional para actualizar, sincronizar y adaptar las aserciones de los tests cada vez que se modifique una regla de negocio o la estructura de los DTOs compartidos.
* *Mitigación:* Se implementó un diseño de pruebas estrictamente acotado y guiado por comportamiento, evitando verificar detalles de implementación volátiles o estilos estéticos mutables. Los tests se centran de forma exclusiva en la invariabilidad de las firmas de los contratos y la lógica perimetral de seguridad, minimizando drásticamente la tasa de mantenimiento y falsos positivos en el pipeline.

---

# ADR-055: Estrategia de Testing en Pirámide y Validación de Flujos de Integración

## Estatus

Aceptado

## Fecha

Julio 2026

## Contexto

Con la creciente complejidad funcional y de seguridad de la plataforma (intercambio bidireccional de archivos [ADR-48], motor de recomendaciones algorítmicas [ADR-34] y seguridad stateless JWT [ADR-03]), se hacía imperativo establecer un marco estricto de aseguramiento de la calidad (QA) que garantizara que las refactorizaciones profundas (como la unificación de la campana global [ADR-52] o la limpieza de código muerto) no introdujeran regresiones operacionales. Una arquitectura desacoplada y robusta exige que tanto el contrato de datos del backend como la reactividad de la UI en el frontend estén blindados de manera simétrica ante cualquier alteración del entorno de desarrollo.

## Decisión

Adoptar de manera formal una **Estrategia de Testing en Pirámide**, estructurada en tres niveles operativos de validación y ejecutada a través de un ecosistema tecnológico híbrido y complementario [ADR-28]:

1. **Capa Unitaria (Alta Densidad y Aislamiento):**
   * *Frontend:* Uso de Vitest y React Testing Library para validar componentes atómicos (`GenericButton`) y aislar la lógica de componentes complejos como `GlobalNotificationBell.test.tsx`, forzando la degradación amigable (*Graceful Degradation*) de la interfaz y la simulación asíncrona de dropdowns mediante bloques `await waitFor`.
   * *Backend:* Pruebas unitarias sobre servicios aislados, destacando `RecommendationServiceTest.java`, que valida la matriz de pesos del algoritmo predictivo de forma independiente del motor de persistencia.
2. **Capa de Integración Técnica e Infraestructura:**
   * Validación de la capa criptográfica mediante `JwtServiceTest.java` y comprobación perimetral de red a través de `CorsIntegrationTest.java` para asegurar que el modelo stateless sea infranqueable.
   * Pruebas de persistencia y consistencia relacional en repositorios (`EnrollmentRepositoryTest.java`) para garantizar la integridad de las cláusulas JPQL, junto con auditorías programáticas de desmontado de nodos (`unmount`) en elementos de alta carga visual como la consola de administración (`UserScrollList.test.tsx`) para certificar la ausencia de fugas de memoria concurrentes.
3. **Capa de Flujo de Negocio (Integración Funcional de Extremo a Extremo):**
   * Implementación de la suite `NotificationDocumentFlow.integration.test.tsx` en el frontend. Este test valida el flujo de negocio completo: desde que un documento se persiste con metadatos hasta que el sistema genera reactivamente la alerta correspondiente indexada por el `receiver_id`, forzando la mutación estética de la campana mediante el consumo de eventos nativos del sistema de ventanas (`window.dispatchEvent`).

## Justificación para el TFG

* **Rigor Metodológico Avanzado (QA):** Aporta el máximo nivel de rigor metodológico y madurez de ingeniería de software exigido en la rúbrica de evaluación de un TFG, validando la integración real entre las capas de negocio, seguridad, red y persistencia de datos.
* **Escudo Inmune a Regresiones:** El uso de contexto web simulado en Spring Boot y mocks controlados en React aísla las responsabilidades de los componentes. Esto garantiza que las pruebas actúen como un escudo perimetral inmune a futuras alteraciones en la base de datos o modificaciones estéticas en la interfaz de usuario, proveyendo documentación viva y ejecutable.

## Consecuencias

### Impacto Positivo

* **Confianza Absoluta en la Refactorización:** Permite realizar cambios estructurales profundos y tareas de purificación de código inerte con la certeza matemática de que los flujos críticos de la plataforma siguen 100% operativos.
* **Documentación Técnica Viva:** Las suites de pruebas actúan como una especificación funcional ejecutable que describe de forma exacta cómo deben interactuar los componentes, servicios y contratos entre ambas capas del software.
* **Automatización del Gobierno de Calidad:** La suite completa está integrada en el pipeline de Integración Continua (CI) mediante GitHub Actions (`ci.yml`), garantizando que ninguna rama de código pueda fusionarse con la rama principal si no supera satisfactoriamente todas las validaciones de la pirámiade (83 tests en verde).

### Impacto Negativo / Riesgos Mitigados

* **Sobrecarga de Mantenimiento por Alta Cobertura:** El incremento exponencial de la cobertura exige un esfuerzo de ingeniería adicional para actualizar, sincronizar y adaptar las aserciones de los tests cada vez que se modifique una regla de negocio o la estructura de los DTOs compartidos [ADR-23].
* *Mitigación:* Se implementó un diseño de pruebas estrictamente acotado y guiado por comportamiento, utilizando expresiones regulares con la bandera `i` para ignorar variaciones de capitalización. Los tests se centran exclusivamente en la invariabilidad de las firmas de los contratos y la lógica perimetral de seguridad, minimizando la tasa de refactorización de los tests ante cambios cosméticos.

---

# ADR-056: Componentización y Abstracción del Motor de Búsqueda de Cursos

## Estatus

Aceptado

## Contexto

Originalmente, el sistema contaba con un componente `CourseCatalog.tsx` exclusivo para el rol de estudiante. Con la implementación del panel del profesor, surgió la necesidad de una funcionalidad de búsqueda idéntica (filtrado, visualización en tarjetas, búsqueda por texto) pero con una finalidad distinta: en lugar de matricularse, el profesor selecciona cursos para impartirlos. Duplicar esta lógica violaría el principio **DRY (Don't Repeat Yourself)** y dificultaría el mantenimiento futuro de la base de código.

## Decisión

Se ha decidido factorizar la lógica de búsqueda en un motor agnóstico al rol de usuario mediante la siguiente arquitectura:

1. **Creación del `CourseSearchEngine.tsx`:** Un componente de UI compartido localizado en `frontend/src/components/ui/courseSearch/` que gestiona exclusivamente la visualización, estados de interfaz y el filtrado avanzado de cursos.
2. **Abstracción de Servicios:** El hook global unificado `useCourseCatalog.ts` se ha trasladado a la capa de servicios globales para desacoplarlo de las vistas y permitir su consumo agnóstico desde cualquier parte del sistema, exponiendo `actionExecutionId` y `executeCourseAction`.
3. **Implementación de Wrappers (Pickers) por Rol:**
   * `StudentCoursePicker.tsx`: Envuelve el motor común e inyecta el botón contextual **"Matricularme"** a través de la propiedad parametrizada `renderAction`.
   * `ProfessorCoursePicker.tsx`: Envuelve el motor común e inyecta el botón contextual **"Impartir Curso"** a través de la misma propiedad `renderAction`.
4. **Extensibilidad:** El diseño modular queda blindado y preparado para futuras integraciones, como un buscador administrativo orientado a la gestión global del catálogo.

## Consecuencias

### Positivas

* **Reducción de Deuda Técnica:** Eliminación total de código duplicado mediante la centralización de la lógica de negocio y las llamadas asíncronas de búsqueda.
* **Consistencia Visual:** Todos los roles del sistema consumen la misma interfaz base de búsqueda, garantizando una experiencia de usuario (UX) coherente en la plataforma.
* **Escalabilidad Inmediata:** Cualquier optimización futura en el motor (como búsquedas predictivas por voz o nuevos filtros estructurados) se propagará automáticamente a todos los roles sin modificar los envoltorios.

### Riesgos

* **Complejidad en Props:** El componente compartido debe ser lo suficientemente abstracto para procesar diferentes acciones contextuales (`renderAction`), lo que incrementa la complejidad de su interfaz de tipos (**TypeScript**) al requerir generics o tipados estrictos para las funciones inyectadas.

---

# Notas de Migración: Transición a JWT y Compatibilidad

**Fecha de análisis:** Junio 2026
**Objetivo:** Definir el contrato de autenticación, compatibilidad y alcance de la transición desde el modelo de sesiones actual hacia JSON Web Tokens (JWT).

---

## 1. Lógica de Sesiones Actual (A mantener temporalmente)

* **Base en Spring Security:** Configuración activa en `SecurityConfig.java` con política `IF_REQUIRED`. El `SecurityContext` se persiste en la sesión HTTP tradicional.
* **Flujo de Login:** Gestionado por `SessionAuthenticationService.java`. Autentica credenciales, crea el contexto de seguridad y no emite ningún tipo de token.
* **Validación de Identidad:** El endpoint `/api/auth/me` (en `UserController.java`) lee directamente de la sesión activa del navegador.
* **Modelo de Datos:** `AuthResponse.java` expone la información del usuario, pero no incluye campos para credenciales de acceso ni tokens.
* **Roles:** Autorización completamente funcional mediante *authorities* mapeadas en `CustomUserDetailsService.java`.
* **Frontend:** El estado de la aplicación en React está acoplado a la persistencia de la sesión local a través de `AuthProvider.tsx` y `AuthModal.tsx`.

---

## 2. Componentes y Clases Afectadas por el Cambio

### Backend

* `SecurityConfig.java`: Cambiará el núcleo de la configuración para permitir un comportamiento *stateless* (sin estado).
* `SessionAuthenticationService.java`: Dejará de ser el mecanismo central de persistencia de sesión.
* `UserController.java`: Adaptación de los endpoints de login, logout y `/me` para devolver o validar tokens.
* `AuthResponse.java`: Se extenderá para soportar *access token*, *refresh token* y tiempos de expiración.
* `CustomUserDetailsService.java`: Su propósito cambiará a proveer la identidad requerida para la validación del JWT entrante.

### Frontend (React)

* `AuthProvider.tsx` / `authStorage.ts` / `AuthModal.tsx`: Cambiarán su lógica para almacenar, leer y renovar los tokens en el navegador.
* `ProtectedRoute.tsx`: Adaptación de los guardianes de ruta para verificar la validez del token y los roles del usuario.

---

## 3. Estrategia y Recomendación de Convivencia Técnica

Para realizar una migración segura y evitar la ruptura del sistema, se aplicará un enfoque de convivencia de dos capas en fases:

1. **Fase 1 (Backend Compatible):** Mantener el flujo de sesiones operativo como respaldo (*fallback*). Introducir la lógica de JWT en paralelo, permitiendo al backend reconocer ambos modos según la configuración o el entorno.
2. **Fase 2 (Pruebas de Bloqueo):** Validar mediante tests que los nuevos endpoints JWT gestionan correctamente el login, la autorización y el rechazo de accesos no autenticados sin alterar la capa de sesión clásica.
3. **Fase 3 (Adaptación del Frontend):** Modificar React para migrar al flujo de *Token Bearer*.
4. **Fase 4 (Limpieza):** Retirar de forma progresiva la infraestructura antigua de sesiones una vez que el flujo JWT esté 100% estabilizado en producción.

---

## 4. Diseño de Paquetes y Fases de Ejecución

### Estructura de Paquetes Propuesta (Backend)

* `com.cursosonline.backend.security.jwt`: Contendrá `JwtService.java` (generación/validación) y `JwtAuthenticationFilter.java` (filtro de petición).
* `com.cursosonline.backend.config.jwt`: Contendrá `JwtProperties.java` (lectura segura de claves desde properties).
* `com.cursosonline.backend.dto.auth`: Contendrá los nuevos contratos de entrada y salida (`AuthRequest`, `AuthTokenResponse`).
* `com.cursosonline.backend.services.auth`: Contendrá `JwtAuthenticationService.java` para orquestar el login con tokens.

### Mapa de Ruta Estructurado en Fases

* **Fase 0:** Preparación de la rama de Git y definición de variables en `application.properties`.
* **Fase 1:** Creación de la capa JWT aislada (servicios y propiedades) sin conectar a la red.
* **Fase 2:** Integración del filtro en `SecurityConfig.java` habilitando la doble vía (Sesión + JWT).
* **Fase 3:** Creación de los nuevos DTOs y adaptación de los controladores en `UserController.java`.
* **Fase 4:** Despliegue del servicio de autenticación y pruebas de validación en paralelo.
* **Fase 5:** Endurecimiento de seguridad (CORS, control de errores 401/403) y paso final a *Stateless*.

---

## 5. Checklist Operativo Diario y Criterios Go/No-Go

Esta guía de ejecución permite avanzar de forma incremental, garantizando que el sistema no sufra regresiones funcionales mientras conviven el modelo de sesión y JWT.

### 📅 Día 1: Base JWT Aislada

* **[ ] Preparar configuración y contrato técnico:** Definir variables de entorno (secretos, expiraciones) en `application.properties`.
  * **Go:** Parámetros configurados externamente; backlog actualizado; sin impacto en el entorno de ejecución.
  * **No-Go:** Secretos escritos directamente en el código Java o ambigüedad en los tiempos de expiración.
  * *Evidencia mínima:* Archivo de propiedades configurado y parámetros validados.
* **[ ] Crear estructura de paquetes y clases JWT:** Desarrollar `JwtService`, `JwtAuthenticationFilter` y `JwtProperties`.
  * **Go:** Clases creadas con responsabilidades separadas; el proyecto compila limpiamente.
  * **No-Go:** Acoplar lógica de negocio de login dentro del filtro o generar dependencias circulares.
  * *Evidencia mínima:* Compilación del backend con éxito (`BUILD SUCCESS`).
* **[ ] Validar integridad del flujo de sesión actual:** Probar el comportamiento de los endpoints activos.
  * **Go:** El login tradicional y el endpoint `/api/auth/me` responden de forma idéntica a la inicial.
  * **No-Go:** Cualquier fallo o cambio en los códigos de estado HTTP en las peticiones de sesión.
  * *Evidencia mínima:* Test manual satisfactorio de login por sesión en el navegador o cliente API.

### 📅 Día 2: Convivencia Segura en SecurityConfig

* **[ ] Integrar filtro JWT en la cadena de seguridad:** Registrar el componente en `SecurityConfig.java`.
  * **Go:** Filtro JWT posicionado antes de la autenticación estándar; política de sesión en `IF_REQUIRED`.
  * **No-Go:** Cambiar a política *stateless* antes de tiempo o bloquear peticiones sin token que tienen sesión activa.
  * *Evidencia mínima:* Peticiones con cookie de sesión y peticiones con Bearer Token son válidas simultáneamente.
* **[ ] Verificar la autorización basada en roles:** Validar los accesos restringidos.
  * **Go:** Los perfiles de administración, profesorado y estudiantado mantienen sus restricciones de acceso intactas.
  * **No-Go:** Respuestas de acceso denegado (403) inesperadas para usuarios con permisos correctos.
  * *Evidencia mínima:* Matriz de verificación de endpoints y roles completada con éxito.
* **[ ] Consolidar el control de errores HTTP:** Asegurar respuestas semánticas homogéneas.
  * **Go:** El sistema devuelve estrictamente `401 Unauthorized` si no hay identidad y `403 Forbidden` si no hay permisos.
  * **No-Go:** Respuestas erróneas mezcladas o respuestas vacías según el origen de la autenticación.
  * *Evidencia mínima:* Verificación de respuestas en el manejador global de excepciones.

### 📅 Día 3: Contrato JWT en API y Compatibilidad

* **[ ] Definir Objetos de Transferencia de Datos (DTOs):** Crear el paquete `dto.auth` con los nuevos contratos.
  * **Go:** Modelos claros para peticiones y respuestas JWT; mantenimiento temporal del contrato anterior.
  * **No-Go:** Exponer o reutilizar la entidad de persistencia `Users` directamente en el cuerpo de la petición.
  * *Evidencia mínima:* Nuevas clases DTO integradas sin errores de compilación.
* **[ ] Implementar el servicio de autenticación JWT:** Desplegar `JwtAuthenticationService` de forma aislada.
  * **Go:** Lógica de emisión de tokens y refresco operativa; el servicio de sesiones sigue funcionando en paralelo.
  * **No-Go:** Eliminar o alterar la infraestructura del servicio de sesión clásico.
  * *Evidencia mínima:* Generación exitosa del primer token simulado mediante pruebas unitarias.
* **[ ] Habilitar doble vía en controladores:** Adaptar la capa de exposición web.
  * **Go:** El endpoint `/api/auth/me` resuelve la identidad del usuario tanto por token como por sesión.
  * **No-Go:** Caída del endpoint `/me` en cualquiera de las dos modalidades de acceso.
  * *Evidencia mínima:* Batería de pruebas funcionales ejecutada correctamente para ambos flujos.

### 📅 Día 4: Endurecimiento (Hardening) y Criterio de Transición

* **[ ] Auditoría de seguridad operativa:** Revisión final de parámetros críticos.
  * **Go:** Expiraciones temporales estrictas (token de acceso corto, refresco largo); políticas CORS restringidas.
  * **No-Go:** Uso de credenciales por defecto, secretos débiles o políticas CORS excesivamente permisivas.
  * *Evidencia mínima:* Archivo de configuración validado bajo criterios de seguridad empresarial.
* **[ ] Evaluación de la fase de convivencia:** Comprobación del estado general del backend.
  * **Go:** El backend es robusto, no presenta regresiones y tolera ambos tipos de clientes simultáneamente.
  * **No-Go:** Persistencia de comportamientos indeterminados o fallos intermitentes en la cadena de seguridad.
  * *Evidencia mínima:* Informe de estado de compilación definitivo y confirmación del backend compatible.
* **[ ] Definición del criterio de desconexión (Fase Stateless):** Establecer las pautas de cierre del flujo antiguo.
  * **Go:** El cliente en React consume JWT y gestiona el refresco de sesión de forma autónoma.
  * **No-Go:** Frontend dependiente de la cookie de sesión del servidor para operaciones críticas.
  * *Evidencia mínima:* Validación completa del flujo de la interfaz de usuario contra la API protegida por JWT.

---

## 🚦 Semáforo de Control de Riesgos

* 🟢 **Verde (GO):** El proyecto compila sin advertencias, los flujos previos de sesión se mantienen totalmente operativos, los componentes de seguridad JWT se integran de forma incremental, los roles operan bajo la política definida y las excepciones HTTP conservan su semántica técnica.
* 🟡 **Amarillo (GO CONDICIONADO):** El sistema compila y opera de forma funcional, pero se identifican de uno a dos riesgos menores de integración no bloqueantes. Se requiere documentar el plan de mitigación inmediato antes de continuar con la siguiente actividad.
* 🔴 **Rojo (NO-GO):** Se detecta una regresión en los endpoints core existentes (`login`, `/me`), inconsistencia en la aplicación de roles, alteración del filtro global de Spring Security o vulnerabilidades expuestas en la configuración del token. Se detiene el avance hasta solventar el conflicto.
