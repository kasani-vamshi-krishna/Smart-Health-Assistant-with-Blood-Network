import React from 'react';

const PageLayout = ({ title, children }) => {
  return (
    <div className="flex-1 p-6 md:p-10 overflow-y-auto">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-6 border-b-2 border-gray-200 pb-3">{title}</h1>
        {/* The main content card is now part of the child to allow for more flexibility */}
        {children}
      </div>
    </div>
  );
};

export default PageLayout;