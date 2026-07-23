import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { resolveAvatarUrl } from './avatarUrl';

describe('avatarUrl - Suite de Pruebas Unitarias de Lógica Algorítmica Pura', () => {

    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        // CORRECCIÓN QUIRÚRGICA COMPILATORIA: Limpiar de forma segura todas las variables simuladas con stubs
        vi.unstubAllEnvs();
    });

    // --- BLOQUE 1: GESTIÓN DE VALORES NULOS Y FALLBACKS ---
    it('debe retornar undefined de forma inmediata si la ruta es nula, vacía o indefinida', () => {
        expect(resolveAvatarUrl(undefined)).toBeUndefined();
        expect(resolveAvatarUrl(null)).toBeUndefined();
        expect(resolveAvatarUrl('')).toBeUndefined();
    });

    // --- BLOQUE 2: DETECCIÓN DE URLS ABSOLUTAS EXTERNAS ---
    it.each([
        ['https://unsplash.com'],
        ['http://universidad.edu'],
        ['https://mi-storage.net']
    ])('debe retornar la misma URL absoluta de forma íntegra sin alterarla ("%s")', (absoluteUrl) => {
        expect(resolveAvatarUrl(absoluteUrl)).toBe(absoluteUrl);
    });

    // --- BLOQUE 3: EXPANSION DINÁMICA CON VARIABLES DE ENTORNO CONFIGURADAS ---
    it('debe componer la URL utilizando VITE_API_URL cuando está definida e inyectar el prefijo /uploads si falta', () => {
        // CORRECCIÓN QUIRÚRGICA COMPILATORIA: Uso de vi.stubEnv para inyectar valores en propiedades de solo lectura de forma legal
        vi.stubEnv('VITE_API_URL', 'https://tfg-proyecto.com');
        
        const result = resolveAvatarUrl('profiles/student42.png');
        
        expect(result).toBe('https://tfg-proyecto.com/uploads/profiles/student42.png');
    });

    it('debe respetar el prefijo si la ruta ya incluye /uploads/ evitando duplicarlo', () => {
        vi.stubEnv('VITE_API_URL', 'https://tfg-proyecto.com');
        
        const result = resolveAvatarUrl('/uploads/avatars/professor.png');
        
        expect(result).toBe('https://tfg-proyecto.com/uploads/avatars/professor.png');
    });

    // --- BLOQUE 4: SANEAMIENTO ADAPTATIVO DE BARRAS INCLINADAS (SLASHES) Y LOCAL FALLBACK ---
    it('debe recurrir al fallback local de localhost:8080 si VITE_API_URL es omitida o vacía', () => {
        vi.stubEnv('VITE_API_URL', '');
        
        const result = resolveAvatarUrl('admin-avatar.jpg');
        
        expect(result).toBe('http://localhost:8080/uploads/admin-avatar.jpg');
    });

    it('debe normalizar de forma matemática la ausencia de barra inclinada inicial en rutas que contienen uploads', () => {
        vi.stubEnv('VITE_API_URL', 'http://localhost:8080');
        
        const result = resolveAvatarUrl('uploads/user_hash.webp');
        
        expect(result).toBe('http://localhost:8080/uploads/user_hash.webp');
    });
});
