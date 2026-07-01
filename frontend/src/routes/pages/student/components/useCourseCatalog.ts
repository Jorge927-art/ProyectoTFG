import { useState, useEffect } from 'react';
import { apiClient } from '../../../../services/apiClient';
import axios from 'axios';
import type { DBModelCourse } from '../../../../services/courseTypes';

export const useCourseCatalog = (onEnrollSuccess: (course: DBModelCourse) => void) => {
    const [searchKeyword, setSearchKeyword] = useState<string>('');
    const [catalogCourses, setCatalogCourses] = useState<DBModelCourse[]>([]);
    const [loadingCatalog, setLoadingCatalog] = useState<boolean>(false);
    const [enrollingId, setEnrollingId] = useState<number | null>(null);
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
            const response = await apiClient.get(`/api/courses/search?keyword=${encodeURIComponent(keyword)}`);
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

    const handleEnrollCourse = async (courseId: number) => {
        setEnrollingId(courseId);
        setCatalogError('');

        try {
            const response = await apiClient.post(`/api/courses/enroll/${courseId}`);
            if (response.status >= 200 && response.status < 300) {
                const enrolledCourse = catalogCourses.find(c => c.course_id === courseId);
                if (enrolledCourse) {
                    onEnrollSuccess(enrolledCourse);
                }
                fetchCatalogData(searchKeyword);
            }
        } catch (err) {
            console.error("Error al procesar la matrícula del estudiante:", err);
            let message = "Ocurrió un error inesperado al procesar tu matrícula.";
            if (axios.isAxiosError(err) && err.response?.data?.message) {
                message = err.response.data.message;
            }
            setCatalogError(message);
        } finally {
            setEnrollingId(null);
        }
    };

    return {
        searchKeyword,
        setSearchKeyword,
        catalogCourses,
        loadingCatalog,
        enrollingId,
        catalogError,
        handleEnrollCourse
    };
};
