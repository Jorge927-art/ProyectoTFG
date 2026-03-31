import React from "react";

interface GenericButtonProps {
    text?: string;
    icon?: React.ReactNode;
    onClick?: React.MouseEventHandler<HTMLButtonElement>;
    variant?: 'white' | 'search' | 'category';
}

const GenericButton = ({ text, icon, onClick, variant = 'white' }: GenericButtonProps) => {

    const isSearch = variant === 'search';
    const isCategory = variant === 'category';

    const basicMode = [
        'flex items-center gap-3',
        'transition-all duration-300 ease-in-out',
        'active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-500',
        variant === 'white' ? 'bg-white text-gray-700 border border-gray-200 shadow-sm hover:bg-blue-300' : '',
        isSearch ? 'bg-white text-gray-700 border border-gray-200 p-3 rounded-full hover:bg-blue-300' : '',
        isCategory ? 'w-full px-4 py-3 text-left rounded-xl hover:bg-blue-50 hover:text-blue-600 border border-transparent hover:border-blue-100' : ''
    ].join(' ');

    const variableMode = !isSearch && !isCategory ? 'px-6 py-2 rounded-lg justify-center' : '';

    return (
        <button
            onClick={onClick} className={`${basicMode} ${variableMode}`}>
            {icon && <span className="flex items-center ">{icon}</span>}
            {text && <span className="font-medium leading-none">{text}</span>}
        </button>
    );
};

export default GenericButton;