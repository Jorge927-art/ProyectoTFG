import React from "react";

interface GenericButtonProps{
    text?: string;
    icon?: React.ReactNode;
    onClick?: React.MouseEventHandler<HTMLButtonElement>;
    variant?: 'white' | 'search';
}

const GenericButton = ({ text,icon,onClick,variant = 'white'}:GenericButtonProps) => {

    const isSearch = variant === 'search';

    const basicMode = [
        'flex items-center justify-center gap-2',
        'transition-all duration-300 ease-in-out',
        'bg-white text-gray-700 border border-gray-200 shadow-sm', 
        'hover:bg-gray-200 active:scale-95',
        'focus:outline-none focus:ring-2 focus:ring-blue-500'
    ].join(' ');
    
    const variableMode = isSearch
        ? 'p-3 rounded-full'  //Estilo circular para la lupa
        : 'px-6 py-2 rounded-lg' //Estilo rectangular para el texto

    return (
        <button
            onClick={onClick ?? undefined}
            className={`${basicMode} ${variableMode}`}>
            {icon}
            {text && <span className="font-medium">{text}</span>}
        </button>
    );
};

export default GenericButton;