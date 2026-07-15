import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useDocuments } from './useDocuments';
import * as documentService from '../../../../services/documentService';

describe('useDocuments', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(documentService, 'getUserDocuments').mockResolvedValue([]);
        vi.spyOn(documentService, 'getSentDocuments').mockResolvedValue([]);
        vi.spyOn(documentService, 'getTeachersDirectory').mockResolvedValue([]);
        vi.spyOn(documentService, 'getClassmatesDirectory').mockResolvedValue([]);
        vi.spyOn(documentService, 'getAdminsDirectory').mockResolvedValue([]);
    });

    it('mantiene compañeros disponibles aunque falle otro subdirectorio', async () => {
        vi.spyOn(documentService, 'getTeachersDirectory').mockRejectedValue(new Error('teachers unavailable'));
        vi.spyOn(documentService, 'getClassmatesDirectory').mockResolvedValue([
            { userId: 7, username: 'ana_student', email: 'ana@tfg.com', role: 'STUDENT' },
        ]);
        vi.spyOn(documentService, 'getAdminsDirectory').mockResolvedValue([
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