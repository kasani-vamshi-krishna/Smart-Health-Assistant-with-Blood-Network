import React from 'react';

const PageLayout = ({ title, children }) => {
    return (
        <div className="flex-1 p-6 md:p-10 overflow-y-auto">
            <div className="max-w-7xl mx-auto animate-fade-in">
                <h1 className="text-3xl md:text-4xl font-extrabold text-gray-800 mb-2">{title}</h1>
                <div className="w-20 h-1 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full mb-8"></div>
                {children}
            </div>
        </div>
    );
};

export default PageLayout;
