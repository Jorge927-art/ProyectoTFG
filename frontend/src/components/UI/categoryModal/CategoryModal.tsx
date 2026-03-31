import React from 'react';
import { X, BookOpen } from 'lucide-react';
import GenericButton from '../genericButton/GenericButton';

interface CategoryModalProps {
    isOpen: boolean;
    onClose: () => void;
}

// Categorías basadas en el dataset de 10,000 cursos del TFG [3, 6]
const CATEGORIES = [
    "Data Science", "Business", "Computer Science",
    "Health", "Social Sciences", "Arts and Humanities"
];

const CategoryModal: React.FC<CategoryModalProps> = ({ isOpen, onClose }) => {
    // Si no está abierto, no renderizamos nada (Lógica condicional)
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Fondo oscurecido con desenfoque (Backdrop) */}
            <div
                className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Contenedor del Modal */}
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-300">
                <div className="p-6">
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-2">
                            <BookOpen className="text-blue-600" size={24} />
                            <h2 className="text-xl font-bold text-gray-900">Explorar Estudios</h2>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                        >
                            <X size={20} className="text-gray-500" />
                            <span className="sr-only">Cerrar</span> {/* Accesibilidad */}
                        </button>
                    </div>

                    {/* Listado dinámico de categorías utilizando tu GenericButton */}
                    <div className="space-y-2">
                        {CATEGORIES.map((category) => (
                            <GenericButton
                                key={category}
                                text={category}
                                variant="category"
                                onClick={() => {
                                    console.log(`Filtrando por: ${category}`);
                                    onClose();
                                }}
                            />
                        ))}
                    </div>
                </div>

                <div className="bg-gray-50 p-4 flex justify-end">
                    <GenericButton
                        text="Cerrar"
                        onClick={onClose}
                        variant="white"
                    />
                </div>
            </div>
        </div>
    );
};

export default CategoryModal;