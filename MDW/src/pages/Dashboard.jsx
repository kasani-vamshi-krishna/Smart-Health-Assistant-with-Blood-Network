import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import PageLayout from '../components/PageLayout';
import { FaStethoscope, FaHeartbeat, FaBrain, FaTint, FaArrowRight, FaUserMd } from 'react-icons/fa';

const features = [
    {
        title: 'Diabetes Prediction',
        description: 'Analyze patient data using ML models to predict diabetes risk with personalized AI wellness plans.',
        icon: FaStethoscope,
        path: '/diabetes',
        gradient: 'from-blue-500 to-cyan-500',
        bgLight: 'bg-blue-50',
        iconColor: 'text-blue-600'
    },
    {
        title: 'Heart Disease Prediction',
        description: 'Assess cardiovascular risk through clinical parameters with detailed parameter analysis charts.',
        icon: FaHeartbeat,
        path: '/heart',
        gradient: 'from-red-500 to-pink-500',
        bgLight: 'bg-red-50',
        iconColor: 'text-red-600'
    },
    {
        title: "Parkinson's Prediction",
        description: 'Detect early signs of Parkinson\'s disease using vocal measurement biomarkers and AI analysis.',
        icon: FaBrain,
        path: '/parkinsons',
        gradient: 'from-purple-500 to-indigo-500',
        bgLight: 'bg-purple-50',
        iconColor: 'text-purple-600'
    },
    {
        title: 'Blood Donor Network',
        description: 'Find nearby compatible blood donors in emergencies. Our intelligent system matches by blood type and location.',
        icon: FaTint,
        path: '/blood-network',
        gradient: 'from-emerald-500 to-teal-500',
        bgLight: 'bg-emerald-50',
        iconColor: 'text-emerald-600'
    }
];

const Dashboard = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    return (
        <PageLayout title="Dashboard">
            {/* Welcome Section */}
            <div className="bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 rounded-2xl p-8 md:p-10 text-white mb-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2"></div>
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                            <FaUserMd className="text-2xl" />
                        </div>
                        <div>
                            <h2 className="text-2xl md:text-3xl font-extrabold">
                                Welcome back, {user?.full_name?.split(' ')[0]}!
                            </h2>
                            <p className="text-indigo-200 text-sm">{user?.email}</p>
                        </div>
                    </div>
                    <p className="text-indigo-100 mt-4 max-w-2xl leading-relaxed">
                        Your personal health assistant is ready. Use our ML-powered prediction models or search the blood donor network.
                    </p>
                    <div className="flex flex-wrap gap-3 mt-6">
                        <span className="bg-white/15 backdrop-blur-sm px-4 py-1.5 rounded-full text-sm font-medium">
                            Blood Type: <strong>{user?.blood_type}</strong>
                        </span>
                        <span className="bg-white/15 backdrop-blur-sm px-4 py-1.5 rounded-full text-sm font-medium">
                            {user?.city}, {user?.state}
                        </span>
                        {user?.willing_to_donate ? (
                            <span className="bg-emerald-500/30 backdrop-blur-sm px-4 py-1.5 rounded-full text-sm font-medium text-emerald-100">
                                Active Donor
                            </span>
                        ) : null}
                    </div>
                </div>
            </div>

            {/* Feature Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {features.map((feature) => (
                    <button key={feature.path} onClick={() => navigate(feature.path)}
                        className="group text-left bg-white rounded-2xl shadow-md hover:shadow-xl border border-gray-100 hover:border-indigo-200 p-6 transition-all duration-300">
                        <div className="flex items-start gap-4">
                            <div className={`w-14 h-14 ${feature.bgLight} rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300`}>
                                <feature.icon className={`text-2xl ${feature.iconColor}`} />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-lg font-bold text-gray-800 group-hover:text-indigo-600 transition-colors">
                                    {feature.title}
                                </h3>
                                <p className="text-gray-500 text-sm mt-1 leading-relaxed">
                                    {feature.description}
                                </p>
                            </div>
                            <FaArrowRight className="text-gray-300 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all mt-1" />
                        </div>
                    </button>
                ))}
            </div>
        </PageLayout>
    );
};

export default Dashboard;
