import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import PageLayout from '../components/PageLayout';
import DonorDetailsModal from '../components/DonorDetailsModal';
import { FaStethoscope, FaHeartbeat, FaBrain, FaTint, FaArrowRight, FaUserMd, FaHistory, FaHospital } from 'react-icons/fa';

const userFeatures = [
    {
        title: 'Diabetes Prediction',
        description: 'Analyze patient data using ML models to predict diabetes risk with personalized AI wellness plans.',
        icon: FaStethoscope,
        path: '/diabetes',
        bgLight: 'bg-blue-50',
        iconColor: 'text-blue-600'
    },
    {
        title: 'Heart Disease Prediction',
        description: 'Assess cardiovascular risk through clinical parameters with detailed parameter analysis charts.',
        icon: FaHeartbeat,
        path: '/heart',
        bgLight: 'bg-red-50',
        iconColor: 'text-red-600'
    },
    {
        title: "Parkinson's Prediction",
        description: "Detect early signs of Parkinson's disease using vocal measurement biomarkers and AI analysis.",
        icon: FaBrain,
        path: '/parkinsons',
        bgLight: 'bg-purple-50',
        iconColor: 'text-purple-600'
    },
    {
        title: 'History & Reports',
        description: 'Access every prediction you\'ve ever made and re-download reports anytime.',
        icon: FaHistory,
        path: '/history',
        bgLight: 'bg-amber-50',
        iconColor: 'text-amber-600'
    },
];

const Dashboard = () => {
    const { user, toggleDonate } = useAuth();
    const navigate = useNavigate();
    const [donorModal, setDonorModal] = useState(false);
    const [toggleBusy, setToggleBusy] = useState(false);
    const isHospital = user?.role === 'hospital';

    const handleQuickToggle = async () => {
        if (user?.willing_to_donate) {
            setToggleBusy(true);
            try { await toggleDonate(false); } finally { setToggleBusy(false); }
        } else {
            setDonorModal(true);
        }
    };

    const handleDonorSubmit = async (details) => {
        setToggleBusy(true);
        try {
            await toggleDonate(true, details);
            setDonorModal(false);
        } finally {
            setToggleBusy(false);
        }
    };

    const features = isHospital
        ? [{
            title: 'Blood Donor Network',
            description: 'Search for compatible donors nearby. Your hospital is verified, so you can access donor contacts.',
            icon: FaTint,
            path: '/blood-network',
            bgLight: 'bg-red-50',
            iconColor: 'text-red-600'
        }]
        : [...userFeatures, {
            title: 'Blood Donor Network',
            description: 'Community stats and info. Donor contacts are hospital-only.',
            icon: FaTint,
            path: '/blood-network',
            bgLight: 'bg-emerald-50',
            iconColor: 'text-emerald-600'
        }];

    return (
        <PageLayout title="Dashboard">
            <div className="bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 rounded-2xl p-8 md:p-10 text-white mb-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2"></div>
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center overflow-hidden">
                            {user?.profile_picture ? (
                                <img src={user.profile_picture} alt="me" className="w-full h-full object-cover" />
                            ) : isHospital ? (
                                <FaHospital className="text-2xl" />
                            ) : (
                                <FaUserMd className="text-2xl" />
                            )}
                        </div>
                        <div>
                            <h2 className="text-2xl md:text-3xl font-extrabold">
                                Welcome back, {(isHospital ? user?.hospital_name : user?.full_name)?.split(' ')[0]}!
                            </h2>
                            <p className="text-indigo-200 text-sm">{user?.email}</p>
                        </div>
                    </div>
                    <p className="text-indigo-100 mt-4 max-w-2xl leading-relaxed">
                        {isHospital
                            ? 'Your verified hospital account can access the Blood Donor Network to find compatible donors.'
                            : 'Your personal health assistant is ready. Use ML-powered prediction models or manage your donor status.'}
                    </p>
                    <div className="flex flex-wrap gap-3 mt-6 items-center">
                        <span className="bg-white/15 backdrop-blur-sm px-4 py-1.5 rounded-full text-sm font-medium">
                            {isHospital ? `License: ${user?.license_number}` : `Blood Type: ${user?.blood_type}`}
                        </span>
                        <span className="bg-white/15 backdrop-blur-sm px-4 py-1.5 rounded-full text-sm font-medium">
                            {user?.city}, {user?.state}
                        </span>

                        {!isHospital && (
                            <button onClick={handleQuickToggle} disabled={toggleBusy}
                                className={`px-4 py-1.5 rounded-full text-sm font-semibold backdrop-blur-sm transition disabled:opacity-50 ${
                                    user?.willing_to_donate
                                        ? 'bg-emerald-500/30 text-emerald-100 hover:bg-emerald-500/50'
                                        : 'bg-white/15 text-white hover:bg-white/30'
                                }`}>
                                {user?.willing_to_donate ? '✓ Active Donor — click to disable' : 'Become a Donor'}
                            </button>
                        )}
                    </div>
                </div>
            </div>

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

            <DonorDetailsModal
                open={donorModal}
                onClose={() => setDonorModal(false)}
                onSubmit={handleDonorSubmit}
                submitting={toggleBusy}
                initial={{
                    donor_quantity_ml: user?.donor_quantity_ml,
                    donor_health_conditions: user?.donor_health_conditions,
                }}
            />
        </PageLayout>
    );
};

export default Dashboard;
