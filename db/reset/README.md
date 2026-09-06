# Reinicio de datos

`01-reset-all-data.sql` vacía todas las tablas del esquema `public` sin eliminar
tablas, restricciones ni índices. También reinicia las secuencias de identidad.

El script usa `TRUNCATE ... CASCADE`, por lo que elimina primero y de forma
controlada los registros relacionados mediante claves foráneas. Debe ejecutarse
solo después de crear un respaldo y únicamente sobre la base de datos objetivo.

## Procedimiento realizado

1. Detener el backend para evitar escrituras concurrentes.
2. Crear un `pg_dump` fuera del repositorio.
3. Ejecutar `01-reset-all-data.sql` contra `gestion-cursos-backend`.
4. Verificar que las tablas quedan sin registros.
5. Eliminar los archivos de `uploads/avatars` y `uploads/documents`, porque sus
   metadatos también se han eliminado.
6. Cargar posteriormente el administrador y el nuevo dataset de cursos.

## Ejecución manual

Desde la raíz del proyecto, con PostgreSQL activo:

```powershell
$env:PGPASSWORD = '<contraseña>'
& 'C:\PostgreSQL\bin\psql.exe' `
  --host=localhost `
  --port=5432 `
  --username=postgres `
  --dbname=gestion-cursos-backend `
  --set=ON_ERROR_STOP=1 `
  --file='db\reset\01-reset-all-data.sql'
Remove-Item Env:PGPASSWORD
```

El respaldo utilizado en la limpieza inicial se guardó fuera del repositorio
en `C:\CursosOnline-backups`. No se deben guardar contraseñas ni dumps con
datos reales dentro del control de versiones.
