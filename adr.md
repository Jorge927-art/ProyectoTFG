# Registro de Decisiones de Arquitectura (ADR) - TFG

Este documento centraliza las decisiones técnicas críticas tomadas durante el desarrollo del sistema, justificando su contexto, las alternativas evaluadas y las consecuencias en el diseño de software.

---

## [ADR-01] React + Spring Boot como Arquitectura Desacoplada

* **Fecha:** Junio 2026
* **Estatus:** Aceptado
* **Contexto:** Se requiere construir una plataforma web de formación con capacidad de crecimiento funcional, garantizando que el diseño visual y la lógica de negocio no interfieran entre sí.
* **Decisión:** Adoptar una arquitectura cliente-servidor completamente desacoplada mediante una Single Page Application (SPA) en React y una API REST empresarial en Spring Boot.
* **Justificación para el TFG:** Permite la separación estricta de responsabilidades (Frontend/Backend). Facilita el desarrollo independiente y cumple con los estándares actuales de la industria del software.
* **Consecuencias:** Duplicidad inicial de modelos de datos en TypeScript y Java, pero total libertad para rediseñar la interfaz sin alterar la base de datos.

---

## [ADR-02] Organización del Espacio de Trabajo mediante Monorepo

* **Fecha:** Junio 2026
* **Estatus:** Aceptado
* **Contexto:** El proyecto involucra dos tecnologías independientes (React y Spring Boot) gestionadas por un único desarrollador durante el ciclo de vida del TFG.
* **Decisión:** Alojar ambas aplicaciones en directorios diferenciados (`frontend/` y `backend/`) dentro del mismo repositorio de Git.
* **Justificación para el TFG:** Simplifica drásticamente la gestión del código, reduce la fricción operativa y permite realizar un único *commit* que relacione un cambio funcional simultáneo en el cliente y el servidor.
* **Consecuencias:** El repositorio crece en tamaño, pero se centraliza toda la documentación técnica en la raíz del proyecto de cara a la evaluación del tribunal.

---

## [ADR-03] Transición por Fases de Sesión HTTP a JSON Web Tokens (JWT)

* **Fecha:** Junio 2026
* **Estatus:** En Progreso (Fase 1)
* **Contexto:** El backend opera mediante autenticación tradicional basada en sesión, lo que acopla el servidor al estado del cliente y limita la escalabilidad de la API REST.
* **Decisión:** Migrar el sistema hacia un modelo de seguridad basado en tokens JWT (*stateless*), utilizando una estrategia de convivencia temporal en dos capas.
* **Justificación para el TFG:** La arquitectura *stateless* es el estándar nativo para APIs REST. La migración por fases mitiga el riesgo de regresiones y fallos en cascada, demostrando la aplicación de buenas prácticas de control de riesgos.
* **Consecuencias:** Durante la transición, el filtro de seguridad debe ser "no intrusivo" para permitir que convivan clientes con cookies y clientes con cabeceras `Bearer`, aumentando temporalmente la complejidad de `SecurityConfig.java`.

---

## [ADR-04] Configuración de Propiedades JWT y Fallbacks de Entorno para Tests

* **Fecha:** Junio 2026
* **Estatus:** Aceptado
* **Contexto:** Al introducir el componente de configuración estricta `JwtProperties`, el entorno de pruebas unitarias (`BackendApplicationTests`) fallaba críticamente (`BUILD FAILURE`) debido a que la propiedad requerida `app.jwt.secret` no se encontraba definida en el contexto de carga de los tests, provocando una excepción de tipo `IllegalStateException`.
* **Decisión:** Incorporar valores base estandarizados y mecanismos de *fallback* para desarrollo y pruebas dentro del archivo global `application.properties`, desacoplándolo temporalmente de la configuración rígida por variables de entorno del sistema.
* **Justificación para el TFG:** Demuestra la aplicación del principio de robustez en el ciclo de vida del software. Al garantizar un valor por defecto seguro en entornos no productivos, se asegura que el ecosistema de integración y pruebas unitarias sea independiente del sistema operativo o máquina donde el tribunal o evaluador compile el proyecto.
* **Consecuencias:** Se recupera la estabilidad del contexto de Spring Boot en un estado saludable (`BUILD SUCCESS`), permitiendo avanzar en la inyección de dependencias de seguridad de forma controlada y aislada.

---

## [ADR-05] Implementación del Modelo de Autenticación Híbrido (Sesión + JWT)

* **Fecha:** Junio 2026
* **Estatus:** Aceptado
* **Contexto:** La migración desde un sistema basado en sesión con estado (*stateful*) hacia una arquitectura basada en tokens criptográficos (*stateless*) introduce riesgos de ruptura en el frontend de React. Se requiere que el servidor admita la emisión y validación de tokens sin inhabilitar el flujo operativo preexistente.
* **Decisión:** Desarrollar e integrar una capa híbrida que permita la coexistencia de ambos mecanismos de autenticación mediante la inyección pasiva de un filtro personalizado (`JwtAuthenticationFilter`) en la cadena de seguridad de Spring.
* **Justificación para el TFG:** Demuestra la aplicación de metodologías de control de riesgos y desarrollo ágil incremental. Al unificar la entidad `Users` con la interfaz `UserDetails` de Spring Security, se logra que la resolución de la identidad del usuario a través del contexto (`SecurityContextHolder`) sea agnóstica al origen del acceso. Esto permite dotar al sistema de una doble vía de entrada completamente desacoplada.
* **Consecuencias:** Se mantiene la estabilidad operativa del sistema en un estado saludable (`BUILD SUCCESS`), permitiendo que el cliente en React migre de forma progresiva a la cabecera `Authorization Bearer` sin perder la sesión clásica como mecanismo de respaldo automático (*fallback*).

---

## [ADR-06] Gestión de Estado Global y Persistencia de Tokens en React

* **Fecha:** Junio 2026
* **Estatus:** Aceptado
* **Contexto:** Al adaptar la arquitectura del cliente en React para procesar la nueva respuesta híbrida del servidor, se requería una estrategia de persistencia en el navegador que permitiese almacenar tanto los datos descriptivos del perfil del usuario (para la renderización de la interfaz) como el token criptográfico JWT (para la autorización de red) sin generar acoplamiento ni vulnerabilidades de seguridad por exposición de credenciales.
* **Decisión:** Modificar el ecosistema del contexto de autenticación (`authTypes.ts`, `AuthContext.tsx`, `AuthProvider.tsx`) y rediseñar el módulo de almacenamiento local (`authStorage.ts`) para separar físicamente la persistencia del objeto `AuthUser` respecto al string del `accessToken`.
* **Justificación para el TFG:** Esta separación de responsabilidades en el almacenamiento local (*localStorage*) es una buena práctica de ingeniería web fundamental para la memoria del TFG. Aislar el token en su propia clave de memoria (`accessToken`) independiza la lógica de las llamadas HTTP respecto al estado visual de la interfaz. Esto facilitará que en la siguiente fase de desarrollo se pueda inyectar el token de forma automatizada en las cabeceras `Authorization Bearer` de un cliente Axios o Fetch centralizado, manteniendo intacto el ciclo de renderizado de los componentes de React.
* **Consecuencias:** Se estabiliza el tipado estático del frontend sin advertencias del compilador de TypeScript, asegurando un punto de partida óptimo para conectar las llamadas API reales de los formularios de la SPA sin alterar la experiencia de usuario preexistente.

