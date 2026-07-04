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
}
