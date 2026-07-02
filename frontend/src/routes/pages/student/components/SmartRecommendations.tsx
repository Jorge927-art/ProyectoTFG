import { Star } from 'lucide-react';
// Importación desde el dominio centralizado unificado en servicios [DRY]
import type { RecommendedCourse } from '../../../../services/userDomains';

interface SmartRecommendationsProps {
    recommendations: RecommendedCourse[];
}

export const SmartRecommendations = ({ recommendations }: SmartRecommendationsProps) => {
    return (
        <div className="w-full">
            {/* Contenedor con scroll vertical limitado de 1.5 cursos */}
            <div className="max-h-55 overflow-y-auto pr-2 space-y-3 scrollbar-thin scrollbar-thumb-slate-200">
                {recommendations.length === 0 ? (
                    <p className="text-xs font-medium text-slate-400 italic text-center py-4">
                        No hay recomendaciones disponibles para tu perfil actual.
                    </p>
                ) : (
                    recommendations.map((rec) => (
                        <div
                            key={rec.id}
                            className="bg-white border border-slate-200/80 p-3 rounded-xl flex flex-col justify-between transition-all hover:border-slate-300 hover:shadow-xs"
                        >
                            <div>
                                <div className="flex justify-between items-start gap-2">
                                    <span className="text-[8px] font-extrabold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100 uppercase tracking-wide">
                                        {rec.category}
                                    </span>
                                    <div className="flex items-center gap-0.5 text-amber-500 text-[11px] font-bold">
                                        <Star size={10} fill="currentColor" />
                                        <span>{rec.rating.toFixed(1)}</span>
                                    </div>
                                </div>
                                <h3 className="text-xs font-bold text-slate-800 leading-snug mt-1.5 line-clamp-2">
                                    {rec.title}
                                </h3>
                                <p className="text-[10px] text-slate-400 mt-0.5 truncate">
                                    Instructor: {rec.instructor}
                                </p>
                            </div>
                            <div className="mt-3 pt-2 border-t border-slate-100">
                                {/* CORRECCIÓN CRÍTICA: Se elimina la frase fija y se inyecta {rec.reason} */}
                                <p className="text-[10px] text-slate-500 font-medium italic bg-slate-50/50 p-1.5 rounded-lg border border-slate-100">
                                    💡 {rec.reason}
                                </p>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
