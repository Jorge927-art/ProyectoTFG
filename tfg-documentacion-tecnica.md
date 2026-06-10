# Documentación Técnica - Memoria del TFG

Este documento recopila la estructura técnica, decisiones de arquitectura y flujos del sistema para su posterior volcado en la memoria oficial del Trabajo de Fin de Grado.

---

## INDICE DE CONTENIDOS TÉCNICOS

### 1. Arquitectura General y Stack Tecnológico

* [ ] 1.1. Justificación del Stack (React + Spring Boot)
* [ ] 1.2. Estructura del Espacio de Trabajo (Monorepo)
* [ ] 1.3. Modelo de Comunicación Frontend-Backend

### 2. Diseño del Backend (Servidor)

* [ ] 2.1. Arquitectura en Capas (Controladores, Servicios, Repositorios)
* [ ] 2.2. Modelo de Datos y Entidades Principales
* [ ] 2.3. Catálogo de Endpoints de la API REST

### 3. Diseño del Frontend (Cliente)

* [ ] 3.1. Arquitectura de Componentes y Vistas
* [ ] 3.2. Gestión del Estado Global y Contextos
* [ ] 3.3. Consumo de Servicios y Rutas Protegidas

### 4. Seguridad: Migración de Sesiones a JWT

* [ ] 4.1. Análisis del Sistema Original Basado en Sesiones
* [ ] 4.2. Justificación Técnica del Cambio a JWT (Stateless)
* [ ] 4.3. Plan de Convivencia y Fases de Transición

---

## 1. Arquitectura General y Stack Tecnológico

### 1.1. Justificación del Stack (React + Spring Boot)

La solución adopta una arquitectura cliente-servidor desacoplada, en la que el frontend y el backend se desarrollan como aplicaciones independientes, pero coordinadas mediante una API REST. Esta decisión se fundamenta en criterios de mantenibilidad, escalabilidad y separación de responsabilidades. El cliente se ocupa de la interacción con el usuario, la navegación y la presentación de la información, mientras que el servidor centraliza la lógica de negocio, la persistencia y las reglas de seguridad.

En el plano del cliente, se utiliza React con TypeScript y Vite. React facilita la construcción de interfaces modulares basadas en componentes reutilizables, lo que favorece la evolución incremental del sistema. TypeScript aporta tipado estático, reduce errores en tiempo de desarrollo y mejora la trazabilidad de contratos internos. Vite, por su parte, optimiza el ciclo de desarrollo gracias a una compilación ágil y una retroalimentación rápida para el equipo.

En el plano del servidor, se emplea Spring Boot con Java 21, junto con los módulos de seguridad, persistencia y validación del ecosistema Spring. Esta selección responde a la necesidad de disponer de una plataforma robusta para exponer servicios REST, gestionar autenticación y autorización, y operar sobre una base de datos relacional con un modelo de capas bien definido. Además, la integración con JPA y PostgreSQL permite estructurar la persistencia con un enfoque consistente y ampliamente validado en entornos académicos y profesionales.

En conjunto, la combinación React y Spring Boot ofrece una base tecnológica coherente para un proyecto de TFG orientado a sistemas web completos, al equilibrar productividad en el desarrollo, claridad arquitectónica y capacidad de crecimiento funcional.

### 1.2. Estructura del Espacio de Trabajo (Monorepo)

El proyecto se organiza mediante un enfoque de monorepo, donde frontend y backend conviven en un mismo espacio de trabajo bajo directorios diferenciados. Esta organización no implica acoplamiento técnico entre ambas aplicaciones, sino una estrategia de gobernanza del código que simplifica la coordinación del desarrollo.

Desde el punto de vista metodológico, el monorepo aporta varias ventajas. En primer lugar, facilita la trazabilidad de cambios funcionales que afectan simultáneamente a la interfaz y al servidor, algo frecuente en fases tempranas de construcción del producto. En segundo lugar, reduce la fricción operativa al centralizar documentación técnica, decisiones de arquitectura y procedimientos de ejecución y prueba. En tercer lugar, permite mantener una visión integral del sistema, útil para la memoria de TFG y para la evaluación de impacto de cada modificación.

