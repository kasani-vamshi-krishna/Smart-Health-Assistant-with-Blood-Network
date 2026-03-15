import React from 'react';
import { NavLink } from 'react-router-dom';
import { FaHeartbeat, FaBrain, FaStethoscope } from 'react-icons/fa';

const navigation = [
  { name: 'Diabetes Prediction', href: '/', icon: FaStethoscope },
  { name: 'Heart Disease Prediction', href: '/heart', icon: FaHeartbeat },
  { name: 'Parkinsons Prediction', href: '/parkinsons', icon: FaBrain },
];

const Sidebar = () => {
  return (
    <div className="w-72 bg-gray-900 text-white flex flex-col min-h-screen shadow-2xl">
      <div className="p-5 border-b border-gray-700/50 flex items-center space-x-4">
         <div className="text-3xl text-indigo-400">🧑‍⚕️</div>
        <h1 className="text-xl font-bold tracking-wider">Health AI</h1>
      </div>
      <nav className="flex-1 px-4 py-6 space-y-2">
        {navigation.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            className={({ isActive }) =>
              `flex items-center px-4 py-3 text-base rounded-lg transition-all duration-200 ease-in-out transform hover:scale-105 ${
                isActive 
                  ? 'bg-indigo-600 text-white shadow-lg' 
                  : 'text-gray-300 hover:bg-gray-700/50 hover:text-white'
              }`
            }
          >
            <item.icon className="mr-4 h-6 w-6 flex-shrink-0" />
            {item.name}
          </NavLink>
        ))}
      </nav>
      <div className="p-4 border-t border-gray-700/50 text-center text-xs text-gray-500">
          <p>Powered by Gemini AI</p>
          <p>&copy; 2025 Health Assistant</p>
      </div>
    </div>
  );
};

export default Sidebar;