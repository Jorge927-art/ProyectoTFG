# Dataset de cursos

`Online_Courses_Modified.csv` es la salida reproducible del script de limpieza
del dataset original. El proceso conserva las columnas utiles para `courses`,
convierte `Duration` a horas y genera `title_key` con la misma regla que usa el
backend: minusculas y eliminacion de espacios.

Validaciones aplicadas:

- titulos no vacios;
- duraciones numericas y mayores que cero;
- ausencia de colisiones de `title_key`;
- registro de filas descartadas y motivos en el informe Excel generado fuera de
  este repositorio.

El CSV no debe cargarse antes de ejecutar `db/init/01-schema.sql`. La carga
definitiva debe realizarse mediante un script SQL o un procedimiento documentado
que omita `course_id`, deje `assigned_user_id` vacio y establezca `ever_used` a
`false`.
