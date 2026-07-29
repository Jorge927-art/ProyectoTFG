import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../../../../services/apiClient';
import { useAuth } from '../../../../auth/useAuth';
import { readStoredAuthUser, readStoredToken } from '../../../../auth/authStorage';
import type { EnrollmentInfo } from '../../../../services/courseTypes';

type EnrollmentApiRecord = Record<string, unknown>;
type AuthMeResponse = {
    username?: string;
};
type EnrollmentApiPayload =
    | EnrollmentApiRecord[]
    | {
        enrollments?: EnrollmentApiRecord[];
        data?: EnrollmentApiRecord[];
        items?: EnrollmentApiRecord[];
        content?: EnrollmentApiRecord[];
    };

type LoadAttempt = {
    source: 'token' | 'username' | 'user-id' | 'canonical-username';
    username?: string;
    userId?: number;
};

const normalizeEnrollmentsPayload = (payload: EnrollmentApiPayload | null | undefined): EnrollmentApiRecord[] => {
    if (Array.isArray(payload)) {
        return payload;
    }

    if (payload && typeof payload === 'object') {
        const candidates = [payload.enrollments, payload.data, payload.items, payload.content];
        const resolved = candidates.find(Array.isArray);
        if (resolved) {
            return resolved;
        }
    }

    return [];
};

