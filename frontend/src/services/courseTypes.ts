/**
 * Modelo canónico unificado que representa la estructura completa de un Curso.
 * Sincronizado estrictamente con la entidad 'Courses' del Backend para toda la SPA.
 */
export interface DBModelCourse {
    course_id: number;
    title: string;
    url?: string;
    shortIntro?: string;
    category: string;
    subCategory?: string;
    courseType?: string;
    language?: string;
    subtitleLanguages?: string;
    skills?: string;
    instructors?: string;
    rating?: number;
    numOfViewers?: number;
    duration?: number;
    site?: string;
}

/**
 * Modelo estándar que representa el registro de una Matrícula académica.
 */
export interface EnrollmentInfo {
    enrollmentid: number;
    enrolled_at: string;
    started_at: string | null; 
    status: string;
    progress_percentage: number;
    course: DBModelCourse;
    grades?: CourseGradeInfo[];
}

/**
 * Modelo estándar que representa la calificación de un curso.
 */
export interface CourseGradeInfo {
    title: string; // Ej: "Examen Parcial", "Trabajo Fin de Curso"
    score: string; // Ej: "8.5", "10"
}

/**
 * Modelo analítico para las métricas consolidadas de un curso [ADR-41].
 * Transporta los promedios numéricos calculados dinámicamente en PostgreSQL.
 */
export interface CourseStatsInfo {
    courseId: number;
    averageGrade: number | null;
    localEnrollments: number;
    communityRating: number | null;
    instructorRating: number | null;
    platform: string;
    category: string;
}

