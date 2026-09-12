-- Vacía todos los datos del esquema public sin eliminar su estructura.
-- Ejecutar únicamente sobre una base de datos de desarrollo o de entrega
-- cuya información se haya respaldado previamente.
DO $$
DECLARE
    public_tables text;
BEGIN
    SELECT string_agg(format('%I.%I', schemaname, tablename), ', ' ORDER BY tablename)
      INTO public_tables
      FROM pg_tables
     WHERE schemaname = 'public';

    IF public_tables IS NOT NULL THEN
        EXECUTE format('TRUNCATE TABLE %s RESTART IDENTITY CASCADE', public_tables);
    END IF;
END
$$;