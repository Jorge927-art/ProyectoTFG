import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
}

const Input = ({ label, error, ...props }: InputProps) => {
    return (
        <div className="flex flex-col gap-1 w-full">
            {label && (
                <label className="text-sm font-semibold text-gray-700 ml-1">
                    {label}
                </label>
            )}
            <input
                {...props}
                className={`border p-3 rounded-xl bg-gray-50 outline-none transition-all
                    ${error ? 'border-red-500 focus:ring-2 focus:ring-red-200' : 'border-gray-200 focus:ring-2 focus:ring-blue-500'}
                    ${props.className}`} /> 
            {error && <span className="text-xs text-red-500 ml-1">{error}</span>}
        </div>
    );
};

export default Input;
