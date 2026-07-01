/**
 * DOMINIO DEL ADMINISTRADOR: Modelo canónico que representa la estructura completa 
 * de un Usuario para gestiones administrativas.
 */
export interface UserEntity {
    userId?: number;
    username: string;
    role: string;
    enabled: boolean;
}

/** 
 * DOMINIO DEL ESTUDIANTE: Contrato unificado que representa un Curso Recomendado.
 */
export interface RecommendedCourse {
    id: number;
    title: string;
    instructor: string;
    category: string;
    rating: number;
    reason: string;
}

/** 
 * DOMINIO DEL PROFESOR: Contrato unificado que representa una Asignatura Asignada e Impartida.
 */
export interface TaughtCourse {
    id: number;
    title: string;
    studentsCount: number;
    averageProgress: number;
    category: string;
}

/** 
 * DOMINIO DEL PROFESOR: Contrato unificado que representa una Métrica de Rendimiento Docente.
 */
export interface TeacherMetric {
    id: number;
    title: string;
    value: string | number;
    description: string;
    type: string;
}
