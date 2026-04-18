import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { FaHeartbeat, FaBrain, FaStethoscope, FaTint, FaHome, FaSignOutAlt, FaHistory, FaUserCircle, FaHospital } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';

const Sidebar = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const isHospital = user?.role === 'hospital';

    const navigation = [
        { name: 'Dashboard', href: '/dashboard', icon: FaHome, show: true },
        { name: 'Diabetes Prediction', href: '/diabetes', icon: FaStethoscope, show: !isHospital },
        { name: 'Heart Disease', href: '/heart', icon: FaHeartbeat, show: !isHospital },
        { name: "Parkinson's", href: '/parkinsons', icon: FaBrain, show: !isHospital },
        { name: 'History & Reports', href: '/history', icon: FaHistory, show: !isHospital },
        { name: 'Blood Network', href: '/blood-network', icon: FaTint, show: true },
        { name: 'Profile', href: '/profile', icon: FaUserCircle, show: true },
    ].filter(item => item.show);

    return (
        <div className="w-72 bg-gradient-to-b from-gray-900 via-gray-900 to-gray-800 text-white flex flex-col min-h-screen shadow-2xl">
            <div className="p-5 border-b border-gray-700/50 flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                    <FaHeartbeat className="text-xl text-white" />
                </div>
                <div>
                    <h1 className="text-lg font-bold tracking-wide">Health AI</h1>
                    <p className="text-[10px] text-gray-400 tracking-widest uppercase">Smart Assistant</p>
                </div>
            </div>

            {user && (
                <div className="mx-4 mt-5 p-4 bg-gradient-to-r from-indigo-600/20 to-purple-600/20 rounded-xl border border-indigo-500/20">
                    <div className="flex items-center gap-3">
                        {user.profile_picture ? (
                            <img src={user.profile_picture} alt="me"
                                className="w-10 h-10 rounded-full object-cover border-2 border-indigo-400" />
                        ) : (
                            <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center text-sm font-bold">
                                {isHospital ? <FaHospital /> : user.full_name?.charAt(0)?.toUpperCase()}
                            </div>
                        )}
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold truncate">
                                {isHospital ? user.hospital_name : user.full_name}
                            </p>
                            <p className="text-[11px] text-gray-400 truncate">{user.email}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 mt-3 flex-wrap">
                        {isHospital ? (
                            <span className="bg-red-500/20 text-red-300 px-2 py-0.5 rounded-full text-[10px] font-semibold">
                                Verified Hospital
                            </span>
                        ) : (
                            <>
                                <span className="bg-red-500/20 text-red-300 px-2 py-0.5 rounded-full text-[10px] font-semibold">
                                    {user.blood_type}
                                </span>
                                <span className="text-[10px] text-gray-400">{user.city}</span>
                                {user.willing_to_donate ? (
                                    <span className="bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full text-[10px] font-semibold">
                                        Donor
                                    </span>
                                ) : null}
                            </>
                        )}
                    </div>
                </div>
            )}

            <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
                <p className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold px-4 mb-3">Navigation</p>
                {navigation.map((item) => (
                    <NavLink
                        key={item.name}
                        to={item.href}
                        className={({ isActive }) =>
                            `flex items-center px-4 py-3 text-sm rounded-xl transition-all duration-200 ${
                                isActive
                                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                            }`
                        }
                    >
                        <item.icon className="mr-3 h-5 w-5 flex-shrink-0" />
                        {item.name}
                    </NavLink>
                ))}
            </nav>

            <div className="p-4 space-y-3 border-t border-gray-700/50">
                <button onClick={handleLogout}
                    className="w-full flex items-center px-4 py-2.5 text-sm text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all duration-200">
                    <FaSignOutAlt className="mr-3 h-4 w-4" />
                    Sign Out
                </button>
                <div className="text-center text-[10px] text-gray-600 pt-2">
                    <p>Powered by Gemini AI</p>
                    <p>&copy; 2025 Health Assistant</p>
                </div>
            </div>
        </div>
    );
};

export default Sidebar;