La estructura observada distingue claramente responsabilidades: el backend concentra la lógica de dominio, el acceso a datos y la seguridad; el frontend reúne componentes de interfaz, rutas, contexto de autenticación y pruebas de presentación. Esta separación, aunque alojada en un único repositorio, preserva límites de contexto y favorece un mantenimiento más ordenado.

Por tanto, el monorepo se adopta como decisión de organización del trabajo y no como una unificación artificial de tecnologías. Se mantiene la autonomía de cada capa, al tiempo que se mejora la coordinación global del ciclo de vida del software.

### 1.3. Modelo de Comunicación Frontend-Backend

La comunicación entre cliente y servidor se realiza mediante servicios HTTP de estilo REST, con intercambio de datos en formato JSON. El frontend consume endpoints del backend para operaciones de autenticación y para el acceso a recursos protegidos según rol de usuario. Este modelo establece un contrato explícito entre capas y permite evolucionar la interfaz sin alterar la lógica de dominio, siempre que se respete el contrato de la API.

En el estado actual, el backend implementa autenticación basada en sesión, mientras que el frontend mantiene un estado de usuario para controlar navegación y vistas protegidas. Este esquema permite una operación funcional del sistema y define un punto de partida estable para la transición planificada hacia JWT. Desde una perspectiva arquitectónica, resulta relevante destacar que el proyecto ya separa la gestión de identidad en el servidor y el control de acceso de interfaz en el cliente, lo cual simplifica la migración progresiva.

Asimismo, el modelo incluye políticas de autorización por roles para delimitar áreas de acceso administrativo, docente y estudiantil. En consecuencia, la comunicación no solo transporta datos funcionales, sino también el contexto de seguridad necesario para decidir qué recursos pueden ser consumidos por cada perfil.

En términos de diseño, esta comunicación desacoplada favorece la escalabilidad horizontal del frontend y la evolución independiente del backend, siempre que se mantenga consistencia en las respuestas, códigos de estado y políticas de seguridad expuestas por la API.

---

## 2. Diseño del Backend (Servidor)

### 2.1. Arquitectura en Capas (Controladores, Servicios, Repositorios)

El backend sigue el patrón de arquitectura en capas característico del ecosistema Spring Boot, con una separación funcional entre exposición de API, lógica de negocio y persistencia. Esta organización permite reducir el acoplamiento entre responsabilidades y facilita tanto la mantenibilidad como la evolución del sistema.

La capa de controladores actúa como puerta de entrada HTTP a la aplicación. En ella se reciben las peticiones del cliente, se validan los parámetros de entrada a nivel de contrato web y se construyen las respuestas correspondientes mediante códigos de estado adecuados. En el estado actual, esta capa concentra principalmente operaciones de autenticación y gestión de usuarios, así como un endpoint de verificación de conectividad.

La capa de servicios encapsula la lógica de negocio y las reglas de dominio. En esta capa se ubican procesos como el registro de usuarios, la aplicación de reglas de seguridad sobre credenciales y la orquestación del proceso de inicio de sesión basado en sesión de servidor. Desde una perspectiva de diseño, esta decisión evita que los controladores asuman lógica compleja y mantiene un flujo de responsabilidades más claro.

La capa de repositorios se fundamenta en Spring Data JPA y abstrae el acceso a la base de datos relacional. Mediante interfaces repositorio, el sistema delega operaciones CRUD y consultas específicas sin incorporar lógica SQL en niveles superiores. Este enfoque mejora la trazabilidad del acceso a datos y favorece un modelo de persistencia coherente con el dominio.

Además de estas tres capas principales, el backend incorpora componentes transversales de seguridad y gestión de errores. La configuración de seguridad define políticas de autorización por rutas y roles, mientras que el manejo global de excepciones centraliza la transformación de errores internos en respuestas HTTP consistentes. En conjunto, la arquitectura presenta una estructura clásica de servidor empresarial, adecuada para una API REST en evolución.

### 2.2. Modelo de Datos y Entidades Principales

El modelo de datos identificado en el código se articula, en su estado actual, en torno a dos entidades principales: usuarios y cursos. Esta base refleja una plataforma de formación en la que la identidad del usuario y el catálogo formativo constituyen los ejes nucleares del dominio.