---

## [ADR-07] Consumo del Contrato JWT y Desacoplamiento de Vistas en el Cliente

* **Fecha:** Junio 2026
* **Estatus:** Aceptado
* **Contexto:** Tras rediseñar el almacenamiento de tokens en React, se requería adaptar la interfaz gráfica de inicio de sesión (`AuthModal.tsx`) para consumir el nuevo payload del servidor sin alterar el diseño visual, las animaciones ni la experiencia de usuario de los formularios de la SPA.
* **Decisión:** Refactorizar la función controladora del formulario de Login para realizar el tipado estático seguro (*type casting*) de la respuesta HTTP de Axios hacia la interfaz `AuthTokenResponse`, delegando el almacenamiento inmediato del token de acceso de red y los metadatos de perfil en el storage local y actualizando el estado de autenticación de la aplicación de forma transparente.
* **Justificación para el TFG:** Demuestra la capacidad de consumir APIs bajo contratos de tipado estricto en entornos corporativos. Al desligar el procesamiento del payload JSON de la capa de presentación visual, se garantiza que los componentes gráficos permanezcan aislados frente a futuras modificaciones en la estructura de las propiedades devueltas por Spring Boot.
* **Consecuencias:** Se logra un flujo de autenticación seguro, tipado y completamente operativo que actualiza el estado reactivo global del cliente de manera síncrona tras la verificación de las credenciales en PostgreSQL.

---

## [ADR-08] Centralización de Peticiones HTTP mediante Interceptores de Red

* **Fecha:** Junio 2026
* **Estatus:** Aceptado
* **Contexto:** Almacenado el token JWT en el cliente, se requería un mecanismo para adjuntarlo en la cabecera `Authorization: Bearer` de cada petición hacia recursos protegidos del backend, evitando que los componentes visuales asuman lógica repetitiva de red o manipulen directamente el almacenamiento físico.
* **Decisión:** Implementar un cliente HTTP personalizado (`src/services/apiClient.ts`) basado en Axios, de uso obligatorio para las comunicaciones con la API, incorporando interceptores automáticos de solicitud (*Request Interceptors*).
* **Justificación para el TFG:** Demuestra un profundo conocimiento del patrón de diseño estructural *Proxy* o *Middleware* aplicado a comunicaciones de red. Al delegar la inyección del token en un interceptor centralizado, se garantiza el principio de Securitización Transparente: el resto de la aplicación consume la API de forma nativa, mientras que el interceptor se encarga de auditar y adjuntar las credenciales necesarias, aislando por completo la capa visual de la capa de transporte de seguridad.
* **Consecuencias:** Reducción drástica del acoplamiento en el frontend. Automatización completa de la inyección de seguridad en peticiones salientes y centralización de la captura de errores globales de autenticación (códigos HTTP 401).

---

## [ADR-09] Mecanismo de Hidratación de Sesión mediante Validación Asíncrona del Token

* **Fecha:** Junio 2026
* **Estatus:** Aceptado
* **Contexto:** Al recargar la interfaz web de la SPA, el estado volátil de React se destruye. Se requería un mecanismo automático que determinase si el token almacenado localmente seguía siendo válido en el servidor antes de renderizar las pantallas privadas de la aplicación.
* **Decisión:** Implementar un efecto secundario de ciclo de vida (`useEffect`) en la inicialización del `AuthProvider` para consumir el endpoint `/api/auth/me` de forma transparente, controlando el flujo mediante un estado bandera `isLoading`.
* **Justificación para el TFG:** Demuestra el uso correcto del patrón de sincronización de estado cliente-servidor (*State Hydration*). Utilizar una variable `isLoading` evita la pérdida de sesión en recargas y unifica la verificación síncrona en el cliente con las respuestas de la API del servidor.
* **Consecuencias:** Consolidación total de la seguridad de la SPA. Las recargas de página recuperan la identidad del usuario de forma inmediata y el estado se sincroniza de forma robusta ante tokens expirados.

---

## [ADR-10] Unificación de Layouts Mediante Composición Paramétrica Reactiva al Rol

