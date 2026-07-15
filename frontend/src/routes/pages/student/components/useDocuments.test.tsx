import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useDocuments } from './useDocuments';
import {
    getAdminsDirectory,
    getClassmatesDirectory,
    getSentDocuments,
    getTeachersDirectory,
    getUserDocuments,
} from '../../../../services/documentService';

vi.mock('../../../../services/documentService', () => ({
    getUserDocuments: vi.fn(),
    getSentDocuments: vi.fn(),
    uploadStudentDocument: vi.fn(),
    getTeachersDirectory: vi.fn(),
    getClassmatesDirectory: vi.fn(),
    getAdminsDirectory: vi.fn(),
    downloadDocumentSecure: vi.fn(),
}));

describe('useDocuments', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(getUserDocuments).mockResolvedValue([]);
        vi.mocked(getSentDocuments).mockResolvedValue([]);
        vi.mocked(getTeachersDirectory).mockResolvedValue([]);
        vi.mocked(getClassmatesDirectory).mockResolvedValue([]);
        vi.mocked(getAdminsDirectory).mockResolvedValue([]);
    });

    it('mantiene compañeros disponibles aunque falle otro subdirectorio', async () => {
        vi.mocked(getTeachersDirectory).mockRejectedValue(new Error('teachers unavailable'));
        vi.mocked(getClassmatesDirectory).mockResolvedValue([
            { userId: 7, username: 'ana_student', email: 'ana@tfg.com', role: 'STUDENT' },
        ]);
        vi.mocked(getAdminsDirectory).mockResolvedValue([
            { userId: 1, username: 'admin_root', email: 'admin@tfg.com', role: 'ADMIN' },
        ]);

        const { result } = renderHook(() => useDocuments());

        await waitFor(() => {
            expect(result.current.loadingDirectory).toBe(false);
        });

        expect(result.current.documentError).toBe('');
        expect(result.current.directory).toEqual([
            { userId: 7, username: 'ana_student', email: 'ana@tfg.com', role: 'STUDENT' },
            { userId: 1, username: 'admin_root', email: 'admin@tfg.com', role: 'ADMIN' },
        ]);
    });
});