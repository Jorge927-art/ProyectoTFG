// src/components/ui/genericCard/GenericCard.tsx
import type { ReactNode } from 'react';

interface GenericCardProps {
    children: ReactNode; // El único requisito absoluto: contenido por composición
    className?: string;  // Para inyectar clases de rejilla o tamaños desde fuera
}

const GenericCard = ({ children, className = '' }: GenericCardProps) => {
    return (
        <article className={`bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex flex-col transition-all hover:shadow-md ${className}`}>
            {children}
        </article>
    );
};

export default GenericCard;
