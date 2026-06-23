import { useState } from 'react';
import { X, Layers, BarChart, Clock, Check } from 'lucide-react';

interface InterestsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (preferences: { categories: string[]; levels: string[]; durations: string[] }) => void;
}

export const InterestsModal = ({ isOpen, onClose, onSave }: InterestsModalProps) => {
    // 1. DATOS GENÉRICOS DE PRUEBA (Fáciles de ampliar en el futuro)
    const availableCategories = ['Programación', 'Frontend', 'Backend', 'Arquitectura', 'Diseño UI/UX', 'Inteligencia Artificial', 'Ciberseguridad', 'Bases de Datos'];
    const availableLevels = ['Principiante (Básico)', 'Intermedio', 'Avanzado (Experto)', 'Todos los niveles'];
    const availableDurations = ['Corto (< 10 horas)', 'Medio (10 - 40 horas)', 'Largo (> 40 horas)'];

    // 2. ESTADOS LOCALES PARA GUARDAR LAS SELECCIONES DEL ALUMNO
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
    const [selectedLevels, setSelectedLevels] = useState<string[]>([]);
    const [selectedDurations, setSelectedDurations] = useState<string[]>([]);

    if (!isOpen) return null;

    // Funciones auxiliares genéricas para conmutar (toggle) los elementos seleccionados
    const toggleSelection = (item: string, list: string[], setList: React.Dispatch<React.SetStateAction<string[]>>) => {
        if (list.includes(item)) {
            setList(list.filter(i => i !== item));
        } else {
            setList([...list, item]);
        }
    };

    const handleSave = () => {
        onSave({
            categories: selectedCategories,
            levels: selectedLevels,
            durations: selectedDurations
        });
        onClose();
    };
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            {/* CONTENEDOR PRINCIPAL DEL MODAL */}
            <div className="bg-white w-full max-w-4xl rounded-2xl border border-slate-200 shadow-2xl flex flex-col max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-200">

                {/* CABECERA */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                    <div>
                        <h3 className="text-base font-bold text-slate-800">Ajustar mis Intereses y Preferencias</h3>
                        <p className="text-xs text-slate-500 font-medium">Selecciona los criterios para personalizar tus recomendaciones inteligentes</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 hover:bg-slate-200/70 text-slate-400 hover:text-slate-600 rounded-lg transition-colors cursor-pointer"
                        aria-label="Cerrar modal"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* CUERPO DEL MODAL CON LAS 3 COLUMNAS DE SCROLL INDEPENDIENTES */}
                <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6 overflow-hidden bg-white flex-1">

                    {/* SECCIÓN 1: CATEGORÍAS (Con Scroll) */}
                    <div className="flex flex-col h-full border border-slate-100 rounded-xl bg-slate-50/30 overflow-hidden">
                        <div className="flex items-center gap-2 p-3 border-b border-slate-100 bg-slate-50 text-slate-700 font-bold text-xs uppercase tracking-wider">
                            <Layers size={14} className="text-blue-500" />
                            <span>Categorías</span>
                        </div>
                        <div className="p-3 flex flex-col gap-1.5 overflow-y-auto max-h-[40vh] md:max-h-full flex-1 scrollbar-thin scrollbar-thumb-slate-200">
                            {availableCategories.map((cat) => {
                                const isSelected = selectedCategories.includes(cat);
                                return (
                                    <button
                                        key={cat}
                                        type="button"
                                        onClick={() => toggleSelection(cat, selectedCategories, setSelectedCategories)}
                                        className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center justify-between border cursor-pointer ${isSelected
                                                ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-sm'
                                                : 'bg-white border-slate-100 text-slate-600 hover:border-slate-300 hover:bg-slate-50/50'
                                            }`}
                                    >
                                        <span>{cat}</span>
                                        {isSelected && <Check size={14} className="text-blue-600 animate-in zoom-in-50 duration-200" />}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* SECCIÓN 2: NIVEL (Con Scroll) */}
                    <div className="flex flex-col h-full border border-slate-100 rounded-xl bg-slate-50/30 overflow-hidden">
                        <div className="flex items-center gap-2 p-3 border-b border-slate-100 bg-slate-50 text-slate-700 font-bold text-xs uppercase tracking-wider">
                            <BarChart size={14} className="text-amber-500" />
                            <span>Nivel de Dificultad</span>
                        </div>
                        <div className="p-3 flex flex-col gap-1.5 overflow-y-auto max-h-[40vh] md:max-h-full flex-1 scrollbar-thin scrollbar-thumb-slate-200">
                            {availableLevels.map((lvl) => {
                                const isSelected = selectedLevels.includes(lvl);
                                return (
                                    <button
                                        key={lvl}
                                        type="button"
                                        onClick={() => toggleSelection(lvl, selectedLevels, setSelectedLevels)}
                                        className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center justify-between border cursor-pointer ${isSelected
                                                ? 'bg-amber-50 border-amber-200 text-amber-700 shadow-sm'
                                                : 'bg-white border-slate-100 text-slate-600 hover:border-slate-300 hover:bg-slate-50/50'
                                            }`}
                                    >
                                        <span>{lvl}</span>
                                        {isSelected && <Check size={14} className="text-amber-600 animate-in zoom-in-50 duration-200" />}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* SECCIÓN 3: DURACIÓN (Con Scroll) */}
                    <div className="flex flex-col h-full border border-slate-100 rounded-xl bg-slate-50/30 overflow-hidden">
                        <div className="flex items-center gap-2 p-3 border-b border-slate-100 bg-slate-50 text-slate-700 font-bold text-xs uppercase tracking-wider">
                            <Clock size={14} className="text-emerald-500" />
                            <span>Duración Estimada</span>
                        </div>
                        <div className="p-3 flex flex-col gap-1.5 overflow-y-auto max-h-[40vh] md:max-h-full flex-1 scrollbar-thin scrollbar-thumb-slate-200">
                            {availableDurations.map((dur) => {
                                const isSelected = selectedDurations.includes(dur);
                                return (
                                    <button
                                        key={dur}
                                        type="button"
                                        onClick={() => toggleSelection(dur, selectedDurations, setSelectedDurations)}
                                        className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center justify-between border cursor-pointer ${isSelected
                                                ? 'bg-emerald-50 border-emerald-200 text-emerald-700 shadow-sm'
                                                : 'bg-white border-slate-100 text-slate-600 hover:border-slate-300 hover:bg-slate-50/50'
                                            }`}
                                    >
                                        <span>{dur}</span>
                                        {isSelected && <Check size={14} className="text-emerald-600 animate-in zoom-in-50 duration-200" />}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                </div>

                {/* PIE DEL MODAL CON BOTONES DE ACCIÓN */}
                <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-bold uppercase tracking-wide hover:bg-slate-50 active:scale-95 transition-all cursor-pointer"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        className="px-5 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold uppercase tracking-wide hover:bg-slate-700 active:scale-95 transition-all shadow-md cursor-pointer"
                    >
                        Guardar Preferencias
                    </button>
                </div>

            </div>
        </div>
    );
};
