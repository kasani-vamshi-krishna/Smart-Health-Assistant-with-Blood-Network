import React from 'react';

const FormField = ({ name, placeholder, value, onChange, grid, type = 'text' }) => {
    // A simple function to format the name into a readable label
    const formatLabel = (fieldName) => {
        return fieldName.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').replace(/^./, (str) => str.toUpperCase());
    };

    return (
        <div className={grid || 'col-span-1'}>
            <label htmlFor={name} className="block text-sm font-medium text-gray-600 mb-1">
                {formatLabel(name)}
            </label>
            <input
                type={type}
                name={name}
                id={name}
                className="block w-full px-4 py-2.5 text-gray-800 bg-white border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition duration-150 ease-in-out"
                placeholder={placeholder}
                value={value}
                onChange={onChange}
                required
            />
        </div>
    );
};

export default FormField;