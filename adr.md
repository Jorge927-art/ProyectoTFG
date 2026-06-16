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

## [ADR-09] Mecanismo de Hidratación de Sesión mediante Validación Síncrona del Token

* **Fecha:** Junio 2026
* **Estatus:** Aceptado
* **Contexto:** Al recargar la interfaz web de la SPA, el estado volátil de React se destruye. Se requería un mecanismo automático que determinase si el token almacenado localmente seguía siendo válido en el servidor antes de renderizar las pantallas privadas de la aplicación.
* **Decisión:** Implementar un efecto secundario de ciclo de vida (`useEffect`) en la inicialización del `AuthProvider` para consumir el endpoint `/api/auth/me` de forma transparente, controlando el flujo mediante un estado bandera `isLoading`.
* **Justificación para el TFG:** Demuestra el uso correcto del patrón de sincronización de estado cliente-servidor (*State Hydration*). Utilizar una variable `isLoading` evita la pérdida de sesión en recargas y unifica la verificación síncrona en el cliente con las respuestas de la API del servidor.
* **Consecuencias:** Consolidación total de la seguridad de la SPA. Las recargas de página recuperan la identidad del usuario de forma inmediata y el estado se sincroniza de forma robusta ante tokens expirados.

---

## [ADR-10] Arquitectura de Layouts Modulares por Composición Especializada

* **Fecha:** Junio 2026
* **Estatus:** Aceptado
* **Contexto:** La plataforma web integra tres perfiles de usuario diferenciados (Administrador, Profesor y Estudiante). Cada rol demanda disposiciones espaciales, densidades de información y geometrías visuales asimétricas (por ejemplo, búsquedas en contenedores contenidos frente a métricas y cursos en grids multi-columna). Se requiere una solución arquitectónica en el frontend que centralice los elementos globales invariables (la barra de navegación, la inyección del contexto de sesión y los estilos base de la aplicación) sin condicionar la flexibilidad de diseño ni acoplar los paneles entre sí.
* **Decisión:** Implementar un patrón de diseño estructural basado en un Layout Base abstracto (`DashboardLayout.tsx`) acoplado de forma autónoma al hook de autenticación global (`useAuth`), y derivar de él tres Layouts Especializados mediante composición de software (`AdminLayout.tsx`, `ProfessorLayout.tsx` y `StudentLayout.tsx`). Cada página de rol se envuelve exclusivamente en su layout correspondiente, delegando la maquetación geométrica general.
* **Justificación para el TFG:** Demuestra la aplicación rigurosa de los principios SOLID de la ingeniería del software. Al utilizar composición en lugar de herencia rígida o layouts monolíticos condicionales, se cumple con el *Single Responsibility Principle (SRP)* y el *Open/Closed Principle (OCP)*. El Layout Base queda cerrado a modificaciones estructurales pero abierto a la extensión táctica de cada rol. Si las necesidades del negocio exigen incorporar barras laterales (Sidebars) para el administrador o menús flotantes de IA para el estudiante, el radio de impacto y fallo queda estrictamente aislado, garantizando la inmunidad de las demás vistas del sistema.
* **Consecuencias:**
  * **Principio DRY Global:** Las directrices estéticas de Tailwind CSS (`min-h-screen`, `bg-slate-50`, `font-sans`) y la orquestación de la barra `<NavbarUser />` se gestionan en un único punto del proyecto, simplificando el mantenimiento general.
  * **Garantía de Accesibilidad (a11y):** Se introducen enlaces explícitos y semánticos mediante el atributo `htmlFor` e identificadores únicos (`id`) en los componentes interactivos de los layouts (como selectores de rol), cumpliendo de forma nativa con los estándares WCAG y garantizando la compatibilidad con lectores de pantalla.
  * **Carga de Trabajo Desacoplada:** Las páginas del cliente (`AdminDashboard`, `ProfessorDashboard`, `StudentDashboard`) quedan completamente liberadas de ruido visual e infraestructura estructural, focalizando su código de forma pura en la lógica de estado de React, efectos secundarios y peticiones Axios hacia Spring Boot.

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