La entidad de usuarios representa la identidad autenticable del sistema e incluye atributos de identificación, credenciales y clasificación por rol. Los roles definidos contemplan, al menos, perfiles de administración, profesorado y estudiantado, lo que habilita un control de acceso diferenciado en la capa de seguridad. Desde el punto de vista funcional, esta entidad soporta tanto el proceso de alta de cuentas como la posterior autenticación y autorización.

La entidad de cursos modela el catálogo académico disponible. Su estructura incorpora información descriptiva y metadatos relevantes para clasificación y consulta, tales como categoría, idioma, duración o valoración. Aunque en el estado actual no se observa una explotación completa de estos datos a través de controladores específicos, su presencia indica una orientación del backend hacia operaciones de gestión y recomendación de contenido formativo.

Como complemento al modelo persistente, el backend emplea un objeto de transferencia para las respuestas de autenticación. Esta decisión permite desacoplar la entidad interna de usuario respecto al contrato que se expone al cliente, reduciendo el riesgo de filtrado de información sensible y mejorando la definición semántica de la API.

### 2.3. Catálogo de Endpoints de la API REST

El catálogo de endpoints observable se concentra en el ámbito de autenticación y usuarios, con una ruta adicional de comprobación técnica. A nivel conceptual, el sistema distingue entre endpoints públicos de acceso inicial y endpoints protegidos que requieren autenticación previa.

| Método | Ruta | Finalidad funcional | Nivel de acceso |
|---|---|---|---|
| GET | /api/prueba | Verificar conectividad entre cliente y servidor | Protegido por autenticación según configuración global |
| POST | /api/auth/register | Registrar nuevas cuentas de usuario | Público |
| POST | /api/auth/login | Autenticar credenciales y abrir sesión de servidor | Público |
| GET | /api/auth/me | Recuperar la identidad autenticada en la sesión activa | Requiere autenticación |
| GET | /api/auth/{username} | Consultar perfil de usuario por nombre | Requiere autenticación |
| GET | /api/auth | Listar usuarios del sistema | Requiere autenticación; orientado a administración |

Adicionalmente, la configuración de seguridad define espacios de rutas protegidas por rol para administración, profesorado y estudiantado. Dichos espacios establecen una política de autorización explícita y preparan la evolución del backend hacia un catálogo funcional más amplio por perfiles, aunque no todos esos endpoints se encuentran materializados todavía en controladores de dominio específicos.

En términos globales, la API presenta una base operativa centrada en autenticación y control de acceso, con capacidad de crecimiento hacia módulos funcionales de gestión de cursos y operaciones por rol. Esta situación resulta coherente con una fase de desarrollo en la que primero se consolida la infraestructura de seguridad y contratos fundamentales antes de ampliar el repertorio de servicios de negocio.

---

## 3. Diseño del Frontend (Cliente)

### 3.1. Arquitectura de Componentes y Vistas

El frontend se estructura mediante una arquitectura basada en componentes reutilizables, una estrategia especialmente adecuada para aplicaciones de tipo SPA. Esta aproximación permite descomponer la interfaz en piezas funcionales pequeñas y combinables, facilitando la legibilidad del código, la reutilización y la evolución incremental de la experiencia de usuario.

En el nivel superior, la aplicación se organiza alrededor de una composición mínima compuesta por `main`, `App` y el sistema de rutas. La función de arranque incorpora el proveedor de autenticación y el enrutador de la aplicación, de manera que toda la interfaz queda envuelta por los servicios transversales necesarios para su funcionamiento. A partir de ahí, la vista principal delega el control de pantallas en el componente de rutas, evitando mezclar lógica de navegación con la lógica visual.

Las vistas públicas se concentran en la página de aterrizaje, la cual agrupa un conjunto de componentes de presentación con un propósito informativo y promocional. En este bloque destacan el encabezado principal, la sección de funcionalidades y la sección de testimonios. Dichos elementos se encuentran construidos mediante componentes reutilizables que reciben contenido parametrizado, lo que reduce duplicidad y favorece una identidad visual homogénea.

En paralelo, el frontend dispone de vistas privadas asociadas a los perfiles de usuario. Los paneles de estudiante, profesorado y administración representan la parte reservada de la aplicación, y se integran con la barra de navegación y con las reglas de acceso por rol. En su estado actual, estas vistas tienen una naturaleza principalmente estructural, puesto que constituyen la base sobre la que se desarrollarán posteriormente funcionalidades de dominio más específicas.

