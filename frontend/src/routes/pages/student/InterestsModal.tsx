import { useState } from 'react';
import { X, Layers, BarChart, Clock, Globe, Subtitles, Check } from 'lucide-react';

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
    // 1. LISTAS DE DATOS ORIGINALES AMPLIADAS
    const availableCategories = ['Ciencia de Datos', 'Negocios', 'Tecnología de la Información', 'Ciencias de la Computación', 'Artes y Humanidades', 'Aprendizaje de Idiomas', 'Desarrollo Personal', 'Salud', 'Ciencias Sociales', 'Ciencias Físicas e Ingeniería', 'Matemáticas y Lógica'];
    const availableLevels = ['Principiante / Básico', 'Medio / Intermedio', 'Avanzado / Experto', 'Todos los niveles'];
    const availableDurations = ['Corto (< 1 semana)', 'Medio (1 - 6 semanas)', 'Largo (> 6 semanas)'];
    const availableLanguages = ['Español', 'Inglés', 'Portugués', 'Alemán', 'Francés'];
    const availableSubtitles = ['Con Subtítulos', 'Sin Subtítulos', 'Subtítulos en Inglés', 'Subtítulos en Español'];

    // 2. ESTADOS LOCALES DE SELECCIÓN
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
    const [selectedLevels, setSelectedLevels] = useState<string[]>([]);
    const [selectedDurations, setSelectedDurations] = useState<string[]>([]);
    const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
    const [selectedSubtitles, setSelectedSubtitles] = useState<string[]>([]);

    if (!isOpen) return null;

    const toggleSelection = (item: string, list: string[], setList: React.Dispatch<React.SetStateAction<string[]>>) => {
        setList(list.includes(item) ? list.filter(i => i !== item) : [...list, item]);
    };

    const handleSave = () => {
        onSave({
            categories: selectedCategories,
            levels: selectedLevels,
            durations: selectedDurations,
            languages: selectedLanguages,
            subtitles: selectedSubtitles
        });
        onClose();
    };

    // 🛠️ SUB-COMPONENTE INTERNO GENÉRICO PARA EVITAR CÓDIGO REPETIDO Y CORTES DE TEXTO
    const renderColumn = (
        title: string,
        icon: React.ReactNode,
        items: string[],
        currentSelection: string[],
        setSelection: React.Dispatch<React.SetStateAction<string[]>>,
        borderColorClass: string
    ) => (
        <div className="flex flex-col h-full border border-slate-100 rounded-xl bg-slate-50/30 overflow-hidden">
            <div className="flex items-center gap-2 p-3 border-b border-slate-100 bg-slate-50 text-slate-700 font-bold text-xs uppercase tracking-wider">
                {icon}
                <span>{title}</span>
            </div>
            <div className="p-3 flex flex-col gap-1.5 overflow-y-auto max-h-[25vh] lg:max-h-full flex-1 scrollbar-thin scrollbar-thumb-slate-200">
                {items.map((item) => {
                    const isSelected = currentSelection.includes(item);
                    return (
                        <button
                            key={item}
                            type="button"
                            onClick={() => toggleSelection(item, currentSelection, setSelection)}
                            className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center justify-between border cursor-pointer ${isSelected
                                ? `${borderColorClass} shadow-sm`
                                : 'bg-white border-slate-100 text-slate-600 hover:border-slate-300 hover:bg-slate-50/50'
                                }`}
                        >
                            <span className="truncate pr-1">{item}</span>
                            {isSelected && <Check size={14} className="shrink-0 animate-in zoom-in-50 duration-200" />}
                        </button>
                    );
                })}
            </div>
        </div>
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-7xl rounded-2xl border border-slate-200 shadow-2xl flex flex-col max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-200">

                {/* CABECERA */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                    <div>
                        <h3 className="text-base font-bold text-slate-800">Ajustar mis Intereses y Preferencias</h3>
                        <p className="text-xs text-slate-500 font-medium">Selecciona los criterios para personalizar tus recomendaciones inteligentes</p>
                    </div>
                    <button onClick={onClose} className="p-1.5 hover:bg-slate-200/70 text-slate-400 hover:text-slate-600 rounded-lg transition-colors cursor-pointer" aria-label="Cerrar modal">
                        <X size={18} />
                    </button>
                </div>

                {/* CUERPO ADAPTATIVO GENERADO POR COMPOSICIÓN LIMPIA DE 5 COLUMNAS */}
                <div className="p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 overflow-hidden bg-white flex-1">
                    {renderColumn("Categorías", <Layers size={14} className="text-blue-500" />, availableCategories, selectedCategories, setSelectedCategories, "bg-blue-50 border-blue-200 text-blue-700")}
                    {renderColumn("Nivel", <BarChart size={14} className="text-amber-500" />, availableLevels, selectedLevels, setSelectedLevels, "bg-amber-50 border-amber-200 text-amber-700")}
                    {renderColumn("Duración", <Clock size={14} className="text-emerald-500" />, availableDurations, selectedDurations, setSelectedDurations, "bg-emerald-50 border-emerald-200 text-emerald-700")}
                    {renderColumn("Idioma", <Globe size={14} className="text-purple-500" />, availableLanguages, selectedLanguages, setSelectedLanguages, "bg-purple-50 border-purple-200 text-purple-700")}
                    {renderColumn("Subtítulos", <Subtitles size={14} className="text-indigo-500" />, availableSubtitles, selectedSubtitles, setSelectedSubtitles, "bg-indigo-50 border-indigo-200 text-indigo-700")}
                </div>

                {/* PIE DEL MODAL CON BOTONES DE ACCIÓN */}
                <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
                    <button type="button" onClick={onClose} className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-bold uppercase tracking-wide hover:bg-slate-50 active:scale-95 transition-all cursor-pointer">
                        Cancelar
                    </button>
                    <button type="button" onClick={handleSave} className="px-5 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold uppercase tracking-wide hover:bg-slate-700 active:scale-95 transition-all shadow-md cursor-pointer">
                        Guardar Preferencias
                    </button>
                </div>

            </div>
        </div>
    );
};
