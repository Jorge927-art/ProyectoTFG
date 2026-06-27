import { Sparkles, Star } from 'lucide-react';

export interface RecommendedCourse {
    id: number;
    title: string;
    instructor: string;
    category: string;
    rating: number;
    reason: string;
}

interface SmartRecommendationsProps {
    recommendations: RecommendedCourse[];
}

export const SmartRecommendations = ({ recommendations }: SmartRecommendationsProps) => {
    return (
        <div className="bg-white p-5 rounded-xl border border-slate-200 text-slate-800 shadow-sm">
            <h2 className="text-base font-bold flex items-center gap-2 mb-1">
                <Sparkles size={16} className="text-amber-500 fill-currentColor" />
                <span>Recomendados para ti</span>
            </h2>
            <p className="text-[11px] text-slate-400 font-medium mb-4">Sugerencias inteligentes basadas en tus intereses</p>

            <div className="space-y-3">
                {recommendations.map((rec) => (
                    <div key={rec.id} className="bg-slate-50/50 border border-slate-200/60 p-3 rounded-xl flex flex-col justify-between transition-all hover:bg-slate-50">
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
                            <p className="text-[10px] text-slate-500 font-medium italic bg-white p-1.5 rounded-lg border border-slate-100">
                                💡 {rec.reason}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
