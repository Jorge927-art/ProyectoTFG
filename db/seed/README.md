# Datos iniciales

Los scripts y ficheros de esta carpeta cargan los datos necesarios despues de
crear el esquema. La estructura y los datos se mantienen separados para poder
reconstruir una instalacion limpia y repetir las pruebas.

Orden previsto:

1. Crear el usuario administrador con un hash BCrypt.
2. Cargar el catalogo limpio de cursos.
3. Cargar, solo si es necesario, datos adicionales de demostracion.

No se deben incluir aqui dumps completos de bases de datos ni credenciales
reales.

## Ejecucion

El administrador de demostracion se carga mediante `01-seed-admin.sql` con el
usuario `COLE` y la contrasena `admin123`. El fichero contiene unicamente el
hash BCrypt. Esta credencial es apropiada para una evaluacion local, pero no
para un despliegue publico o de produccion.

El catalogo se carga mediante `courses/02-load-courses.sql`. El script usa una
tabla temporal, valida el CSV y despues inserta los cursos en `public.courses`.
