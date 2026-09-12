-- Carga el CSV limpio en una base ya inicializada con db/init/01-schema.sql.
-- Ejecutar desde la raiz del repositorio con psql.

CREATE TEMP TABLE courses_import (
    title text,
    url text,
    short_intro text,
    category text,
    sub_category text,
    course_type text,
    language text,
    subtitle_languages text,
    skills text,
    instructors text,
    rating text,
    num_of_viewers text,
    duration text,
    site text,
    title_key text
);

\copy courses_import FROM 'db/seed/courses/Online_Courses_Modified.csv' WITH (FORMAT csv, HEADER true, ENCODING 'UTF8', NULL '')

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM courses_import
        WHERE NULLIF(BTRIM(title_key), '') IS NULL
           OR NULLIF(BTRIM(title), '') IS NULL
           OR NULLIF(BTRIM(duration), '') IS NULL
           OR duration::real <= 0
    ) THEN
        RAISE EXCEPTION 'El CSV contiene titulos o duraciones invalidas';
    END IF;

    IF EXISTS (
        SELECT title_key
        FROM courses_import
        GROUP BY title_key
        HAVING COUNT(*) > 1
    ) THEN
        RAISE EXCEPTION 'El CSV contiene title_key duplicados';
    END IF;
END
$$;

INSERT INTO public.courses (
    category,
    course_type,
    duration,
    instructors,
    language,
    rating,
    short_intro,
    site,
    skills,
    "sub-category",
    subtitle_languages,
    title,
    url,
    assigned_user_id,
    title_key,
    ever_used,
    num_of_viewers,
    sub_category
)
SELECT
    NULLIF(BTRIM(category), ''),
    NULLIF(BTRIM(course_type), ''),
    duration::real,
    NULLIF(BTRIM(instructors), ''),
    NULLIF(BTRIM(language), ''),
    NULLIF(BTRIM(rating), '')::real,
    NULLIF(short_intro, ''),
    NULLIF(BTRIM(site), ''),
    NULLIF(skills, ''),
    NULLIF(BTRIM(sub_category), ''),
    NULLIF(subtitle_languages, ''),
    BTRIM(title),
    NULLIF(BTRIM(url), ''),
    NULL,
    BTRIM(title_key),
    false,
    NULLIF(BTRIM(num_of_viewers), '')::integer,
    NULLIF(BTRIM(sub_category), '')
FROM courses_import;

SELECT COUNT(*) AS cursos_cargados FROM public.courses;