const sanitizeUsername = (value: unknown): string | null => {
    if (typeof value !== 'string') {
        return null;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
};

const decodeJwtPayload = (token: string): Record<string, unknown> | null => {
    try {
        const parts = token.split('.');
        if (parts.length < 2) {
            return null;
        }

        const payloadPart = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        const padLength = (4 - (payloadPart.length % 4)) % 4;
        const padded = payloadPart + '='.repeat(padLength);
        const decoded = typeof atob === 'function' ? atob(padded) : '';

        if (!decoded) {
            return null;
        }

        const parsed = JSON.parse(decoded);
        return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null;
    } catch {
        return null;
    }
};

const normalizeEnrollmentRecord = (enrollment: EnrollmentApiRecord): EnrollmentInfo => {
    const courseData = (enrollment.course || enrollment.courses || enrollment) as Record<string, unknown>;
    const normalizeGrades = (rawGrades: unknown): EnrollmentInfo['grades'] => {
        if (!Array.isArray(rawGrades)) {
            return [];
        }

        return rawGrades
            .map((grade) => {
                if (!grade || typeof grade !== 'object') {
                    return null;
                }

                const gradeRecord = grade as Record<string, unknown>;
                const title = String(gradeRecord.title || '').trim();
                const scoreValue = gradeRecord.score;
                const score = typeof scoreValue === 'number' || typeof scoreValue === 'bigint'
                    ? String(scoreValue)
                    : String(scoreValue || '').trim();

                if (!title || !score) {
                    return null;
                }

                return { title, score };
            })
            .filter((grade): grade is NonNullable<typeof grade> => grade !== null);
    };

    const rawEnrollmentId =
        enrollment.enrollmentid
        ?? enrollment.enrollmentId
        ?? enrollment.enrollment_id
        ?? enrollment.id;
    const enrollmentId = Number(rawEnrollmentId ?? 0);
    const safeCourseId = Number(courseData.course_id || courseData.id || 0);
    const resolvedEnrollmentId = Number.isFinite(enrollmentId) && enrollmentId > 0
        ? enrollmentId
        : Number.isFinite(safeCourseId) && safeCourseId > 0
            ? safeCourseId
            : 0;

    return {
        enrollmentid: resolvedEnrollmentId,
        enrolled_at: String(enrollment.enrolled_at || new Date().toISOString()),
        started_at: enrollment.started_at || enrollment.startedAt
            ? String(enrollment.started_at || enrollment.startedAt)
            : null,
        status: String(enrollment.status || 'EN_PROGRESO'),
        progress_percentage: Number(enrollment.progress_percentage ?? enrollment.progress ?? 0),
        course: {
            course_id: Number.isFinite(safeCourseId) ? safeCourseId : 0,
            title: String(courseData.title || ''),
            category: String(courseData.category || 'General'),
            instructors: String(courseData.instructors || 'Por asignar'),
            duration: Number(courseData.duration || 0)
        },
        grades: normalizeGrades(enrollment.grades ?? enrollment.course_grades ?? enrollment.courseGrades)
    };
};

export const useEnrolledCourses = (successTrigger: string) => {
    const { user } = useAuth();
    const [enrolledList, setEnrolledList] = useState<EnrollmentInfo[]>([]);
    const [loadingEnrollments, setLoadingEnrollments] = useState<boolean>(false);
    const [enrollmentError, setEnrollmentError] = useState<string>('');

    const fetchStudentEnrollments = useCallback(async () => {
        setLoadingEnrollments(true);
        setEnrollmentError('');

        try {
            const storedUser = readStoredAuthUser();
            const localUsername = sanitizeUsername(user?.username)
                ?? sanitizeUsername(storedUser?.username);
            const localUserId = typeof user?.userId === 'number' && Number.isFinite(user.userId)
                ? user.userId
                : typeof storedUser?.userId === 'number' && Number.isFinite(storedUser.userId)
                    ? storedUser.userId
                    : null;

            const token = readStoredToken();
            const tokenPayload = token ? decodeJwtPayload(token) : null;
            const tokenSubject = sanitizeUsername(tokenPayload?.sub);
            const tokenEmail = sanitizeUsername(tokenPayload?.email);

            const attempts: LoadAttempt[] = [{ source: 'token' }];
            const attemptedIdentities = new Set<string>();

            if (localUsername) {
                attempts.push({ source: 'username', username: localUsername });
                attemptedIdentities.add(localUsername.toLowerCase());
            }

            if (tokenSubject && !attemptedIdentities.has(tokenSubject.toLowerCase())) {
                attempts.push({ source: 'username', username: tokenSubject });
                attemptedIdentities.add(tokenSubject.toLowerCase());
            }

            if (tokenEmail && !attemptedIdentities.has(tokenEmail.toLowerCase())) {
                attempts.push({ source: 'username', username: tokenEmail });
                attemptedIdentities.add(tokenEmail.toLowerCase());
            }

            if (localUserId && localUserId > 0) {
                attempts.push({ source: 'user-id', userId: localUserId });
            }

            let recoveredPayload: EnrollmentApiRecord[] = [];
            let attemptsFailedByTransport = false;

            for (const attempt of attempts) {
                try {
                    const response = attempt.source === 'token'
                        ? await apiClient.get<EnrollmentApiPayload>('/api/auth/my-active-courses')
                        : attempt.source === 'user-id'
                            ? await apiClient.get<EnrollmentApiPayload>('/api/auth/my-active-courses', {
                                params: { userId: attempt.userId }
                            })
                            : await apiClient.get<EnrollmentApiPayload>('/api/auth/my-active-courses', {
                                params: { username: attempt.username }
                            });

                    const attemptPayload = response.status === 200 && response.data
                        ? normalizeEnrollmentsPayload(response.data)
                        : [];

                    if (attemptPayload.length > 0) {
                        recoveredPayload = attemptPayload;
                        break;
                    }
                } catch {
                    attemptsFailedByTransport = true;
                }
            }

            const shouldAttemptCanonicalLookup = recoveredPayload.length === 0 && !tokenSubject && !tokenEmail;

            if (shouldAttemptCanonicalLookup) {
                try {
                    const meResponse = await apiClient.get<AuthMeResponse>('/api/auth/me');
                    const canonicalUsername = sanitizeUsername(meResponse.data?.username);

                    if (canonicalUsername && !attemptedIdentities.has(canonicalUsername.toLowerCase())) {
                        const canonicalResponse = await apiClient.get<EnrollmentApiPayload>('/api/auth/my-active-courses', {
                            params: { username: canonicalUsername }
                        });

                        recoveredPayload = canonicalResponse.status === 200 && canonicalResponse.data
                            ? normalizeEnrollmentsPayload(canonicalResponse.data)
                            : [];
                    }
                } catch {
                    // Fallback opcional no bloqueante.
                }
            }

            const validEnrollments = recoveredPayload
                .map(normalizeEnrollmentRecord)
                .filter((enrollment) => enrollment.enrollmentid > 0);

            if (validEnrollments.length === 0 && attemptsFailedByTransport) {
                setEnrollmentError('No se pudieron sincronizar tus asignaturas activas desde PostgreSQL.');
            }

            setEnrolledList(validEnrollments);
        } catch (err) {
            console.error('Error crítico en la pasarela HTTP de matrículas:', err);
            setEnrollmentError('No se pudieron sincronizar tus asignaturas activas desde PostgreSQL.');
            setEnrolledList([]);
        } finally {
            setLoadingEnrollments(false);
        }
    }, [user?.username]);

    useEffect(() => {
        fetchStudentEnrollments();
    }, [successTrigger, fetchStudentEnrollments]);

    const injectLocalEnrollment = () => {
        fetchStudentEnrollments();
    };

    return {
        enrolledList,
        loadingEnrollments,
        enrollmentError,
        injectLocalEnrollment,
        fetchStudentEnrollments
    };
};
