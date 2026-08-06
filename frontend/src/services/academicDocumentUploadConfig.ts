export const ACADEMIC_DOCUMENT_MAX_SIZE_BYTES = 100 * 1024 * 1024;
export const ACADEMIC_DOCUMENT_MAX_SIZE_LABEL = '100MB';
export const ACADEMIC_DOCUMENT_ACCEPT = '.pdf,.docx,.txt,.mp4';
export const ACADEMIC_DOCUMENT_ALLOWED_LABEL = '.pdf, .docx, .txt, .mp4';

export const buildAcademicDocumentSizeErrorMessage = (): string => (
    `El archivo excede el límite de ${ACADEMIC_DOCUMENT_MAX_SIZE_LABEL} configurado por el sistema.`
);