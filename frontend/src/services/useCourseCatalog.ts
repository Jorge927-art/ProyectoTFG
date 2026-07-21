import { useState, useEffect } from 'react';
import { apiClient } from '../services/apiClient';
import axios from 'axios';
import type { DBModelCourse } from '../services/courseTypes';

export const useCourseCatalog = (onActionSuccess?: (course: DBModelCourse) => void) => {
    const [searchKeyword, setSearchKeyword] = useState<string>('');
    const [catalogCourses, setCatalogCourses] = useState<DBModelCourse[]>([]);
    const [loadingCatalog, setLoadingCatalog] = useState<boolean>(false);
    const [actionExecutionId, setActionExecutionId] = useState<number | null>(null);
    const [catalogError, setCatalogError] = useState<string>('');

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            fetchCatalogData(searchKeyword);
        }, 400);

        return () => clearTimeout(delayDebounceFn);
    }, [searchKeyword]);

    const fetchCatalogData = async (keyword: string) => {
        setLoadingCatalog(true);
        setCatalogError('');
        try {
            const cleanKeyword = keyword?.trim() || "";

            const response = await apiClient.get('/api/courses/search', {
                params: cleanKeyword ? { keyword: cleanKeyword } : {}
            });

            if (response.status === 200 && response.data) {
                setCatalogCourses(response.data as DBModelCourse[]);
            }
        } catch (err) {
            console.error("Error al consultar el catálogo predictivo:", err);
            setCatalogError("No se pudo sincronizar el catálogo de cursos en tiempo real.");
        } finally {
            setLoadingCatalog(false);
        }
    };

    const executeCourseAction = async (courseId: number, apiEndpoint: string, httpMethod: 'post' | 'put' = 'post') => {
        setActionExecutionId(courseId);
        setCatalogError('');

        try {
            const response = httpMethod === 'post' 
                ? await apiClient.post(apiEndpoint)
                : await apiClient.put(apiEndpoint);

            if (response.status >= 200 && response.status < 300) {
                const targetCourse = catalogCourses.find(c => c.course_id === courseId);
                if (targetCourse && onActionSuccess) {
                    onActionSuccess(targetCourse);
                }
                fetchCatalogData(searchKeyword);
            }
        } catch (err) {
            console.error("Error al ejecutar la acción operativa sobre el curso:", err);
            let message = "Ocurrió un error inesperado al procesar la solicitud del curso.";
            if (axios.isAxiosError(err) && err.response?.data?.message) {
                message = err.response.data.message;
            }
            setCatalogError(message);
        } finally {
            setActionExecutionId(null);
        }
    };

        return {
        searchKeyword,
        setSearchKeyword,
        catalogCourses,
        loadingCatalog,
        actionExecutionId, // <-- CORRECCIÓN: Ponemos la variable real de tu estado de la línea 66
        catalogError,
        setCatalogError,
        executeCourseAction // <-- CORRECCIÓN: Ponemos la función real de tu estado de la línea 42
    };

};
