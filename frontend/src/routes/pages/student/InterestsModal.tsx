// frontend/src/routes/pages/student/components/InterestsModal.tsx (Parte 1 de 2)

import { useState, useEffect } from 'react';
import { X, Layers, BarChart, Clock, Globe, Subtitles, Check, Loader2 } from 'lucide-react';
import { apiClient } from '@/services/apiClient';
import { useAuth } from '@/auth';
import GenericButton from "../../../components/ui/genericButton/GenericButton";


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
    const { user, updateUser } = useAuth();
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

    // 3. HIDRATACIÓN SÍNCRONA DESDE EL CONTRATO INICIAL DE SESIÓN (ADR-28)
    useEffect(() => {
        if (isOpen) {
            const sessionInterests = user?.interests;
            setSelectedCategories(sessionInterests?.categories || []);
            setSelectedLevels(sessionInterests?.levels || []);
            setSelectedDurations(sessionInterests?.durations || []);
            setSelectedLanguages(sessionInterests?.languages || []);
            setSelectedSubtitles(sessionInterests?.subtitles || []);
        }
    }, [isOpen, user?.interests]);

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
            updateUser({ interests: payload });
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
                    <GenericButton
                        variant="search"
                        onClick={onClose}
                        icon={<X size={20} className="text-slate-400" />}
                        className="p-2! hover:bg-slate-200"
                    />
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
                            {availableCategories.map(cat => {
                                const isSelected = selectedCategories.includes(cat);
                                return (
                                    <GenericButton
                                        key={cat}
                                        variant="category"
                                        label={cat}
                                        isActive={isSelected}
                                        icon={isSelected ? <Check size={14} className="text-emerald-600" /> : undefined}
                                        onClick={() => toggleSelection(cat, selectedCategories, setSelectedCategories)}
                                        className={isSelected ? "bg-emerald-100! text-emerald-700! border-emerald-300!" : ""}
                                    />
                                );
                            })}
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
                                {availableLevels.map(level => {
                                    const isSelected = selectedLevels.includes(level);
                                    return (
                                        <GenericButton
                                            key={level}
                                            variant="category"
                                            label={level}
                                            isActive={isSelected}
                                            icon={isSelected ? <Check size={14} className="text-emerald-600" /> : undefined}
                                            onClick={() => toggleSelection(level, selectedLevels, setSelectedLevels)}
                                            className={isSelected ? "bg-emerald-100! text-emerald-700! border-emerald-300!" : ""}
                                        />
                                    );
                                })}
                            </div>
                        </section>

                        {/* DURACIÓN */}
                        <section className="space-y-4">
                            <div className="flex items-center gap-2 text-amber-600">
                                <Clock size={18} />
                                <h3 className="font-bold text-sm uppercase tracking-wider">Disponibilidad de Tiempo</h3>
                            </div>
                            <div className="grid grid-cols-1 gap-2">
                                {availableDurations.map(dur => {
                                    const isSelected = selectedDurations.includes(dur);
                                    return (
                                        <GenericButton
                                            key={dur}
                                            variant="category"
                                            label={dur}
                                            isActive={isSelected}
                                            icon={isSelected ? <Check size={14} className="text-emerald-600" /> : undefined}
                                            onClick={() => toggleSelection(dur, selectedDurations, setSelectedDurations)}
                                            className={isSelected ? "bg-emerald-100! text-emerald-700! border-emerald-300!" : ""}
                                        />
                                    );
                                })}
                            </div>
                        </section>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* IDIOMAS */}
                        <section className="space-y-4">
                            <div className="flex items-center gap-2 text-indigo-600">
                                <Globe size={18} />
                                <h3 className="font-bold text-sm uppercase tracking-wider">Idioma del Curso</h3>
                            </div>
                            <div className="grid grid-cols-1 gap-2">
                                {availableLanguages.map(lang => {
                                    const isSelected = selectedLanguages.includes(lang);
                                    return (
                                        <GenericButton
                                            key={lang}
                                            variant="category"
                                            label={lang}
                                            isActive={isSelected}
                                            icon={isSelected ? <Check size={14} className="text-emerald-600" /> : undefined}
                                            onClick={() => toggleSelection(lang, selectedLanguages, setSelectedLanguages)}
                                            className={isSelected ? "bg-emerald-100! text-emerald-700! border-emerald-300!" : ""}
                                        />
                                    );
                                })}
                            </div>
                        </section>

                        {/* SUBTÍTULOS */}
                        <section className="space-y-4">
                            <div className="flex items-center gap-2 text-purple-600">
                                <Subtitles size={18} />
                                <h3 className="font-bold text-sm uppercase tracking-wider">Preferencias de Subtítulos</h3>
                            </div>
                            <div className="grid grid-cols-1 gap-2">
                                {availableSubtitles.map(sub => {
                                    const isSelected = selectedSubtitles.includes(sub);
                                    return (
                                        <GenericButton
                                            key={sub}
                                            variant="category"
                                            label={sub}
                                            isActive={isSelected}
                                            icon={isSelected ? <Check size={14} className="text-emerald-600" /> : undefined}
                                            onClick={() => toggleSelection(sub, selectedSubtitles, setSelectedSubtitles)}
                                            className={isSelected ? "bg-emerald-100! text-emerald-700! border-emerald-300!" : ""}
                                        />
                                    );
                                })}
                            </div>
                        </section>
                    </div>
                </div>
                {/* ACCIONES DEL MODAL MIGRADAS A GENERICBUTTON [ADR-13] */}
                <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/50 shrink-0">

                    {/* Botón secundario Cancelar */}
                    <GenericButton
                        variant="white"
                        disabled={loading}
                        onClick={onClose}
                        label="Cancelar"
                        className="rounded-2xl text-xs font-bold px-6 py-2.5 shadow-sm bg-slate-200! hover:bg-slate-200!"
                    />

                    {/* Botón principal Guardar Preferencias */}
                    <GenericButton
                        variant="primary"
                        disabled={loading}
                        onClick={handleSave}
                        className="rounded-2xl text-xs font-bold px-6 py-2.5 shadow-sm bg-blue-600! hover:bg-blue-700!"
                        label={loading ? "Guardando..." : "Guardar Preferencias"}
                        icon={loading ? <Loader2 className="animate-spin" size={14} /> : <Check size={14} />}
                    />
                </div>
            </div>
        </div>
    );
};
