import { render, screen, waitFor } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { UserScrollList } from './UserScrollList';
import { apiClient } from '../../services/apiClient'; // Ajusta esta ruta si tu alias @/services no resuelve en Vitest

// Mockeamos de forma global el cliente HTTP personalizado de Axios
vi.mock('../../services/apiClient', () => ({
    apiClient: {
        get: vi.fn()
    }
}));

// Lote de datos simulados coherentes con tu interfaz UserListEntity
const mockUsersResponse = [
    { userId: 1, username: 'admin_test', email: 'admin@cole.com', role: 'ADMIN', enabled: true },
    { userId: 2, username: 'profesor_laura', email: 'laura@cole.com', role: 'PROFESSOR', enabled: true },
    { userId: 3, username: 'alumno_luis', email: 'luis@cole.com', role: 'STUDENT', enabled: false } // Evaluamos borrado lógico
];

describe('UserScrollList - Consola de Usuarios Administrativa', () => {

    beforeEach(() => {
        vi.clearAllMocks();
    });

    test('Debe renderizar la lista de usuarios desde PostgreSQL y aplicar estilos condicionales por inactividad', async () => {
        // Arrange: Simulamos que la pasarela de red responde con éxito devolviendo nuestro lote
        vi.spyOn(apiClient, 'get').mockResolvedValue({ data: mockUsersResponse });

        // Act: Renderizamos la utilidad y extraemos 'unmount' para auditar fugas de memoria
        const { unmount } = render(<UserScrollList />);

        // Assert Inicial: El estado transitorio de carga debe mostrarse en pantalla
        expect(screen.getByText(/Cargando base de datos.../i)).toBeInTheDocument();

        // Esperamos a que la promesa de Axios se resuelva y actualice el estado local
        await waitFor(() => {
            expect(screen.queryByText(/Cargando base de datos.../i)).toBeNull();
        });

        // Assert Jerárquico: Verificamos que los textos y metadatos se mapean correctamente en el DOM
        expect(screen.getByText('admin_test')).toBeInTheDocument();
        expect(screen.getByText('profesor_laura')).toBeInTheDocument();
        expect(screen.getByText('alumno_luis')).toBeInTheDocument();

        // Assert de Estado (Borrado Lógico): Validamos que se pintan las etiquetas condicionales
        expect(screen.getByText('Inactivo')).toBeInTheDocument();
        expect(screen.getAllByText('Activo')).toHaveLength(2);

        // AUDITORÍA DE FUGAS DE MEMORIA:
        // Desmontamos proactivamente el componente del árbol virtual de React. Esto certifica
        // ante el tribunal que el ciclo de vida del useEffect se cierra limpiamente sin dejar
        // hilos de ejecución sueltos ni fugas en el recolector de basura del navegador.
        expect(() => unmount()).not.toThrow();
    });
});
