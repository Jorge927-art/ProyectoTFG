# Resumen Técnico — Plataforma de Cursos Online (TFG)

> Generado a partir del snapshot completo del repositorio (repomix). Sirve como contexto de referencia rápida para pedir nuevas clases, endpoints o pantallas manteniendo consistencia con el código existente.

## 1. Stack y estructura general

- **Monorepo** con dos carpetas independientes: `backend/` (Spring Boot) y `frontend/` (React + Vite), coordinadas pero desacopladas (ver ADR-01, ADR-02).
- **Backend**: Java 21, Spring Boot **4.0.6**, Spring Security, Spring Data JPA, Bean Validation, PostgreSQL, Lombok, Maven.
- **Frontend**: React 19 + TypeScript, Vite 7, React Router 7, Axios, Tailwind CSS 4 (`@tailwindcss/vite`), lucide-react (iconos), Vitest + Testing Library para tests.
- **CI**: GitHub Actions (`.github/workflows/ci.yml`) — pipeline único para ambas capas.
- **Documentación de arquitectura**: `adr.md` (36 ADRs numerados) y `tfg-documentacion-tecnica.md` (memoria técnica narrativa, algo desactualizada respecto al código: describe auth por sesión, pero el sistema ya usa JWT en producción).

## 2. Backend — arquitectura en capas

```
config/            → SecurityConfig, WebConfig, CustomUserDetailsService, config/jwt/JwtProperties
controller/        → @RestController, un controlador por dominio funcional
dto/               → Objetos de transferencia (requests/responses), nunca se exponen entidades JPA "en crudo" hacia fuera si contienen datos sensibles
entities/          → @Entity JPA (Lombok @Data + @NoArgsConstructor + @AllArgsConstructor)
exception/         → Excepciones de dominio + GlobalExceptionHandler (@RestControllerAdvice)
repository/        → Spring Data JPA repositories
security/jwt/      → JwtAuthenticationFilter, JwtService
services/          → Lógica de negocio (FileStorageService, RecommendationService, UserService)
```

### Convenciones observadas

- **Controladores**: `@RestController` + `@RequestMapping("/api/...")` + `@RequiredArgsConstructor` (inyección por constructor vía Lombok).
  - Patrón habitual en cada endpoint: comprobar `Principal principal` manualmente (si `null` → 401 con `Map.of("error", ...)`) en lugar de depender solo de Spring Security para algunos casos, y capturar `ResourceNotFoundException` (→404), `ServicesException` (→400) y `Exception` genérica (→500).
  - Respuestas simples suelen construirse con `Map.of(...)` en vez de un DTO dedicado cuando es una respuesta ad-hoc; para contratos más estables sí se usan DTOs (`AuthTokenResponse`, `ProfileResponseDTO`, `CourseStatsDTO`, `RecommendationDTO`, etc.).
  - Javadoc breve en cada endpoint describiendo método HTTP y ruta de ejemplo (`GET /api/courses/search?keyword=data`).
- **Entidades**: `@Entity` + `@Table(name = "...")` + Lombok `@Data @NoArgsConstructor @AllArgsConstructor`. Mezcla de convenciones de nombres de columnas (algunas en `snake_case` directo como campo Java, p.ej. `course_id`, `course_score`; otras en camelCase con `@Column(name = "...")` explícito, p.ej. `courseComment` → `course_comment`). **Al generar entidades nuevas, replicar el patrón ya usado en el módulo correspondiente** (revisar la entidad "hermana" antes de nombrar campos).
- **Excepciones de negocio**: `ResourceNotFoundException` (404), `ServicesException` (400 genérico de negocio), `UserAlreadyExistsException` (409). `GlobalExceptionHandler` centraliza también `AuthenticationException` (401), `AccessDeniedException` (403) e `IllegalArgumentException` (400).
- **Seguridad** (`SecurityConfig`):
  - Autenticación **JWT stateless** (`SessionCreationPolicy.STATELESS`), con `JwtAuthenticationFilter` añadido antes de `UsernamePasswordAuthenticationFilter`.
  - CSRF deshabilitado, `formLogin`/`httpBasic` deshabilitados.
  - CORS configurado vía propiedad externa `app.cors.allowed-origins` (por defecto `localhost:5173`).
  - Autorización por rutas con `hasAuthority(...)` / `hasAnyAuthority(...)`:
    - `/api/auth/login`, `/api/auth/register`, `GET /actuator/health`, `GET /uploads/**`, `GET /api/courses/search` → públicos.
    - `/api/auth/me`, `/api/auth/notifications`, `/api/v1/profile/**` → autenticado.
    - `/api/auth/users/**`, `/api/admin/**`, `/api/users/**` → `ADMIN`.
    - `/api/professor/**` → `PROFESSOR` o `ADMIN`.
    - `/api/student/**` → `STUDENT` o `ADMIN`.
    - Resto → autenticado por defecto.
  - `@EnableMethodSecurity` habilitado (permite `@PreAuthorize` puntual además de la config a nivel de filtro).
  - Roles: `ADMIN`, `PROFESSOR`, `STUDENT` (enum `Role`).
