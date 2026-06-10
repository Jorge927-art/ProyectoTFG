# Backlog Técnico - Migración de Sesión a JWT

## Objetivo

Migrar de autenticación por sesión a JWT sin romper el frontend actual, con despliegue gradual y rollback seguro.

## Suposiciones

- Backend actual: Spring Boot 4 + Spring Security.
- Frontend actual: React/Vite.
- Estado actual: login por sesión ya funcional con `/api/auth/login` y `/api/auth/me`.

## Fase 0 - Preparación

### Tareas

- [ ] Crear rama de trabajo `feature/auth-jwt-migration`.
- [ ] Definir variables de entorno para JWT (secreto, expiraciones).
- [ ] Documentar endpoints protegidos actuales.
- [ ] Definir feature flag para modo JWT.

### Entregables

- [ ] Checklist de endpoints protegidos.
- [ ] Archivo de variables de entorno para local/staging/prod.

---

## Fase 1 - Base JWT en Backend

### Archivos existentes a tocar

- [ ] src/main/java/com/cursosonline/backend/config/SecurityConfig.java
- [ ] src/main/java/com/cursosonline/backend/controller/UserController.java
- [ ] src/main/resources/application.properties

### Nuevos componentes a crear

- [ ] JwtService (generación y validación de tokens)
- [ ] JwtAuthenticationFilter (lee Bearer token y autentica request)
- [ ] AuthRequest DTO (username/password)
- [ ] AuthTokenResponse DTO (accessToken, tokenType, expiresIn)
- [ ] RefreshTokenRequest DTO
- [ ] RefreshTokenResponse DTO

### Tareas

- [ ] Añadir dependencias necesarias para JWT en `pom.xml` (jjwt-api, jjwt-impl, jjwt-jackson o equivalente).
- [ ] Implementar `JwtService` con:
  - [ ] `generateAccessToken(...)`
  - [ ] `generateRefreshToken(...)`
  - [ ] `extractUsername(...)`
  - [ ] `isTokenValid(...)`
- [ ] Implementar `JwtAuthenticationFilter` y registrarlo en la cadena de seguridad.
- [ ] Configurar `SessionCreationPolicy.STATELESS` en modo JWT.
- [ ] Mantener compatibilidad temporal con flujo de sesión bajo feature flag.

### Criterios de aceptación

- [ ] Compila sin errores.
- [ ] El filtro JWT puebla `SecurityContext` cuando el token es válido.

---

## Fase 2 - Endpoints de autenticación JWT

### Archivos existentes a tocar

- [ ] src/main/java/com/cursosonline/backend/controller/UserController.java
- [ ] src/main/java/com/cursosonline/backend/services/SessionAuthenticationService.java

### Nuevos componentes a crear

- [ ] JwtAuthenticationService (login JWT, refresh, logout)
- [ ] RefreshTokenStore (persistencia o lista de revocación)

### Tareas

- [ ] Adaptar `POST /api/auth/login` para devolver `accessToken` (+ refresh por cookie HttpOnly o body según estrategia).
- [ ] Crear `POST /api/auth/refresh`.
- [ ] Crear `POST /api/auth/logout` (revocación de refresh token).
- [ ] Mantener `GET /api/auth/me` operativo sobre JWT.
- [ ] No devolver nunca password ni hashes en respuestas.

### Criterios de aceptación

- [ ] Login JWT responde con token válido.
- [ ] Refresh entrega un nuevo access token.
- [ ] Logout invalida refresh token.

---

## Fase 3 - Roles y autorización

### Archivos existentes a tocar

- [ ] src/main/java/com/cursosonline/backend/config/CustomUserDetailsService.java
- [ ] src/main/java/com/cursosonline/backend/config/SecurityConfig.java

### Tareas

- [ ] Incluir `role` en claims del access token.
- [ ] Validar que reglas por rol siguen operativas:
  - [ ] `/api/admin/**` -> ADMIN
  - [ ] `/api/profesor/**` -> PROFESSOR
  - [ ] `/api/estudiante/**` -> STUDENT
- [ ] Asegurar 401 (no autenticado) vs 403 (sin permisos) de forma consistente.

### Criterios de aceptación

- [ ] Pruebas manuales por rol con resultados esperados.

---

## Fase 4 - Frontend React (compatibilidad y migración)

### Archivos probables a tocar (frontend)

- [ ] src/auth/AuthContext.tsx
- [ ] src/auth/AuthProvider.tsx
- [ ] src/services/* (cliente HTTP)
- [ ] guards de rutas protegidas en src/routes/guards/*

### Tareas

- [ ] Guardar access token en memoria (no localStorage si no es necesario).
- [ ] Enviar `Authorization: Bearer <token>` en peticiones protegidas.
- [ ] Implementar interceptor de 401:
  - [ ] llamar a `/api/auth/refresh`
  - [ ] reintentar una sola vez la request original
- [ ] Si refresh falla: limpiar estado de auth y redirigir a login.
- [ ] Mantener transición con modo sesión mientras dure el rollout.

### Criterios de aceptación

- [ ] Login, navegación protegida y refresco silencioso funcionan.
- [ ] No hay bucles de reintento infinito.

---

## Fase 5 - Seguridad operativa

### Tareas

- [ ] Configurar secreto JWT por entorno.
- [ ] Definir expiraciones:
  - [ ] access token corto (10-15 min)
  - [ ] refresh token largo (7-14 días)
- [ ] Cookie refresh: HttpOnly + Secure + SameSite.
- [ ] Revisar CORS para frontend real (no comodines en producción).
- [ ] Añadir logs de seguridad: login, refresh, logout, token inválido.

### Criterios de aceptación

- [ ] Configuración productiva aprobada.
- [ ] Sin secretos hardcodeados en código.

---

## Fase 6 - Pruebas

### Suite mínima backend

- [ ] Login con credenciales válidas -> 200 + token.
- [ ] Login inválido -> 401.
- [ ] Endpoint protegido sin token -> 401/403 según diseño.
- [ ] Endpoint protegido con token válido -> 200.
- [ ] Refresh válido -> 200 con token nuevo.
- [ ] Refresh revocado/expirado -> 401.
- [ ] Logout seguido de refresh -> 401.

### Suite mínima frontend

- [ ] Persistencia de sesión lógica durante navegación.
- [ ] Renovación automática de token ante expiración.
- [ ] Redirección correcta a login tras refresh fallido.

---

## Fase 7 - Despliegue gradual y rollback

### Tareas

- [ ] Activar JWT en staging con feature flag.
- [ ] Validar métricas de error 401/403 y tasa de refresh.
- [ ] Activar en producción por porcentaje o ventana controlada.
- [ ] Mantener vía de rollback a sesión durante el periodo de observación.
- [ ] Retirar código legacy de sesión cuando JWT esté estable.

### Criterios de salida

- [ ] No regresiones funcionales.
- [ ] Indicadores de autenticación estables durante al menos 7 días.

---

## Orden sugerido de ejecución

1. Fase 0
2. Fase 1
3. Fase 2
4. Fase 3
5. Fase 6 (backend)
6. Fase 4 (frontend)
7. Fase 6 (frontend + e2e)
8. Fase 5
9. Fase 7

## Riesgos principales y mitigación

- Riesgo: rotura de sesiones activas durante transición.
  - Mitigación: feature flag + compatibilidad temporal.
- Riesgo: manejo incorrecto de refresh token.
  - Mitigación: revocación y rotación obligatoria + pruebas negativas.
- Riesgo: fugas de secretos.
  - Mitigación: variables de entorno y revisión de logs.
