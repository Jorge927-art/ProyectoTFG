// frontend/src/routes/pages/student/components/InterestsModal.tsx (Parte 1 de 2)

import { useState, useEffect } from 'react';
import { X, Layers, BarChart, Clock, Globe, Subtitles, Check, Loader2 } from 'lucide-react';
import { apiClient } from '@/services/apiClient';

interface InterestsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (preferences: {
        categories: string[];
        levels: string[];
        durations: string[];
        languages: string[];
        subtitles: string[];
    }) => void;
}

export const InterestsModal = ({ isOpen, onClose, onSave }: InterestsModalProps) => {
    // 1. LISTAS DE DATOS ORIGINALES (Sincronizadas con el catálogo) [3]
    const availableCategories = ['Ciencia de Datos', 'Negocios', 'Tecnología de la Información', 'Ciencias de la Computación', 'Artes y Humanidades', 'Aprendizaje de Idiomas', 'Desarrollo Personal', 'Salud', 'Ciencias Sociales', 'Ciencias Físicas e Ingeniería', 'Matemáticas y Lógica'];
    const availableLevels = ['Principiante / Básico', 'Medio / Intermedio', 'Avanzado / Experto', 'Todos los niveles'];
    const availableDurations = ['Corto (< 1 semana)', 'Medio (1 - 6 semanas)', 'Largo (> 6 semanas)'];
    const availableLanguages = ['Español', 'Inglés', 'Portugués', 'Alemán', 'Francés'];
    const availableSubtitles = ['Con Subtítulos', 'Sin Subtítulos', 'Subtítulos en Inglés', 'Subtítulos en Español'];

    // 2. ESTADOS LOCALES PARA LA SELECCIÓN
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
    const [selectedLevels, setSelectedLevels] = useState<string[]>([]);
    const [selectedDurations, setSelectedDurations] = useState<string[]>([]);
    const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
    const [selectedSubtitles, setSelectedSubtitles] = useState<string[]>([]);

    // Estado de carga para feedback visual y evitar doble post
    const [loading, setLoading] = useState(false);

    // 3. HIDRATACIÓN DE PREFERENCIAS CON DOBLE CORTOCIRCUITO DEFENSIVO
    useEffect(() => {
        const token = localStorage.getItem('token');

        if (isOpen && token) {
            const fetchCurrentInterests = async () => {
                try {
                    const response = await apiClient.get('/api/auth/my-interests');
                    if (response.data) {
                        // Mapeo desde los nombres del InterestDTO [5]
                        setSelectedCategories(response.data.categories || []);
                        setSelectedLevels(response.data.levels || []);
                        setSelectedDurations(response.data.durations || []);
                        setSelectedLanguages(response.data.languages || []);
                        setSelectedSubtitles(response.data.subtitles || []);
                    }
                } catch (err) {
                    console.error("Error al hidratar intereses:", err);
                }
            };
            fetchCurrentInterests();
        }
    }, [isOpen]);

    // 4. LÓGICA DE SELECCIÓN (Toggle)
    const toggleSelection = (item: string, currentList: string[], setList: (val: string[]) => void) => {
        if (currentList.includes(item)) {
            setList(currentList.filter(i => i !== item));
        } else {
            setList([...currentList, item]);
        }
    };

    // 5. ENVIAR DATOS A POSTGRESQL CON PREVENCIÓN DE CONCURRENCIA
    const handleSave = async () => {
        setLoading(true);
        try {
            const payload = {
                categories: selectedCategories,
                levels: selectedLevels,
                durations: selectedDurations,
                languages: selectedLanguages,
                subtitles: selectedSubtitles
            };

            await apiClient.post('/api/auth/my-interests', payload);
            onSave(payload);
            onClose();
        } catch (error) {
            console.error("Error al guardar intereses:", error);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;
    // frontend/src/routes/pages/student/components/InterestsModal.tsx (Parte 2 - Bloque A)

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden border border-slate-100">

                {/* CABECERA */}
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div>
                        <h2 className="text-xl font-black text-slate-800 tracking-tight">Personaliza tu Experiencia</h2>
                        <p className="text-slate-500 text-xs font-medium">Ajusta tus preferencias para mejorar el motor de recomendaciones.</p>
                    </div>
                    <button onClick={onClose}
                        aria-label="Cerrar Modal"
                        className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400">
                        <X size={20} />
                    </button>
                </div>

                {/* CONTENIDO SCROLLABLE */}
                <div className="p-6 overflow-y-auto space-y-8 custom-scrollbar">

                    {/* SECCIÓN CATEGORÍAS */}
                    <section className="space-y-4">
                        <div className="flex items-center gap-2 text-blue-600">
                            <Layers size={18} />
                            <h3 className="font-bold text-sm uppercase tracking-wider">Áreas de Interés</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {availableCategories.map(cat => (
                                <label key={cat} className="flex items-center gap-3 p-3 rounded-2xl border border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors">
                                    <input
                                        type="checkbox"
                                        checked={selectedCategories.includes(cat)}
                                        onChange={() => toggleSelection(cat, selectedCategories, setSelectedCategories)}
                                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="text-xs font-semibold text-slate-700">{cat}</span>
                                </label>
                            ))}
                        </div>
                    </section>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* NIVELES */}
                        <section className="space-y-4">
                            <div className="flex items-center gap-2 text-emerald-600">
                                <BarChart size={18} />
                                <h3 className="font-bold text-sm uppercase tracking-wider">Nivel de Dificultad</h3>
                            </div>
                            <div className="grid grid-cols-1 gap-2">
                                {availableLevels.map(level => (
                                    <label key={level} className="flex items-center gap-3 p-3 rounded-2xl border border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors">
                                        <input
                                            type="checkbox"
                                            checked={selectedLevels.includes(level)}
                                            onChange={() => toggleSelection(level, selectedLevels, setSelectedLevels)}
                                            className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                        />
                                        <span className="text-xs font-semibold text-slate-700">{level}</span>
                                    </label>
                                ))}
                            </div>
                        </section>

                        {/* DURACIÓN */}
                        <section className="space-y-4">
                            <div className="flex items-center gap-2 text-amber-600">
                                <Clock size={18} />
                                <h3 className="font-bold text-sm uppercase tracking-wider">Disponibilidad de Tiempo</h3>
                            </div>
                            <div className="grid grid-cols-1 gap-2">
                                {availableDurations.map(dur => (
                                    <label key={dur} className="flex items-center gap-3 p-3 rounded-2xl border border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors">
                                        <input
                                            type="checkbox"
                                            checked={selectedDurations.includes(dur)}
                                            onChange={() => toggleSelection(dur, selectedDurations, setSelectedDurations)}
                                            className="w-4 h-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                                        />
                                        <span className="text-xs font-semibold text-slate-700">{dur}</span>
                                    </label>
                                ))}
                            </div>
                        </section>
                    </div>
// frontend/src/routes/pages/student/components/InterestsModal.tsx (Parte 2 - Bloque B)

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* IDIOMAS */}
                        <section className="space-y-4">
                            <div className="flex items-center gap-2 text-indigo-600">
                                <Globe size={18} />
                                <h3 className="font-bold text-sm uppercase tracking-wider">Idioma del Curso</h3>
                            </div>
                            <div className="grid grid-cols-1 gap-2">
                                {availableLanguages.map(lang => (
                                    <label key={lang} className="flex items-center gap-3 p-3 rounded-2xl border border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors">
                                        <input
                                            type="checkbox"
                                            checked={selectedLanguages.includes(lang)}
                                            onChange={() => toggleSelection(lang, selectedLanguages, setSelectedLanguages)}
                                            className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                        />
                                        <span className="text-xs font-semibold text-slate-700">{lang}</span>
                                    </label>
                                ))}
                            </div>
                        </section>

                        {/* SUBTÍTULOS */}
                        <section className="space-y-4">
                            <div className="flex items-center gap-2 text-purple-600">
                                <Subtitles size={18} />
                                <h3 className="font-bold text-sm uppercase tracking-wider">Preferencias de Subtítulos</h3>
                            </div>
                            <div className="grid grid-cols-1 gap-2">
                                {availableSubtitles.map(sub => (
                                    <label key={sub} className="flex items-center gap-3 p-3 rounded-2xl border border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors">
                                        <input
                                            type="checkbox"
                                            checked={selectedSubtitles.includes(sub)}
                                            onChange={() => toggleSelection(sub, selectedSubtitles, setSelectedSubtitles)}
                                            className="w-4 h-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                                        />
                                        <span className="text-xs font-semibold text-slate-700">{sub}</span>
                                    </label>
                                ))}
                            </div>
                        </section>
                    </div>
                </div>

                {/* ACCIONES DEL MODAL */}
                <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/50 shrink-0">
                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="px-5 py-2.5 rounded-2xl text-xs font-bold text-slate-500 hover:bg-slate-100 transition-colors disabled:opacity-50"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={loading}
                        className="px-6 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm flex items-center gap-2 transition-colors disabled:opacity-50"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="animate-spin" size={14} />
                                Guardando...
                            </>
                        ) : (
                            <>
                                <Check size={14} />
                                Guardar Preferencias
                            </>
                        )}
                    </button>
                </div>

            </div>
        </div>
    );
};