- **Testing backend**: JUnit 5 + Spring Boot Test, con tests unitarios por capa (`*Test.java`) y de integración (`*IntegrationTest.java`, `*MockMvcTest.java`) — se sigue una pirámide de testing explícita (ver ADR-055).

### Dominios funcionales cubiertos hoy

- **Usuarios y auth**: registro/login, roles, JWT, perfil (`ProfileController`, `ProfileUpdateDTO`, `ProfileResponseDTO`).
- **Cursos**: catálogo, búsqueda predictiva (`GET /api/courses/search`), matrícula (`POST /api/courses/enroll/{id}`), asignación profesor↔curso, recomendaciones (`RecommendationService`, algoritmo de filtrado por contenido, ver ADR-32/34).
- **Evaluaciones académicas**: `AcademicEvaluation` (valoración de curso + docente, 1 evaluación por alumno/curso vía `@UniqueConstraint`), notas (`CourseGrade`, `TeacherGradeRequest`).
- **Documentos**: subida/descarga con `FileStorageService`, metadatos (`DocumentMetadata`, `FolderType` SENT/RECEIVED), validación perimetral de archivos (ADR-25, mitigación RCE).
- **Notificaciones**: `NotificationDTO`, campana global (`GlobalNotificationBell` en frontend).
- **Intereses/perfilado**: `Interest`, `InterestDTO`, usados para las recomendaciones.

## 3. Frontend — arquitectura

```
auth/                 → AuthContext, AuthProvider, useAuth, authStorage (persistencia del token), authTypes, avatarUrl
components/
  navbar/              → Navbar, MainNavbar, NavbarUser
  ui/                  → componentes reutilizables: authModal, courseInfoModal, courseSearch, genericButton,
                          genericCard, genericHeader, globalNotificationBell, profileSettings, Input
routes/
  guards/              → ProtectedRoute (guardián genérico por rol)
  layouts/             → DashboardLayout (layout común paramétrico por rol, ADR-12)
  pages/
    admin/             → AdminDashboard, AdminProfilePage
    professor/         → ProfessorDashboard, ProfessorProfilePage + components/ (GradingCenter,
                          CourseManagementModal, ProfessorCoursePicker, TaughtCoursesGrid, hooks propios)
    student/           → StudentDashboard, StudentProfilePage, InterestsModal + components/ (paneles y
                          hooks: EnrolledCourses, DocumentManager, EvaluationPanel, SmartRecommendations,
                          StudentStatsPanel, CourseAssignmentPanel, StudentCoursePicker + sus hooks use*)
    public/            → LandingPage, AccessDenied
  AppRoutes / index.tsx → enrutado centralizado
services/              → apiClient (Axios + interceptores), documentService, evaluationService,
                          profileService, courseTypes, userDomains
```

### Convenciones observadas

- **Autenticación**: `AuthContext` + `AuthProvider` en la raíz (`main.tsx`), hook `useAuth()` como única puerta de entrada al estado de sesión. Token persistido vía `authStorage` (localStorage) y leído en cada petición por el interceptor de Axios.
- **Cliente HTTP centralizado** (`services/apiClient.ts`):
  - Instancia única de Axios (`baseURL` desde `VITE_API_URL`, timeout 5000ms).
  - Interceptor de **request**: inyecta `Authorization: Bearer <token>` automáticamente.
  - Interceptor de **response**: si 401, limpia sesión emitiendo un `CustomEvent('auth-session-expired')` en el `window` (patrón desacoplado, lo escucha `AuthProvider`).
  - **Todas las llamadas a la API nuevas deben pasar por `apiClient`**, nunca `fetch` directo ni instancias sueltas de axios.
