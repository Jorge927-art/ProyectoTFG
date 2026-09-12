# Pruebas de carga

Este directorio contiene la prueba HTTP reproducible para el entorno de carga.
La prueba no utiliza la base oficial `gestion-cursos-backend`: trabaja con la
base aislada `gestion_cursos_loadtest`.

## Datos generados

El seed `db/seed/demo/03-seed-load-test-data.sql` crea:

- 1 administrador: `COLE`.
- 10 profesores: `teacher001` a `teacher010`.
- 89 alumnos: `student001` a `student089`.
- Contraseña de usuarios ficticios: `123456`.
- 89 conjuntos de preferencias.
- 267 matrículas, tres por alumno.
- 100 cursos asignados a profesores.

Los usuarios y la contraseña son exclusivamente de pruebas locales. Los hashes
BCrypt se almacenan en la base; no se guardan contraseñas en texto plano.

## Crear el entorno

Con PostgreSQL activo y desde la raíz del repositorio:

```powershell
$env:PGPASSWORD = '<contraseña PostgreSQL>'
$bin = 'C:\PostgreSQL\bin'

& "$bin\dropdb.exe" --if-exists --host=localhost --port=5432 --username=postgres gestion_cursos_loadtest
& "$bin\createdb.exe" --host=localhost --port=5432 --username=postgres gestion_cursos_loadtest
& "$bin\psql.exe" --host=localhost --port=5432 --username=postgres --dbname=gestion_cursos_loadtest --set=ON_ERROR_STOP=1 --file='db\init\01-schema.sql'
& "$bin\psql.exe" --host=localhost --port=5432 --username=postgres --dbname=gestion_cursos_loadtest --set=ON_ERROR_STOP=1 --file='db\seed\01-seed-admin.sql'
& "$bin\psql.exe" --host=localhost --port=5432 --username=postgres --dbname=gestion_cursos_loadtest --set=ON_ERROR_STOP=1 --file='db\seed\courses\02-load-courses.sql'
& "$bin\psql.exe" --host=localhost --port=5432 --username=postgres --dbname=gestion_cursos_loadtest --set=ON_ERROR_STOP=1 --file='db\seed\demo\03-seed-load-test-data.sql'

Remove-Item Env:PGPASSWORD
```

## Arrancar el backend

La aplicación debe apuntar a `gestion_cursos_loadtest`, no a la base oficial:

```powershell
$env:SPRING_DATASOURCE_URL = 'jdbc:postgresql://localhost:5432/gestion_cursos_loadtest'
$env:SPRING_DATASOURCE_USERNAME = 'postgres'
$env:SPRING_DATASOURCE_PASSWORD = '<contraseña PostgreSQL>'
$env:SPRING_JPA_HIBERNATE_DDL_AUTO = 'validate'
$env:SPRING_SQL_INIT_MODE = 'never'
$env:SERVER_PORT = '8081'
Set-Location backend
.\mvnw.cmd spring-boot:run
```

## Ejecutar la medición

En otra terminal, con el backend disponible en el puerto 8081:

```powershell
& 'C:\Python314\python.exe' 'tests\load_test.py' `
  --base-url 'http://localhost:8081' `
  --users 89 `
  --concurrency 10 `
  --output 'tests\load-test-results.json'
```

Cada alumno ejecuta login, búsqueda de cursos, recomendaciones y consulta de
cursos activos. El script guarda latencias media, máxima y p95 por endpoint,
además del recuento de estados HTTP y errores.

## Resultado de la prueba ejecutada

Fecha: 5 de septiembre de 2026.

| Endpoint | Peticiones | Estado | Media | P95 | Máximo |
| --- | ---: | --- | ---: | ---: | ---: |
| Login | 89 | 200: 89 | 169,65 ms | 643,02 ms | 650,58 ms |
| Búsqueda `python` | 89 | 200: 89 | 19,30 ms | 78,64 ms | 81,29 ms |
| Recomendaciones | 89 | 200: 89 | 226,66 ms | 321,08 ms | 337,26 ms |
| Cursos activos | 89 | 200: 89 | 15,78 ms | 31,66 ms | 34,74 ms |

Resumen:

- 356 peticiones totales.
- 0 errores.
- 89 logins correctos.
- Duración total: 3,973 segundos.
- Concurrencia máxima: 10 trabajadores.

Estos datos son una línea base local, no una certificación de capacidad de
producción. Para una prueba más exigente se puede repetir con `--users 89
--concurrency 25` o con una base mayor, registrando cada escenario por separado.

## Comparativa de concurrencia

Se repitió el mismo flujo con 25 y 50 trabajadores concurrentes, manteniendo
los mismos 89 alumnos y los mismos 4.747 cursos. Cada escenario generó 356
peticiones y terminó con 0 errores HTTP.

| Concurrencia | Endpoint | Media | P95 | Máximo |
| ---: | --- | ---: | ---: | ---: |
| 10 | Login | 169,65 ms | 643,02 ms | 650,58 ms |
| 25 | Login | 461,54 ms | 833,85 ms | 838,37 ms |
| 50 | Login | 597,28 ms | 912,40 ms | 961,55 ms |
| 10 | Búsqueda | 19,30 ms | 78,64 ms | 81,29 ms |
| 25 | Búsqueda | 63,59 ms | 184,49 ms | 213,76 ms |
| 50 | Búsqueda | 68,27 ms | 210,34 ms | 401,22 ms |
| 10 | Recomendaciones | 226,66 ms | 321,08 ms | 337,26 ms |
| 25 | Recomendaciones | 376,45 ms | 590,66 ms | 805,52 ms |
| 50 | Recomendaciones | 470,02 ms | 848,09 ms | 1089,85 ms |
| 10 | Cursos activos | 15,78 ms | 31,66 ms | 34,74 ms |
| 25 | Cursos activos | 90,60 ms | 251,46 ms | 253,89 ms |
| 50 | Cursos activos | 188,33 ms | 364,09 ms | 638,48 ms |

La latencia aumenta al incrementar la concurrencia, especialmente en login,
recomendaciones y cursos activos. Aun así, los tres escenarios terminaron sin
errores HTTP. El endpoint de recomendaciones presenta el mayor coste funcional
entre las consultas protegidas, mientras que el login mantiene una latencia
superior por el coste deliberado de BCrypt.

Los resultados detallados se conservan en:

- `load-test-results.json` para 10 trabajadores;
- `load-test-results-c25.json` para 25 trabajadores;
- `load-test-results-c50.json` para 50 trabajadores.

Esta comparativa constituye una evaluación local de carga ligera y media. No
determina el límite máximo del sistema ni sustituye una prueba de producción
con monitorización de CPU, memoria, conexiones de PostgreSQL y una duración
prolongada.
