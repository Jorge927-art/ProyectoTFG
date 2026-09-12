-- Datos ficticios para pruebas de carga y demostracion.
-- Ejecutar solo sobre una base de pruebas que ya tenga COLE y courses cargados.
-- Usuarios: student001..student089 y teacher001..teacher010.
-- Contrasena de prueba: 123456 (hash BCrypt).

BEGIN;

DELETE FROM public.users
WHERE username LIKE 'student___'
   OR username LIKE 'teacher___';

INSERT INTO public.users (password, role, username, email, enabled, failed_login_attempts)
SELECT '$2a$10$gK7ZaN0DI.o8WWoZB7gUQe8pmzYnhW5kPnWFqHbfrzOc4WJZi1IOu',
       'PROFESSOR',
      'teacher' || lpad(number::text, 3, '0'),
      'teacher' || lpad(number::text, 3, '0') || '@test.local',
       true,
       0
FROM generate_series(1, 10) AS numbers(number);

INSERT INTO public.users (password, role, username, email, enabled, failed_login_attempts)
SELECT '$2a$10$gK7ZaN0DI.o8WWoZB7gUQe8pmzYnhW5kPnWFqHbfrzOc4WJZi1IOu',
       'STUDENT',
      'student' || lpad(number::text, 3, '0'),
      'student' || lpad(number::text, 3, '0') || '@test.local',
       true,
       0
FROM generate_series(1, 89) AS numbers(number);

UPDATE public.courses AS course
SET assigned_user_id = teacher.user_id
FROM public.users AS teacher
WHERE teacher.role = 'PROFESSOR'
  AND teacher.username = 'teacher' || lpad((((course.course_id - 1) % 10) + 1)::text, 3, '0')
  AND course.course_id <= 100;

INSERT INTO public.interests (user_id)
SELECT user_id
FROM public.users
WHERE role = 'STUDENT'
  AND username LIKE 'student___';

INSERT INTO public.interest_categories (interest_id, category)
SELECT user_id, CASE WHEN user_id % 3 = 0 THEN 'Data Science'
                     WHEN user_id % 3 = 1 THEN 'Computer Science'
                     ELSE 'Business' END
FROM public.users
WHERE role = 'STUDENT' AND username LIKE 'student___';

INSERT INTO public.interest_course_types (interest_id, course_type)
SELECT user_id, CASE WHEN user_id % 2 = 0 THEN 'Básico' ELSE 'Intermedio' END
FROM public.users
WHERE role = 'STUDENT' AND username LIKE 'student___';

INSERT INTO public.interest_durations (interest_id, duration)
SELECT user_id, CASE WHEN user_id % 3 = 0 THEN 'Corto'
                     WHEN user_id % 3 = 1 THEN 'Medio'
                     ELSE 'Largo' END
FROM public.users
WHERE role = 'STUDENT' AND username LIKE 'student___';

INSERT INTO public.interest_languages (interest_id, language)
SELECT user_id, CASE WHEN user_id % 2 = 0 THEN 'English' ELSE 'Spanish' END
FROM public.users
WHERE role = 'STUDENT' AND username LIKE 'student___';

INSERT INTO public.interest_subtitle_languages (interest_id, subtitle_languages, subtitle_language)
SELECT user_id, 'Con subtítulos', CASE WHEN user_id % 2 = 0 THEN 'English' ELSE 'Spanish' END
FROM public.users
WHERE role = 'STUDENT' AND username LIKE 'student___';

INSERT INTO public.enrollment (
    enrolled_at, progress, status, course_id, user_id, started_at,
    progress_alert_student_ack, progress_alert_professor_ack
)
SELECT now() - ((student.user_id % 30) || ' days')::interval,
       (student.user_id * 7 + course.course_id) % 101,
       'ACTIVO',
       course.course_id,
       student.user_id,
       now() - ((student.user_id % 20) || ' days')::interval,
       false,
       false
FROM public.users AS student
CROSS JOIN LATERAL (
    SELECT course_id
    FROM public.courses
    WHERE duration IS NOT NULL AND duration > 0
    ORDER BY course_id
    OFFSET ((student.user_id - 12) * 3) % 4700
    LIMIT 3
) AS course
WHERE student.role = 'STUDENT' AND student.username LIKE 'student___';

COMMIT;

SELECT role, COUNT(*) AS users
FROM public.users
GROUP BY role
ORDER BY role;

SELECT COUNT(*) AS enrollments FROM public.enrollment;
SELECT COUNT(*) AS students_with_interests FROM public.interests;