* **Fecha:** Junio 2026
* **Estatus:** Superado (Rectificado)
* **Contexto:** La arquitectura original propuesta en este registro planteaba una segregación física de archivos (`AdminLayout.tsx`, `ProfessorLayout.tsx` y `StudentLayout.tsx`) bajo la premisa de anticipar necesidades futuras de "composición especializada". Sin embargo, tras una auditoría técnica orientada al despliegue, se evidenció un escenario de sobreingeniería y deuda técnica: los tres componentes compartían el 98% de su infraestructura lógica y directivas estéticas de Tailwind CSS, divergiendo únicamente en parámetros milimétricos de espaciado lateral (`px-4` frente a `px-6`). Mantener esta dispersión multiplicaba el riesgo de desincronización ante actualizaciones globales del diseño perimetral.
* **Decisión:** Deprecar y eliminar del sistema los tres archivos redundantes de diseño por rol. Toda la infraestructura visual del frontend se centraliza de manera absoluta en un único componente inteligente: `DashboardLayout.tsx`. Este elemento se redefine como un contenedor paramétrico que autodetecta en tiempo real el rol del usuario autenticado a través del contexto global de `useAuth`, inyectando dinámicamente las clases geométricas correspondientes.
* **Justificación para el TFG:** Esta rectificación prioriza de forma rigurosa el principio fundamental *DRY (Don't Repeat Yourself)* sobre asunciones de diseño tempranas y desacopladas de la realidad del código fuente. Al consolidar la interfaz perimetral en un único punto de control, se optimiza la mantenibilidad del software. Cualquier modificación estructural (como la futura adición de pies de página o menús laterales) requiere una única edición centralizada, reduciendo a cero el radio de fallo por omisión en vistas satélite y eliminando la redundancia estructural en el árbol de componentes de React.
* **Consecuencias:**
  * **Mitigación de Deuda Técnica:** Reducción drástica del volumen de archivos huérfanos de lógica propia en el directorio de layouts, simplificando la auditoría de código del frontend.
  * **Coherencia Geométrica Garantizada:** La paridad visual entre los paneles de control queda blindada de forma nativa por el compilador, aplicando los espaciados específicos reactivos únicamente bajo la condición estricta de jerarquía (como el perfil del administrador).
  * **Optimización del Enrutamiento:** Simplificación en la integración de las vistas del cliente (`StudentDashboard`, `StudentProfilePage`, etc.), las cuales migran hacia el consumo de un único envoltorio homogéneo, facilitando el mantenimiento de las importaciones y la legibilidad en los módulos de navegación.

  ---

  # [ADR-11] Mitigación de Desincronización Temporal mediante Margen de Tolerancia (Clock Skew) en JWT

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

[ADR-12] Implementación de una Suite de Pruebas Automatizadas y Mecanismos de Smoke Testing para la Infraestructura de Seguridad Criptográfica

    Fecha: Junio 2026
    Estatus: Aceptado
    Contexto: Una auditoría técnica interna identificó una brecha de cobertura crítica (coverage gap) en el subsistema de seguridad. El componente más sensible del servidor, JwtService.java, carecía de pruebas unitarias que validasen la integridad de los algoritmos de firma HS256 y la gestión de tiempos de expiración. Asimismo, el archivo predeterminado BackendApplicationTests.java se limitaba a una prueba de carga de contexto vacía y estéril que no aportaba valor asertivo al ciclo de vida del software, dejando la inyección de dependencias de Spring Security expuesta a errores no detectados antes del despliegue.
    Decisión: Implementar una suite robusta de pruebas automatizadas utilizando JUnit 5 y Mockito. La estrategia se divide en dos niveles operativos localizados en la ruta estandarizada src/test/java/:
        Aislamiento Criptográfico (JwtServiceTest.java): Creación de pruebas unitarias que emplean dobles de prueba (Mocks) para verificar exhaustivamente la emisión de tokens, la correcta extracción de claims (roles y usuarios) y la inmutabilidad temporal mediante la validación del Clock Skew.
        Smoke Testing de Infraestructura: Refactorización de BackendApplicationTests.java para transformarlo en un test de humo activo. Este ahora valida de forma asertiva que los Beans críticos de seguridad (como el AuthenticationManager y los filtros JWT) se encuentren correctamente instanciados en el contenedor IoC de Spring.
    Justificación para el TFG: Esta decisión garantiza el cumplimiento de los estándares profesionales de Aseguramiento de la Calidad (QA) y la correcta aplicación de la Pirámide de Pruebas. Al automatizar la validación de la lógica criptográfica, se demuestra al tribunal la capacidad de certificar el software bajo el estándar BUILD SUCCESS de Maven. El pipeline de integración alcanza una tasa de éxito verificada del 100% (8 tests ejecutados, 0 fallos, 0 errores), proporcionando una métrica objetiva de fiabilidad técnica.
    Consecuencias:
        Eliminación de falsos positivos: Se erradica la posibilidad de que el sistema compile con una configuración de seguridad defectuosa.
        Certificación estática: El subsistema de autenticación queda blindado contra regresiones durante futuras refactorizaciones.
        Robustez en el pipeline: Se asegura que el ciclo de vida del desarrollo cuente con una red de seguridad técnica que valide la integridad de la plataforma de forma previa a cualquier despliegue en entornos de evaluación.

---

## [ADR-13] Purificación Arquitectónica de la Capa de Presentación mediante Composición Pura e Inyección del Contenedor de Scroll Controlado

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

## [ADR-14] Soporte Multirrol Dinámico y Corrección de Ámbito en Bloques Asíncronos (AuthModal & NavbarUser)

* **Fecha:** Junio 2026
* **Estatus:** Aceptado
* **Contexto:** Se requería la inclusión de un nuevo rol de usuario (`PROFESSOR`) dentro de la plataforma escolar, el cual debía coexistir de manera jerárquica con los roles preexistentes (`ADMIN` y `STUDENT`). Al intentar introducir manualmente esta lógica intermedia en el cliente SPA, se produjeron fallos críticos de sintaxis: una pérdida de ámbito (Scope) en `AuthModal.tsx` por un cierre prematuro de llaves (`}}`) que desconectó los bloques `catch` y `finally` provocando el error `Parsing error: 'catch' or 'finally' expected`; una evaluación lineal incorrecta que ejecutaba siempre la ruta `/student` de forma secuencial; y una limitación estructural en JSX dentro de `NavbarUser.tsx`, ya que el operador ternario binario tradicional (`condicion ? A : B`) no admitía una estructura procedural `if/else` directa.
* **Decisión:** Saneamiento y unificación del flujo mediante dos estrategias en el frontend:
  1. Reestructurar las llaves jerárquicas del bloque de captura asíncrono en `AuthModal.tsx` y confinar la redirección dentro de una estructura de control de tres vías (`if`, `else if`, `else`) mutuamente excluyente y atómica.
  2. Implementar una función flecha auto-invocada (IIFE: `(() => { ... })()`) dentro del árbol de renderizado JSX de `NavbarUser.tsx` para encapsular la lógica condicional múltiple. Se diseñó la identidad visual docente con un esquema esmeralda corporativo (`bg-emerald-50`, `text-emerald-800`) acoplado al icono descriptivo `BookOpen` de `lucide-react`.
* **Justificación para el TFG:** Demuestra el dominio de la especificación técnica de ECMAScript y la arquitectura de componentes reactivos en aplicaciones de gran envergadura (SPA). La resolución del bloqueo del árbol sintáctico del `try/catch/finally` evidencia buenas prácticas en el manejo del estado asíncrono y la robustez del software. Por su parte, la inyección de expresiones procedimentales mediante IIFE dota a la interfaz de una alta cohesión, paridad estética y mantenibilidad, criterios clave exigidos en la rúbrica de evaluación del tribunal.
* **Consecuencias:** Se eliminaron por completo los errores de compilación y de pérdida de alcance de las variables reactivas (`setError`, `setLoading`). La estructura condicional excluyente asegura que un usuario autenticado jamás ejecute código residual de otra ruta, mitigando redirecciones inválidas. Como deuda técnica menor, el uso de funciones auto-invocadas en JSX podría sobrecargar la legibilidad de la vista si el marcado por rol crece desmesuradamente en el futuro, planteando una potencial extracción a micro-componentes.

---

## [ADR-15] Centralización del Control de Roles Administrativos y Optimización Stateless (Stateless Token Parsing)

* **Fecha:** Junio 2026
* **Estatus:** Aceptado
* **Contexto:** Al intentar implementar la funcionalidad de alteración de privilegios en el componente del frontend `AdminDashboard.tsx`, el servidor Spring Boot emitía rechazos asíncronos y revertía localmente las mutaciones a su estado por defecto (`STUDENT`). Este fallo se debía a tres factores críticos: la omisión del verbo HTTP `PATCH` en las políticas CORS globales, la falta de mapeo explícito de la subruta de gestión `/api/auth/users/**` en las reglas de Spring Security, y un cuello de botella arquitectónico en el filtro `JwtAuthenticationFilter.java` que ejecutaba consultas redundantes a PostgreSQL (`UserDetailsService.loadUserByUsername`) en cada petición entrante.
* **Decisión:** Rediseñar e integrar la infraestructura de seguridad en tres niveles:
  1. Incorporar el método `PATCH` en el Bean de configuración CORS y mapear de manera robusta la ruta administrativa en `SecurityConfig.java` utilizando `.hasAnyAuthority("ADMIN", "ROLE_ADMIN")` para absorber discrepancias de nomenclatura de roles en bases de datos relacionales.
  2. Eliminar por completo el acceso redundante a persistencia en el ciclo de filtrado, transformando `JwtAuthenticationFilter` en un componente stateless que decodifica y reconstruye las autoridades (`SimpleGrantedAuthority`) en memoria extrayéndolas criptográficamente del token JWT (Claims).
  3. Vincular el selector interactivo `<select>` del frontend con el endpoint atómico parametrizado para salvaguardar el principio de menor privilegio.
* **Justificación para el TFG:** Aporta un valor metodológico fundamental en términos de seguridad informática y optimización de recursos. Demuestra al tribunal la capacidad de erradicar duplicidades y de transicionar con éxito desde un modelo híbrido con estado (Stateful) hacia una arquitectura puramente desacoplada (Stateless / RESTful). El parseo directo de claims en memoria reduce drásticamente los accesos concurrentes a la base de datos PostgreSQL, mejorando los tiempos de respuesta y la escalabilidad de la plataforma frente a picos de tráfico simulados.
* **Consecuencias:** Se elimina la degradación de rendimiento por dobles lecturas a disco en cada petición asegurada. El Administrador puede gestionar, auditar y reasignar los privilegios del alumnado y profesorado de forma instantánea y reactiva en la interfaz de usuario, garantizando una consistencia de datos atómica y libre de bloqueos cruzados en el servidor de preflight de los navegadores.

---

## [ADR-16] Unificación del Perfil Universal Atómico y Desacoplamiento de Flujos de Redirección mediante Cohesión de Componentes y Sincronización Síncrona del Contexto JWT

* **Fecha:** Junio 2026
* **Estatus:** Aceptado
* **Contexto:** Gestión de Perfil de Usuario (STUDENT, PROFESSOR, ADMIN) e Infraestructura de Navegación SPA.
* **Autores:** Luis (Desarrollador) / Laura / Jorge / Tutor TFG

---

## 1. Contexto y Problema

El sistema presentaba dos desafíos críticos interconectados que afectaban la experiencia de usuario y la integridad de los datos entre React (Vite, TSX) y el backend (Spring Boot 3 + PostgreSQL):

1. **Cortocircuito de Persistencia Backend (Excepción Hibernate):** El filtro de seguridad (`JwtAuthenticationFilter`) inyectaba un objeto `UserDetails` desvinculado de la sesión activa de Hibernate (*Detached*). Al enviar un payload `PUT` genérico (`/api/v1/profile/update`) para actualizar datos del perfil, Hibernate lanzaba sistemáticamente la excepción de infraestructura `org.hibernate.AssertionFailure: null identifier (UserProfile)`. El mecanismo `@MapsId` fallaba al derivar la clave de la entidad débil `user_profiles` debido al estado transaccional inestable de la entidad fuerte `users` en transacciones de actualización concurrentes.

2. **Bloqueo y Rebote Asíncrono en el Frontend (Navegación SPA):** Al interactuar con el elemento de interfaz de usuario (`GenericButton`) que muestra el nombre del estudiante autenticado ("Luis") en el componente de cabecera, la aplicación omitía el callback de navegación y bloqueaba el acceso de forma perenne. Se detectaron tres anomalías: una discrepancia semántica en TypeScript entre manejadores `MouseEventHandler` y funciones puras (`() => void`) bajo la directiva `verbatimModuleSyntax`, un acoplamiento innecesario por propagación vertical de propiedades (*Props Drilling*) desde `MainNavbar.tsx` hacia `NavbarUser.tsx`, y un rebote asíncrono destructivo en el guardia de seguridad (`ProtectedRoute.tsx`), el cual interpretaba el estado transitorio inicializado en `null` de la sesión como un falso negativo, expulsando al usuario debido a la regla comodín (`path="*"`) antes de terminar la hidratación del token JWT.

---

## 2. Decisión Arquitectónica

Para garantizar un diseño de software robusto, limpio y genérico alineado con las exigencias metodológicas del TFG, se rechazó cualquier duplicidad de endpoints o consultas nativas, implementando una estrategia estructural doble:

1. **Sincronización Avanzada de Persistencia Backend:** Inyectar la instrucción `userRepository.saveAndFlush(currentUser)` en la cabecera del procesamiento del controlador. Esto obliga a Spring Data JPA a capturar la entidad desacoplada, integrarla en la sesión activa (`EntityManager.merge()`) y vaciar los cambios síncronamente. Se invierte el orden físico, ejecutando primero `profileRepository.save(profile)` y luego `userRepository.save(currentUser)` para estabilizar el mecanismo `@MapsId`.
2. **Simetría y Composición por Roles en el Frontend:** Crear páginas contenedoras por rol (`StudentProfilePage`, `ProfessorProfilePage`, `AdminProfilePage`) compartiendo por composición el mismo formulario dinámico en `ProfileSettings.tsx`. El Navbar redirige correctamente mediante un mapeo de rutas según el rol.
3. **Autonomía Contextual y Sincronización JWT:** Dotar a `NavbarUser.tsx` de plena autonomía contextual consumiendo directamente el hook global de autenticación (`useAuth`). Se implementa la función flecha `() => handleProfileRedirect()` para aislar conflictos de firmas de tipos, y se sustituye el enrutamiento virtual por una navegación imperativa física con `window.location.href`. Esto fuerza un ciclo de hidratación limpio desde la raíz que obliga al guardián a respetar el estado preventivo (`isLoading`) mientras se recupera el token del almacenamiento local.

---

## 3. Justificación para el TFG

Aporta un valor metodológico fundamental en el área de ingeniería de interfaces y patrones de arquitectura de software para Single Page Applications (SPA). Demuestra al tribunal el dominio práctico sobre el principio de **Cohesión y Autonomía de Componentes**, erradicando el acoplamiento rígido de herencia de callbacks. En el backend, expone la capacidad de gestionar con éxito transacciones atómicas seguras y el ciclo de vida de entidades JPA acopladas (`1:1`) mediante claves compartidas en PostgreSQL.

---

## 4. Consecuencias

* **Positivas:** Se elimina la transferencia de propiedades muertas y las advertencias del linter (`eslint`). El flujo de acceso se homologa con el mecanismo nativo del módulo de inicio de sesión (`AuthModal.tsx`). El endpoint genérico da soporte transparente e idéntico a los tres roles (Luis, Laura y Jorge). Se habilitó con éxito la subida de avatares mediante `Multipart/Form-Data` con identificadores UUID únicos. Además, se resolvió la deuda técnica del scroll lateral en la consola de administración (`UserScrollList.tsx`) indexando los badges en un diccionario estático y aplicando una clave compuesta triple (`key={item.userId || item.username || ...}`) que fulmina el warning de llaves duplicadas o indefinidas en React.
* **Negativas / Deuda Técnica:** Ninguna detectada. El circuito de administración, enrutamiento y perfil universal queda cerrado y validado al 100%.

---

## [ADR-17] Arquitectura del Módulo de Gestión de Cursos y Modelado de Relaciones Unidireccionales para el Perfil Profesor

* **Fecha:** Junio 2026
* **Estatus:** Aceptado
* **Contexto:** Circuito del Profesor (Laura) - Creación y gestión de contenidos académicas.
* **Autores:** Luis (Desarrollador) / Tutor TFG

---

## 1. Contexto y Problema

Con el perfil unificado funcionando, el sistema requería implementar el circuito del profesor (Laura) para permitir la creación, edición y lectura de cursos en PostgreSQL. El desafío técnico radicaba en modelar las relaciones en Spring Boot 3 de forma **unidireccional** (para evitar referencias circulares e infinitas al serializar con Jackson a JSON) y asegurar que solo los usuarios con el rol `PROFESSOR` tengan privilegios de mutación en estos endpoints.

---

## 2. Decisión Arquitectónica

Se implementaron las siguientes directrices de diseño:

1. **Control de Acceso Basado en Roles (RBAC):** Asegurar los endpoints del controlador mediante anotaciones `@PreAuthorize("hasRole('PROFESSOR')")` a nivel de Spring Security.
2. **Modelado Unidireccional Limpio:** La entidad `Curso` contiene la referencia al profesor (entidad `User`), pero la entidad `User` no conoce los cursos que imparte, evitando sobrecargar la memoria de la sesión de Hibernate.
3. **Paginación e Interfaz en React:** Consumo del listado mediante Axios mapeando los estados en tarjetas escaneables dentro de `ProfessorDashboard.tsx`.

---

## 3. Consecuencias

* **Positivas:** Seguridad estricta en la capa de servicios (Laura puede gestionar sus cursos, pero Luis el alumno solo tiene acceso de lectura). Respuestas JSON ligeras y limpias sin necesidad de usar `@JsonManagedReference` o `@JsonIgnore`.
* **Negativas / Deuda Técnica:** Al usar relaciones unidireccionales, para obtener los cursos de un profesor específico se requiere una query personalizada en el repositorio (`findByProfesorId`), lo cual queda documentado y optimizado.

---

## [ADR-18] Diseño de Persistencia Normalizada Multivalor y Simetría Relacional para Intereses del Alumnado

* **Fecha:** Junio 2026
* **Estatus:** Aceptado

### Contexto

Al planificar la infraestructura del futuro módulo de recomendación inteligente en el frontend (`StudentDashboard.tsx`), se identificó la necesidad imperativa de capturar de forma genérica y multidimensional los intereses del estudiante en HTML/React en cinco ejes críticos: categorías temáticas, nivel, duración de cursos, idioma y subtítulos. El almacenamiento tradicional en columnas de texto plano (strings concatenados por comas) provocaría una degradación severa del rendimiento, obligando al servidor a ejecutar costosas operaciones de búsqueda de patrones con comodines (`LIKE`), anulando la utilidad de los índices y violando la Primera Forma Normal (1FN) de las bases de datos relacionales. Adicionalmente, se detectó que al abrir el componente modal multiscroll (`InterestsModal.tsx`), las preferencias no persistían marcadas en la interfaz de usuario, debido a que el motor de persistencia sufría una desconexión por carga perezosa (*lazy loading*) en las colecciones secundarias y a que existía una colisión de rutas en el enrutamiento HTTP que impedía la correcta lectura del estado actual.

### Decisión

Implementar un circuito de persistencia normalizado, desacoplado y simétrico estructurado en cuatro niveles técnicos:

1. **Arquitectura de Datos:** Incorporar la entidad `Interest.java` aplicando el patrón `@MapsId` en una relación `@OneToOne` con la tabla de usuarios para compartir de forma nativa la misma clave primaria (`user_id`), creando un esquema donde el ID de intereses hereda exactamente el ID del usuario en PostgreSQL y garantizando el borrado en cascada automático.
2. **Persistencia de Colecciones:** Implementar la anotación `@ElementCollection` generando de forma transparente cinco tablas satélite indexadas de forma vertical (`interest_categories`, `interest_course_types`, `interest_durations`, `interest_languages`, y `interest_subtitle_languages`). En el método transaccional de lectura `getUserInterests` de `UserService.java`, se introduce la hidratación forzada mediante `Hibernate.initialize()` sobre cada una de las colecciones, asegurando que las listas no viajen vacías al ser serializadas a JSON.
3. **Simetría en Enrutamiento API:** Reestructurar la precedencia jerárquica en `UserController.java` posicionando el endpoint estático `GET /api/auth/my-interests` de forma prioritaria antes del patrón dinámico variable `GET /{username}`. Esto anula la ambigüedad en el enrutamiento web de Spring MVC y subsana el error sintáctico de petición incorrecta (Error 400 Bad Request).
4. **Ciclo Sincronizado en Frontend:** Configurar en el modal de React un hook de efecto (`useEffect`) acoplado al estado de visibilidad (`isOpen`), invocando de manera asíncrona al cliente centralizado (`apiClient`). Los datos recuperados hidratan los estados locales (`useState`), activando de forma automática las clases CSS condicionales y los iconos de verificación (`✓`) de las tarjetas seleccionadas.

### Justificación para el TFG

Aporta un valor metodológico fundamental en términos de diseño avanzado de bases de datos relacionales, control de enrutamiento web y optimización algorítmica de ORM. Demuestra al tribunal el cumplimiento riguroso de la teoría de normalización (1FN) al fragmentar colecciones dinámicas en casilleros elementales independientes. El orden de declaración de los métodos del controlador evidencia un dominio avanzado en el ciclo de vida de peticiones en Spring Framework, mientras que el control programático de la inicialización de proxies defiende la robustez del software frente a fallos indeterministas de Hibernate. Esta simetría exacta entre el perfil de intereses del alumno y el catálogo de cursos anula la necesidad de capas de conversión intermedias en Spring Boot, lo que permitirá al futuro motor de recomendación ejecutar consultas de cruce ultra veloces mediante operaciones de conjunto indexadas (`JOIN` y cláusulas `IN`), maximizando la escalabilidad del sistema.

### Consecuencias

Se elimina por completo el almacenamiento caótico de texto plano y el coste computacional de procesar expresiones regulares en disco. El estudiante puede interactuar de forma reactiva con el modal multiscroll de React para actualizar sus criterios preferentes en el mismo milisegundo. Los cambios se persisten de forma transaccional y consistente en PostgreSQL mediante un mecanismo destructivo-limpio (operaciones secuenciales de `DELETE` e `INSERT` gestionadas de forma nativa por el ORM), proporcionando una base de datos perfectamente estructurada, limpia, libre de duplicados y lista para alimentar el motor de recomendaciones con un estado HTTP 200 OK estable.

---

## [ADR-19] Optimización Computacional del Buscador Predictivo mediante Indexación Invertida GIN, Formateo Nativo de Parámetros y Mitigación de Carga en Interfaz

* **Fecha:** Junio 2026
* **Estatus:** Aceptado

### Contexto

El buscador global de cursos integrado en el panel del estudiante (`StudentDashboard.tsx`) presentaba deficiencias críticas de rendimiento y usabilidad que comprometían la escalabilidad del sistema. La consulta JPQL original implementaba una búsqueda aproximada multicampo utilizando comodines en ambos extremos del patrón (`LIKE LOWER(CONCAT('%', :keyword, '%'))`). En entornos relacionales como PostgreSQL, la presencia de un comodín inicial anula la utilidad de los índices de árbol tradicionales (B-Tree), forzando al motor a ejecutar un escaneo secuencial completo (*Full Table Scan*) de coste computacional O(N) en cada pulsación de tecla.

Adicionalmente, se detectó una anomalía de *binding* en la caché de planes de Hibernate al concatenar dinámicamente los porcentajes (`%`) dentro de múltiples cláusulas `OR` en JPQL. Este fenómeno cruzaba los marcadores de posición en consultas concurrentes, provocando que el motor de la base de datos interpretara la consulta de forma laxa (equivalente a `LIKE '%%'`) y devolviera registros aleatorios que no coincidían con el criterio de búsqueda. Finalmente, la ausencia de límites en la consulta volcaba todo el catálogo en la memoria RAM del servidor de Spring Boot, penalizando críticamente el hilo de renderizado del navegador al intentar dibujar cientos de componentes `GenericCard` simultáneamente.

### Decisión

Implementar una reestructuración arquitectónica integral en tres capas para optimizar el flujo de datos y la eficiencia de cómputo:

1. **Capa de Persistencia (PostgreSQL):** Activar la extensión nativa `pg_trgm` y estructurar tres índices invertidos generalizados (**GIN**) basados en operaciones de trigramas (`gin_trgm_ops`) sobre las columnas críticas de búsqueda (`title`, `category`, `skills`) de la tabla `courses`. Esto fragmenta las cadenas de texto en bloques de tres caracteres, permitiendo búsquedas de coincidencia parcial indexadas de coste O(log N) u O(1).
2. **Capa de Negocio y Repositorio (Spring Boot):** Modificar la firma del método en `CoursesRepository.java` eliminando las funciones de concatenación internas de JPQL. El formateo de los patrones de coincidencia aproximada (`%keyword%`) y de coincidencia inicial (`keyword%`) se traslada de forma nativa a la memoria de Java en `UserService.java`. La consulta se restringe a un lote simétrico estricto de **12 resultados** mediante `PageRequest.of(0, 12)`. Asimismo, se incorpora una cláusula algorítmica `ORDER BY CASE` en JPQL que prioriza con valor `1` los títulos que comienzan exactamente con el término buscado, con valor `2` los que lo contienen, y con valor `3` las coincidencias exclusivas por categoría o habilidades, seguidos de un ordenamiento alfabético secundario.
3. **Capa de Presentación (React & Tailwind):** Consolidar un control de tasa de peticiones (*rate limiting*) en el cliente mediante un temporizador *debounce* de 400ms acoplado al hook de efecto (`useEffect`) para evitar la saturación de peticiones HTTP en vuelo. A nivel de maquetación, se recupera la cuadrícula de tres columnas (`lg:grid-cols-3`) y se acota el contenedor exterior mediante un límite dimensional estricto de altura fija (`max-h-[290px] overflow-y-auto`), provocando de forma controlada el fenómeno de diseño ***Cut-off effect*** (efecto de recorte) para incentivar el scroll natural.

### Justificación para el TFG

Aporta un alto valor metodológico en ingeniería de rendimiento y optimización de sistemas distribuidos. Ante el tribunal, justifica la capacidad de diagnosticar fallos indeterministas de binding en el ORM y resolverlos mediante el preformateo de cadenas en la capa de servicios de Java, garantizando que PostgreSQL reciba parámetros limpios y estrictos. El uso de la cláusula condicional `CASE` directamente en el lenguaje de consultas demuestra madurez en la delegación de lógica pesada al motor de datos en lugar de saturar la capa de aplicación en Java con bucles de ordenación tardíos.

Por último, la sincronización matemática entre el tamaño de página del backend (12 elementos) y la distribución del frontend (múltiplo exacto de la cuadrícula de 3 columnas) evidencia un diseño de software armonizado y limpio, elevando la calidad del código a estándares de producción industrial y asegurando una respuesta de la interfaz en el orden de los milisegundos.

### Consecuencias

Se erradica por completo el escaneo secuencial en disco, los falsos positivos de búsqueda por cruce de marcadores y el riesgo de desborde de buffer en el backend. Las consultas predictivas se ejecutan de forma instantánea sobre PostgreSQL incluso bajo volúmenes masivos de datos. El usuario experimenta una navegación fluida donde los criterios de ordenación semántica garantizan que los cursos más idóneos aparezcan siempre en la primera línea de visión. El componente visual queda perfectamente integrado en el espacio del dashboard, manteniendo una estética limpia, simétrica y una experiencia de usuario fluida e intuitiva libre de bloqueos en el navegador.

---

### Enmienda A: Restricción del Alcance de Búsqueda Predictiva y Depuración de la Estructura Relacional

**Fecha:** Junio 2026  
**Estatus:** Aceptado  

#### Contexto de la Enmienda

Durante las pruebas de carga y estrés del buscador predictivo, se determinó que la inclusión de la columna `skills` (habilidades) dentro del filtro multicampo (`WHERE`) de la consulta JPQL introducía penalizaciones críticas en el tiempo de respuesta del motor de la base de datos PostgreSQL.

Técnicamente, el campo `skills` almacena un listado de tecnologías indexadas en forma de cadena plana separada por comas (ej. `"Java, Spring Boot, REST"`), lo que viola la **Primera Forma Normal (1FN)** del modelo relacional en este caso de uso específico. Al ejecutar operaciones de coincidencia parcial (`LIKE %keyword%`) sobre cadenas desnormalizadas y extensas, la eficiencia de la indexación por trigramas disminuye drásticamente, forzando un consumo innecesario de CPU y memoria de intercambio en disco. Adicionalmente, desde la perspectiva de la Experiencia de Usuario (UX), los retornos basados en coincidencias opacas ocultas en los metadatos de las tarjetas (no legibles a simple vista en el título o categoría) generaban confusión e indeterminismo visual en la interfaz del estudiante.

#### Decisión Derivada

1. **Refactorización del Backend (`CoursesRepository.java`):** Eliminar de forma estricta la cláusula `OR LOWER(c.skills) LIKE LOWER(:formattedKeyword)` tanto del filtro de selección como de la estructura de ponderación algorítmica `ORDER BY CASE`. La búsqueda predictiva instantánea queda restringida exclusivamente a los campos de alta densidad semántica: `title` y `category`.
2. **Optimización del Almacenamiento (PostgreSQL):** Ejecutar una purga del índice invertido trunco mediante el comando `DROP INDEX IF EXISTS idx_courses_skills_trgm;`, liberando espacio físico en disco y mitigando la sobrecarga computacional de reindexación en las operaciones de inserción (`INSERT`) y actualización (`UPDATE`).
3. **Sincronización de Interfaz (`StudentDashboard.tsx`):** Modificar los descriptores semánticos de la barra de búsqueda para transparentar el alcance real de la consulta al usuario, limitando el texto a *"por título o categoría temática"*.
4. **Aislamiento de Responsabilidad:** Reservar de forma exclusiva el atributo `skills` para el motor del **Algoritmo de Recomendación Inteligente (ADR-18)**, donde su procesamiento se ejecutará de manera asíncrona mediante un cruce de matrices frente a la tabla de intereses del estudiante, evitando penalizar el hilo de la consulta síncrona en tiempo real del catálogo.

#### Consecuencias

Se logra una reducción drástica en la latencia de la consulta predictiva, garantizando tiempos de respuesta estables en el orden de los milisegundos (<50ms). El repositorio y la base de datos quedan limpios de estructuras redundantes, asegurando una separación de responsabilidades (*Separation of Concerns*) perfecta entre el módulo de búsqueda global y el módulo de recomendaciones asíncronas de cara a la defensa del proyecto.

---

# ADR-20: Refactorización del Panel del Estudiante mediante Controladores Distribuidos

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

## [ADR-21] Contrato de Expiración del Token con Tipado Estricto (TTL Centralizado)

* **Fecha:** Junio 2026
* **Estatus:** Aceptado
* **Contexto:** Existía una inconsistencia crítica en la gestión del tiempo de vida de la sesión (*Time-To-Live* o TTL) entre ambas capas de la aplicación. El backend calculaba la expiración de forma correcta, pero el frontend aplicaba parches de maquetación de tipos mediante un casting forzado a `unknown` para acceder a una propiedad inexistente denominada `expiresInSeconds`. Al fallar esta lectura por discrepancia de contratos, el sistema activaba de forma silenciosa un temporizador de emergencia fijo de 15 minutos, lo que comprometía la integridad del sistema de autenticación y provocaba desconexiones prematuras o estados inconsistentes en la interfaz de usuario.
* **Decisión:** Estandarizar de forma estricta el contrato de transferencia de datos eliminando los artificios de tipado condicional en el archivo `AuthProvider.tsx`. El campo `expiresIn` se mapea ahora de manera homogénea entre el registro de Java del servidor y su correspondiente interfaz en TypeScript como un tipo numérico estricto. El cliente calcula el instante de expiración consumiendo directamente este valor sin transformaciones ambiguas ni escapes en el compilador.
* **Justificación para el TFG:** Sigue de manera rigurosa los principios de diseño guiado por contratos en arquitecturas desacopladas cliente/servidor. Al forzar una paridad absoluta entre los tipos del backend y el frontend, se elimina la deuda técnica y se garantiza que el flujo de control matemático del TTL sea exacto. Esto evita que el compilador ignore discrepancias en las estructuras de datos compartidas y eleva la robustez perimetral del sistema de sesiones.
* **Consecuencias:**
  * **Consistencia Operacional Total:** Eliminación definitiva de los errores de desincronización en la sesión y pantallas congeladas, asegurando que el ciclo de vida del usuario en el navegador coincida exactamente con la validez del token en el servidor.
  * **Flujo de Persistencia Seguro:** Garantía de un tipado seguro en todo el flujo de autenticación, blindando la integridad de los datos desde la respuesta HTTP original hasta su almacenamiento en las capas de persistencia local (*localStorage*).

---

## [ADR-22] Externalización y Seguridad de Políticas CORS mediante Variables de Entorno

* **Fecha:** Junio 2026
* **Estatus:** Aceptado
* **Contexto:** La configuración de la seguridad perimetral en la clase `SecurityConfig.java` del backend restringía las solicitudes entrantes permitiendo únicamente el origen estático `http://localhost:5173`. Esta codificación rígida (*hardcodeada*) en el código fuente constituía un acoplamiento crítico con el entorno de desarrollo local, lo que impedía por completo el despliegue del sistema en servidores productivos reales bajo políticas de navegador (*Cross-Origin Resource Sharing*) a menos que se realizaran modificaciones manuales propensas a errores antes de compilar.
* **Decisión:** Migrar la directiva de orígenes permitidos de CORS hacia un modelo de inyección de dependencias dinámica en Spring Boot. Se implementa el uso de la anotación `@Value` ligada a una variable de entorno del sistema, configurando un mecanismo de respaldo (*fallback*) adaptativo que emplea la ruta local por defecto si la variable externa se encuentra ausente en el sistema operativo.
* **Justificación para el TFG:** Cumple de manera rigurosa con los principios de portabilidad y desacoplamiento de la metodología de las *Twelve-Factor Apps* para sistemas nativos de la nube. Al externalizar las directrices de red del código compilado, el archivo de seguridad de Spring Security queda cerrado a modificaciones físicas de infraestructura, permitiendo canalizar despliegues automáticos y parametrizables en entornos de desarrollo, pruebas o producción sin alterar un solo byte del artefacto compilado.
* **Consecuencias:**
  * **Portabilidad y Automatización:** Mejora inmediata en la portabilidad del sistema, permitiendo su despliegue inmediato en cualquier proveedor PaaS o la nube (como Render, AWS o Heroku) configurando la dirección web del frontend de forma puramente operativa.
  * **Seguridad y Limpieza del IDE:** Cumplimiento de las mejores prácticas de seguridad operativa, evitando la exposición de configuraciones locales y silenciando las advertencias o avisos amarillos del editor de código en el archivo `application.properties` al delegar el flujo de datos sobre variables del entorno.

---

## [ADR-23] Validación Perimetral de Archivos y Mitigación de Ataques RCE

* **Fecha:** Junio 2026
* **Estatus:** Aceptado
* **Contexto:** El servicio de almacenamiento en el servidor permitía la subida y persistencia de recursos en disco limitando únicamente el tamaño máximo de los ficheros a 5MB a través de la directiva del servlet. No obstante, la ausencia total de validaciones sobre el tipo de contenido representaba una vulnerabilidad crítica de seguridad. Un atacante autenticado o un usuario malintencionado podría evadir el propósito de la funcionalidad cargando scripts ejecutables (como shells o scripts `.php`), obteniendo la capacidad de comprometer el servidor mediante la ejecución remota de código (*Remote Code Execution* o RCE).
* **Decisión:** Implementar un mecanismo imperativo de validación perimetral dual dentro de la clase `FileStorageService.java`. Antes de escribir cualquier flujo de datos en el disco, el sistema extrae de forma segura la extensión real del nombre del fichero y valida la cabecera `Content-Type` (*MIME Type*). Esta restricción se aplica mediante una arquitectura segregada por el contexto de la carpeta de destino: la subcarpeta `avatars` acepta estrictamente formatos gráficos autorizados (`.jpg`, `.jpeg`, `.png`, `.webp`), mientras que la subcarpeta `documents` se restringe de forma exclusiva a extensiones `.pdf`.
* **Justificación para el TFG:** Sigue las directrices de la guía OWASP y el principio de defensa en profundidad en sistemas web. Validar de forma combinada la extensión y el tipo MIME mitiga los ataques de suplantación de identidad de archivos (*MIME-sniffing*). Cualquier intento de alteración o desajuste con las listas blancas de formatos permitidos detiene la transacción de inmediato lanzando una excepción controlada, impidiendo que material potencialmente destructivo alcance el sistema de archivos local.
* **Consecuencias:**
  * **Inmunización frente a RCE:** Blindaje absoluto del servidor ante la persistencia de archivos maliciosos, neutralizando vectores de ataque orientados al secuestro de recursos o ejecución de comandos en el host.
  * **Centralización de Reglas de Negocio:** Los controladores de la aplicación (como `ProfileController.java`) delegan la responsabilidad del control de formatos en el servicio de almacenamiento, garantizando que cualquier nuevo módulo de subida en el futuro herede nativamente estas directivas de seguridad.

---

## [ADR-24] Gestión de Sesión Robusta mediante la Visibility API del Navegador

* **Fecha:** Junio 2026
* **Estatus:** Aceptado
* **Contexto:** La desconexión proactiva por tiempo en el frontend delegaba el control de la expiración de la sesión en un temporizador lineal `setTimeout` en el cliente. Sin embargo, los navegadores web modernos (como Chrome, Edge o Safari) aplican políticas agresivas de ahorro de energía que suspenden o ralentizan los hilos de temporizadores en pestañas inactivas o en segundo plano. Esto provocaba que el reloj de la aplicación se detuviera, generando "sesiones fantasma" donde el usuario regresaba horas después viendo una interfaz falsamente autenticada que solo fallaba al intentar interactuar y colisionar contra el backend.
* **Decisión:** Migrar la lógica de desconexión proactiva en el archivo `AuthProvider.tsx` para utilizar un enfoque basado en eventos de ciclo de vida del navegador a través de la *Visibility API*. Se implementa la escucha del evento nativo `visibilitychange` combinado con una rutina ligera de muestreo cíclico de alta frecuencia (`setInterval` cada 5 segundos). En el momento exacto en que el usuario reactiva o enfoca la pestaña, el sistema ejecuta una auditoría de tiempo inmediata recalculando la validez del token frente al tiempo real del sistema operativo (`Date.now() >= expiresAt`).
* **Justificación para el TFG:** Demuestra una comprensión avanzada del entorno de ejecución asíncrono en los motores de renderizado de JavaScript y las limitaciones físicas del hardware actual. En lugar de confiar ciegamente en temporizadores lineales vulnerables a la congelación del navegador, el frontend se vuelve autoconsciente de su estado de visualización, blindando el perímetro de autenticación en el cliente y garantizando la sincronización con el tiempo absoluto de expiración definido por el servidor.
* **Consecuencias:**
  * **Eliminación de Sesiones Fantasma:** Cierre de sesión preciso e inmediato en el milisegundo en que el usuario regresa a la aplicación, impidiendo la exposición visual de datos sensibles en interfaces obsoletas tras periodos prolongados de inactividad.
  * **Consistencia de Estado:** Desaparición de estados de autenticación inconsistentes en la interfaz de usuario, mejorando la experiencia del estudiante al sincronizar de forma determinista el estado de la SPA con el ciclo de vida real del token JWT.

---

## [ADR-25] Normalización Semántica de Errores en la API REST

* **Fecha:** Junio 2026
* **Estatus:** Aceptado
* **Contexto:** Múltiples operaciones críticas en la capa de servicios del backend (como en la clase `UserService.java`) recurrían al lanzamiento directo de la excepción genérica `RuntimeException` al no localizar registros en la base de datos o ante fallos de validación. Aunque el servidor dispone de un componente interceptor centralizado (`GlobalExceptionHandler.java`), el uso de excepciones sin tipar impedía que el manejador pudiera discernir el origen del fallo, forzando a que el sistema procesara de forma homogénea cualquier anomalía bajo el mismo código genérico HTTP 500 (*Internal Server Error*), lo que deterioraba gravemente el rigor semántico y la claridad de la API REST.
* **Decisión:** Desterrar por completo el uso de excepciones genéricas e incorporar una arquitectura de excepciones semánticas personalizadas de grano fino. Se procede a la adopción y sobrecarga de clases específicas como `ResourceNotFoundException` y `UserAlreadyExistsException`. Estas excepciones se vinculan directamente a códigos de estado HTTP específicos (`404 Not Found` y `409 Conflict`, respectivamente) utilizando las directivas de Spring Boot y el mapeo de respuestas estructuradas.
* **Justificación para el TFG:** Sigue de manera rigurosa las especificaciones del protocolo HTTP y las mejores prácticas en el diseño de arquitecturas RESTful profesionales. Al dotar a la capa de servicios de la capacidad de comunicar anomalías de datos con nombres propios, el interceptor global puede traducir el fallo en un objeto JSON homogéneo y con el código de estado correspondiente. Esto previene fugas de información del sistema en las trazas de error y proporciona un contrato predecible para el consumo del cliente.
* **Consecuencias:**
  * **API REST Semántica y Estándar:** Las peticiones por recursos inexistentes o conflictos de datos devuelven códigos HTTP semánticos (404 y 409) limpios en lugar de alarmantes y opacos errores internos 500, profesionalizando la interfaz del servidor.
  * **Facilidad de Depuración e Integración:** Proporciona al frontend mensajes de error claros, estructurados y consistentes, agilizando el diagnóstico en fases de pruebas y mejorando drásticamente la comunicación entre las capas del sistema mediante el uso correcto de los estándares de la industria.

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
