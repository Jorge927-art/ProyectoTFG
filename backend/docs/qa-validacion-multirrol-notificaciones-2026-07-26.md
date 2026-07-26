# QA Validacion Multirol - Notificaciones y Dashboard

Fecha: 2026-07-26
Entorno: local (frontend <http://127.0.0.1:5173>, backend <http://localhost:8080>)
Alcance: alumno, profesor y administrador

## Objetivo

Verificar la resolucion del error 500 en notificaciones (campana) y confirmar funcionamiento correcto del dashboard por rol tras los ajustes en servicio y migracion de esquema.

## Evidencia Funcional (UI)

### Alumno

- Campana y dashboard operativos tras fix.
- No se reproduce el 500 original al interactuar con notificaciones.

### Profesor (usuario: profesor_verif)

- Login correcto.
- Acceso a panel docente correcto (/professor).
- Campana abre correctamente y muestra estado vacio:
  - "Tu bandeja esta limpia"
  - "No tienes avisos pendientes por el momento."
- Sin errores 500 observados durante el flujo.

### Administrador (usuario: admin_verif)

- Login correcto.
- Acceso a panel admin correcto (/admin).
- Listado de usuarios visible.
- Campana operativa sin errores 500 observados.

## Evidencia API (HTTP)

Comprobaciones ejecutadas con JWT fresco para profesor/admin:

- GET /api/auth/notifications => 200
- PATCH /api/auth/notifications/dismiss => 200
- GET /api/v1/teacher/metrics/summary => 200
- GET /api/auth => 200
- GET /api/auth/notifications => 200
- PATCH /api/auth/notifications/dismiss => 200

Resultado: sin respuestas 500 en los endpoints criticos validados.

## Cobertura de tests

- UserControllerTest validado con nuevos casos de dismiss notifications:
  - 200 con principal valido
  - 401 sin principal

## Limpieza de usuarios de verificacion

Accion solicitada: limpiar cuentas de prueba.

Estado actual:

- profesor_verif: enabled=false (baja logica aplicada)
- admin_verif: enabled=true

Nota:

- El backend bloquea por seguridad la auto-baja del propio admin autenticado en DELETE /api/auth/users/{username}.
- Para desactivar admin_verif se requiere ejecutar la accion desde otra cuenta ADMIN distinta.

## Conclusion

Verificacion multirol completada con resultado satisfactorio para el bug reportado y sus efectos colaterales:

- Incidencia 500 en campana: resuelta.
- Dashboards por rol (alumno/profesor/admin): operativos en validacion manual.
- Endpoints clave de notificaciones y metricas: 200 en la comprobacion final.
