export const COURSE_DIFFICULTY_LEVELS = [
    'Básico',
    'Intermedio',
    'Avanzado',
] as const;

export const STUDENT_DIFFICULTY_PREFERENCES = [
    'Principiante / Básico',
    'Medio / Intermedio',
    'Avanzado / Experto',
    'Todos los niveles',
] as const;

export type CourseDifficultyLevel = (typeof COURSE_DIFFICULTY_LEVELS)[number];
export type StudentDifficultyPreference = (typeof STUDENT_DIFFICULTY_PREFERENCES)[number];
