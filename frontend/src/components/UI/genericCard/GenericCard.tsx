import type { ReactNode } from 'react';

interface GenericCardProps {
    tag?: string;
    tagColorClass?: string;
    title: string;
    subtitle?: string;
    extraHeaderElement?: ReactNode;
    footerChildren?: ReactNode;
    className?: string;
}

const GenericCard = ({
    tag,
    tagColorClass = 'bg-slate-100 text-slate-600',
    title,
    subtitle,
    extraHeaderElement,
    footerChildren,
    className = ''
}: GenericCardProps) => {
    return (
        <article className={`bg-white rounded-xl p-5 border border-slate-100 shadow-sm flex flex-col justify-between transition-all hover:shadow-md ${className}`}>
            <div>
                {(tag || extraHeaderElement) && (
                    <div className="flex items-center justify-between mb-3">
                        {tag && (
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wide ${tagColorClass}`}>
                                {tag}
                            </span>
                        )}
                        {extraHeaderElement}
                    </div>
                )}

                <h3 className="text-base font-bold text-slate-800 leading-tight">
                    {title}
                </h3>

                {subtitle && (
                    <p className="text-xs text-slate-400 mt-1">
                        {subtitle}
                    </p>
                )}
            </div>

            {footerChildren && (
                <div className="mt-4 pt-3 border-t border-slate-50">
                    {footerChildren}
                </div>
            )}
        </article>
    );
};

export default GenericCard;
