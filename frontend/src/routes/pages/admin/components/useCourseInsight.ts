import { useEffect, useRef, useState } from 'react';
import {
    searchCourses,
    getCourseDetail,
    getCourseUserStats,
    getCourseCollectiveStats,
    resolveCourseInsightErrorMessage
} from '../../../../services/adminCourseInsightService';
import type {
    CourseSearchResult,
    CourseDetail,
    EnrolledUser,
    CourseUserStats,
    CourseCollectiveStats
} from '../../../../services/adminCourseInsightService';

const MIN_PREDICTIVE_CHARS = 1;

export const useCourseInsight = () => {
    const [keyword, setKeyword] = useState<string>('');
    const [results, setResults] = useState<CourseSearchResult[]>([]);
    const [selectedCourse, setSelectedCourse] = useState<CourseDetail | null>(null);
    const [selectedUser, setSelectedUser] = useState<EnrolledUser | null>(null);
    const [stats, setStats] = useState<CourseUserStats | null>(null);
    const [collectiveStats, setCollectiveStats] = useState<CourseCollectiveStats | null>(null);
    const [loadingSearch, setLoadingSearch] = useState<boolean>(false);
    const [loadingDetail, setLoadingDetail] = useState<boolean>(false);
    const [loadingStats, setLoadingStats] = useState<boolean>(false);
    const [loadingCollectiveStats, setLoadingCollectiveStats] = useState<boolean>(false);
    const [error, setError] = useState<string>('');
    const [highlightedResultIndex, setHighlightedResultIndex] = useState<number>(-1);
    const searchRequestIdRef = useRef(0);

    const executePredictiveSearch = async (rawKeyword: string) => {
        const normalizedKeyword = rawKeyword.trim();
        if (!normalizedKeyword || normalizedKeyword.length < MIN_PREDICTIVE_CHARS) {
            setResults([]);
            setHighlightedResultIndex(-1);
            setError('');
            setLoadingSearch(false);
            return;
        }

        const requestId = ++searchRequestIdRef.current;
        setLoadingSearch(true);
        setError('');

        try {
            const data = await searchCourses(normalizedKeyword);
            if (requestId !== searchRequestIdRef.current) {
                return;
            }

            const prefix = normalizedKeyword.toLocaleLowerCase();
            const predictiveResults = data.filter((course) =>
                course.title.toLocaleLowerCase().startsWith(prefix)
            );
            setResults(predictiveResults);
            setHighlightedResultIndex(predictiveResults.length > 0 ? 0 : -1);
        } catch (err) {
            if (requestId !== searchRequestIdRef.current) {
                return;
            }
            console.error('Error al buscar cursos:', err);
            setError(resolveCourseInsightErrorMessage(err));
        } finally {
            if (requestId === searchRequestIdRef.current) {
                setLoadingSearch(false);
            }
        }
    };

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        await executePredictiveSearch(keyword);
    };

    const handleSearchInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (results.length === 0) {
            return;
        }

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setHighlightedResultIndex((prev) => (prev + 1) % results.length);
            return;
        }

        if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHighlightedResultIndex((prev) => (prev <= 0 ? results.length - 1 : prev - 1));
            return;
        }

        if (e.key === 'Enter' && highlightedResultIndex >= 0) {
            e.preventDefault();
            void handleSelectCourse(results[highlightedResultIndex].courseId);
            return;
        }

        if (e.key === 'Escape') {
            e.preventDefault();
            setResults([]);
            setHighlightedResultIndex(-1);
        }
    };

    useEffect(() => {
        const normalizedKeyword = keyword.trim();

        if (!normalizedKeyword) {
            searchRequestIdRef.current += 1;
            setResults([]);
            setHighlightedResultIndex(-1);
            setSelectedCourse(null);
            setSelectedUser(null);
            setStats(null);
            setCollectiveStats(null);
            setError('');
            setLoadingSearch(false);
            return;
        }

        if (normalizedKeyword.length < MIN_PREDICTIVE_CHARS) {
            searchRequestIdRef.current += 1;
            setResults([]);
            setHighlightedResultIndex(-1);
            setError('');
            setLoadingSearch(false);
            return;
        }

        setSelectedCourse(null);
        setSelectedUser(null);
        setStats(null);
        setCollectiveStats(null);

        const debounceTimer = window.setTimeout(() => {
            void executePredictiveSearch(normalizedKeyword);
        }, 250);

        return () => {
            window.clearTimeout(debounceTimer);
        };
    }, [keyword]);

    const handleSelectCourse = async (courseId: number) => {
        setLoadingDetail(true);
        setLoadingCollectiveStats(true);
        setError('');
        setSelectedUser(null);
        setStats(null);
        setCollectiveStats(null);

        try {
            const [detail, collective] = await Promise.all([
                getCourseDetail(courseId),
                getCourseCollectiveStats(courseId)
            ]);
            setSelectedCourse(detail);
            setCollectiveStats(collective);
        } catch (err) {
            console.error('Error al cargar el detalle del curso:', err);
            setError(resolveCourseInsightErrorMessage(err));
        } finally {
            setLoadingDetail(false);
            setLoadingCollectiveStats(false);
        }
    };

    const handleSelectUser = async (user: EnrolledUser) => {
        if (!selectedCourse) return;

        setSelectedUser(user);
        setLoadingStats(true);
        setError('');
        setStats(null);

        try {
            const data = await getCourseUserStats(selectedCourse.courseId, user.userId);
            setStats(data);
        } catch (err) {
            console.error('Error al cargar las estadísticas del usuario:', err);
            setError(resolveCourseInsightErrorMessage(err));
        } finally {
            setLoadingStats(false);
        }
    };

    return {
        keyword,
        setKeyword,
        results,
        selectedCourse,
        selectedUser,
        stats,
        collectiveStats,
        loadingSearch,
        loadingDetail,
        loadingStats,
        loadingCollectiveStats,
        highlightedResultIndex,
        error,
        handleSearch,
        handleSearchInputKeyDown,
        handleSelectCourse,
        handleSelectUser
    };
};