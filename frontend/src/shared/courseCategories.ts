export const COURSE_CATEGORIES = [
    'Ciencia de Datos',
    'Negocios',
    'Tecnología de la Información',
    'Ciencias de la Computación',
    'Artes y Humanidades',
    'Aprendizaje de Idiomas',
    'Desarrollo Personal',
    'Salud',
    'Ciencias Sociales',
    'Ciencias Físicas e Ingeniería',
    'Matemáticas y Lógica',
] as const;

export type CourseCategory = (typeof COURSE_CATEGORIES)[number];