La arquitectura también incorpora componentes modales orientados a la interacción. El modal de autenticación permite el acceso y registro de usuarios, mientras que el modal informativo de cursos apoya el descubrimiento del catálogo formativo. Este enfoque evidencia una separación clara entre vistas de contenido, componentes de navegación y componentes de interacción, algo que resulta coherente con un frontend mantenible y escalable.

### 3.2. Gestión del Estado Global y Contextos

La gestión del estado global se articula en torno al dominio de autenticación mediante un contexto específico. Esta decisión evita una transmisión excesiva de propiedades entre componentes y convierte la sesión del usuario en una fuente de verdad compartida por toda la SPA.

El proveedor de autenticación se sitúa en la raíz del árbol de componentes, de modo que cualquier vista puede consultar o modificar el estado de sesión sin depender de estructuras intermedias. Su responsabilidad consiste en mantener el usuario actual, exponer indicadores de autenticación y ofrecer las operaciones de inicio y cierre de sesión. Esta capa actúa como un mecanismo central de coordinación del estado relativo a identidad.

El contexto asociado define de forma explícita el contrato que el resto de la aplicación consume. A través de él se consulta si existe un usuario autenticado, se recupera su información básica y se ejecutan acciones de login o logout. De esta forma, la autenticación no queda dispersa entre múltiples componentes, sino encapsulada como una preocupación transversal del sistema.

Para reforzar la persistencia de la sesión, el frontend utiliza almacenamiento local del navegador. Este recurso permite restaurar el usuario tras una recarga de página y ofrece continuidad de uso sin depender exclusivamente del estado volátil de memoria. No obstante, dicho mecanismo debe interpretarse como una solución temporal y funcional dentro del contexto actual de autenticación por sesión, especialmente relevante de cara a la futura transición hacia JWT.

Asimismo, la aplicación define un tipo de usuario autenticado que actúa como contrato interno entre el backend y la interfaz. Este tipo recoge los campos relevantes para la experiencia de usuario, como nombre, rol o datos de perfil, y evita que el frontend dependa directamente de la estructura completa de la entidad persistente del servidor. En términos conceptuales, esta capa de tipado contribuye a desacoplar ambos extremos de la arquitectura.

### 3.3. Consumo de Servicios y Rutas Protegidas

El consumo de servicios en el frontend se concentra, en el estado actual, en los procesos de autenticación y registro. El modal de autenticación realiza peticiones HTTP al backend y toma como base la URL configurada por entorno, lo cual permite adaptar la aplicación a distintos contextos de ejecución sin modificar la lógica de interfaz. Este patrón evidencia una integración directa entre el cliente y la API, apoyada en respuestas estructuradas y gestión básica de errores de red.

La navegación se organiza mediante un sistema de rutas declarativas. Existen rutas públicas destinadas a la página principal y al mensaje de acceso denegado, así como rutas privadas asociadas a los paneles de estudiante, profesorado y administración. El enrutado se configura de forma centralizada, permitiendo que la estructura de navegación sea transparente y fácilmente extensible.

Las rutas protegidas se apoyan en un guardián genérico que verifica dos condiciones esenciales: la existencia de una sesión válida y, cuando procede, la correspondencia del rol del usuario con los permisos requeridos. Este componente actúa como capa de control de acceso en el cliente y evita que se rendericen vistas no autorizadas. En caso de incumplimiento, redirige al usuario a la pantalla de inicio o a la página de acceso denegado, según el tipo de restricción detectada.

Sobre este guardián base se construyen guardas específicas para los perfiles de estudiante, profesorado y administración. Dichas variantes no duplican la lógica de validación, sino que únicamente declaran la política de roles permitidos. Esta decisión reduce la complejidad, mejora la claridad del diseño y facilita el mantenimiento del sistema de autorización en el frontend.

En términos funcionales, el modelo de consumo de servicios y rutas protegidas se encuentra alineado con una fase de desarrollo donde la autenticación y el control de acceso constituyen la prioridad principal. A partir de esta base, la evolución natural del cliente consistirá en incorporar consumo de datos de negocio, interacciones más ricas y vistas privadas con contenido dinámico ligado al backend.
