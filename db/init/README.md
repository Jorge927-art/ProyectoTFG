# Inicializacion del esquema

`01-schema.sql` contiene un volcado de solo esquema generado desde la base de
datos actual. Crea la estructura necesaria para ejecutar la aplicacion:

- extension `pg_trgm`;
- tablas y secuencias;
- claves primarias y foraneas;
- restricciones e indices.

El fichero no contiene usuarios, cursos, matriculas, documentos, notas,
notificaciones ni tokens historicos. Debe ejecutarse sobre una base de datos
nueva antes de cargar los datos iniciales de `db/seed`.

El fichero antiguo `01-init.sql` es un volcado completo de una instalacion
anterior y contiene datos historicos. Se conserva como referencia, pero no forma
parte del procedimiento limpio de entrega.

## Orden de inicializacion

1. Crear una base de datos vacia.
2. Ejecutar `01-schema.sql`.
3. Ejecutar los scripts de `db/seed`.
4. Verificar la aplicacion con el backend detenido durante las cargas.

## Ejecucion manual

```powershell
$env:PGPASSWORD = '<contrasena>'
& 'C:\PostgreSQL\bin\psql.exe' `
  --host=localhost `
  --port=5432 `
  --username=postgres `
  --dbname=gestion-cursos-backend `
  --set=ON_ERROR_STOP=1 `
  --file='db\init\01-schema.sql'
Remove-Item Env:PGPASSWORD
```