- **Hooks de datos por pantalla** (patrón dominante): cada panel de dashboard tiene un hook dedicado `use<Cosa>.ts` junto al componente (p.ej. `useCourseCatalog`, `useDocuments`, `useEnrolledCourses`, `useSmartRecommendations`, `useCourseStats`, `useActiveEvaluations`, `useGradingCenter`, `useCourseManagement`). El hook encapsula estado (`useState`), efectos (`useEffect`, con debounce en búsquedas — 400ms), llamadas a `apiClient` y manejo de errores (try/catch + `axios.isAxiosError`), y expone un objeto plano con estado + handlers al componente de presentación.
- **Rutas protegidas**: `ProtectedRoute` genérico verifica sesión + rol; los guardas específicos de student/professor/admin son wrappers finos que solo declaran los roles permitidos. Redirige a landing o a `AccessDenied` según el caso.
- **Layout por rol**: `DashboardLayout` es paramétrico y se reutiliza para los tres roles, evitando duplicar navbar/estructura.
- **Estilos**: Tailwind CSS 4 vía plugin de Vite (utility classes directamente en JSX, no CSS Modules ni styled-components).
- **Testing frontend**: Vitest + React Testing Library. Casi todos los componentes y hooks tienen su `*.test.tsx`/`*.test.ts` hermano en el mismo directorio, incluyendo tests de integración de flujos completos (`*.integration.test.tsx`, p.ej. `StudentSearchFlow`, `NotificationDocumentFlow`).
- **Tipado compartido**: tipos de dominio en `services/courseTypes.ts`, `services/userDomains.ts`, `auth/authTypes.ts` — se usan para desacoplar el frontend de la forma exacta de las entidades JPA del backend (ADR-01 lo justifica explícitamente).

## 4. Decisiones de arquitectura relevantes (ADR) a tener en cuenta

El proyecto documenta **36 ADRs** en `adr.md`. Los más relevantes para generar código nuevo consistente:

| ADR | Tema |
|---|---|
| ADR-01/02 | React+Spring Boot desacoplados, monorepo |
| ADR-04/05/06/07 | Migración completa de sesión → JWT stateless (estado **actual**: JWT ya consolidado, pese a que `tfg-documentacion-tecnica.md` describa aún el modelo de sesión antiguo) |
| ADR-08/09/10/11 | Estado de auth en cliente, interceptores Axios, hidratación de sesión |
| ADR-12 | Layout único paramétrico por rol |
| ADR-17/18 | Control de roles admin, perfil universal atómico |
| ADR-19/20 | Módulo de gestión de cursos, modelado de Intereses |
| ADR-21 | Buscador predictivo optimizado (índice GIN en Postgres) |
| ADR-23 | TTL del token centralizado y tipado |
| ADR-24 | CORS externalizado por variables de entorno |
| ADR-25 | Validación perimetral de archivos subidos (anti-RCE) |
| ADR-27 | Normalización semántica de errores en la API |
| ADR-28/055 | Estrategia de testing (pirámide) |
| ADR-29/30/31 | Resolución de identidad por claims JWT, hidratación de matrículas, Join Fetch vs OSIV |
| ADR-32/34 | Motor de recomendaciones por filtrado de contenido |
| ADR-056 | Componentización del motor de búsqueda de cursos |

> Cuando pidas una funcionalidad nueva relacionada con alguno de estos temas, dime el número de ADR o el nombre y puedo releerlo entero para no contradecir una decisión ya tomada.

## 5. Cómo usaré este contexto

Para cada clase o pantalla nueva que pidas:
1. Ubicaré el módulo/dominio equivalente más cercano ya existente (p.ej. si pides algo de "notas", miro `CourseGrade`/`TeacherGradeRequest`/`AcademicEvaluationController`).
2. Leeré del snapshot original los ficheros concretos de ese dominio (entidad, DTO, repo, controller, servicio, o hook+componente en frontend) para clonar el estilo exacto (nombres, manejo de errores, estructura de respuesta).
3. Seguiré las convenciones de esta tabla salvo que me indiques lo contrario explícitamente.

---
*Fuente: snapshot repomix subido el 24/07/2026 (~31.600 líneas, backend Spring Boot 4.0.6/Java 21 + frontend React 19/Vite 7/Tailwind 4).*
