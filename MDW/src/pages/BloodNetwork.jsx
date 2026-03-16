import React, { useState, useEffect } from 'react';
import axios from 'axios';
import PageLayout from '../components/PageLayout';
import { useAuth } from '../context/AuthContext';
import { FaSearch, FaPhoneAlt, FaMapMarkerAlt, FaTint, FaUsers, FaHandHoldingHeart } from 'react-icons/fa';

const API_URL = 'http://127.0.0.1:5000';

const BloodNetwork = () => {
    const { user } = useAuth();
    const [searchForm, setSearchForm] = useState({
        blood_type: user?.blood_type || 'O+',
        radius: 50,
        latitude: 0,
        longitude: 0
    });
    const [results, setResults] = useState(null);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [locationDetected, setLocationDetected] = useState(false);

    useEffect(() => {
        axios.get(`${API_URL}/blood-network/stats`).then(res => setStats(res.data)).catch(() => {});
        detectLocation();
    }, []);

    const detectLocation = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    setSearchForm(prev => ({
                        ...prev,
                        latitude: pos.coords.latitude,
                        longitude: pos.coords.longitude
                    }));
                    setLocationDetected(true);
                },
                () => setError('Please enable location access for accurate results.')
            );
        }
    };

    const handleSearch = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const res = await axios.post(`${API_URL}/blood-network/search`, searchForm);
            setResults(res.data);
        } catch (err) {
            setError(err.response?.data?.error || 'Search failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <PageLayout title="Blood Donor Network">
            <div className="space-y-6">
                {/* Stats Cards */}
                {stats && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-gradient-to-br from-red-500 to-red-600 text-white rounded-2xl p-6 shadow-lg">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-red-100 text-sm font-medium">Active Donors</p>
                                    <p className="text-4xl font-extrabold mt-1">{stats.total_donors}</p>
                                </div>
                                <FaHandHoldingHeart className="text-5xl text-red-300 opacity-80" />
                            </div>
                        </div>
                        <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 text-white rounded-2xl p-6 shadow-lg">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-indigo-100 text-sm font-medium">Total Members</p>
                                    <p className="text-4xl font-extrabold mt-1">{stats.total_users}</p>
                                </div>
                                <FaUsers className="text-5xl text-indigo-300 opacity-80" />
                            </div>
                        </div>
                        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white rounded-2xl p-6 shadow-lg">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-emerald-100 text-sm font-medium">Blood Types Available</p>
                                    <p className="text-4xl font-extrabold mt-1">{Object.keys(stats.blood_type_distribution).length}</p>
                                </div>
                                <FaTint className="text-5xl text-emerald-300 opacity-80" />
                            </div>
                        </div>
                    </div>
                )}

                {/* Search Form */}
                <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8">
                    <h2 className="text-xl font-bold text-gray-800 mb-1">Find Blood Donors Near You</h2>
                    <p className="text-gray-500 mb-6 text-sm">Search for compatible donors in your area for urgent needs</p>

                    <form onSubmit={handleSearch} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Blood Type Needed</label>
                                <select name="blood_type" value={searchForm.blood_type}
                                    onChange={(e) => setSearchForm(prev => ({ ...prev, blood_type: e.target.value }))}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition bg-white text-lg font-semibold text-red-600">
                                    {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(t => (
                                        <option key={t} value={t}>{t}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Search Radius (km)</label>
                                <select value={searchForm.radius}
                                    onChange={(e) => setSearchForm(prev => ({ ...prev, radius: Number(e.target.value) }))}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition bg-white">
                                    <option value={10}>10 km</option>
                                    <option value={25}>25 km</option>
                                    <option value={50}>50 km</option>
                                    <option value={100}>100 km</option>
                                    <option value={200}>200 km</option>
                                    <option value={500}>500 km (wider area)</option>
                                </select>
                            </div>
                            <div className="flex items-end">
                                <button type="submit" disabled={loading}
                                    className="w-full py-3 bg-gradient-to-r from-red-500 to-red-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl hover:from-red-600 hover:to-red-700 transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2">
                                    {loading ? (
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    ) : (
                                        <>
                                            <FaSearch /> Search Donors
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                        {!locationDetected && (
                            <button type="button" onClick={detectLocation}
                                className="text-sm text-indigo-600 hover:underline flex items-center gap-1">
                                <FaMapMarkerAlt /> Click to detect your location for accurate results
                            </button>
                        )}
                    </form>
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">{error}</div>
                )}

                {/* Results */}
                {results && (
                    <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
                            <div>
                                <h2 className="text-xl font-bold text-gray-800">
                                    {results.total > 0 ? `${results.total} Donor${results.total > 1 ? 's' : ''} Found` : 'No Donors Found'}
                                </h2>
                                <p className="text-gray-500 text-sm mt-1">
                                    Searching for <span className="font-bold text-red-600">{results.searched_blood_type}</span> within {results.radius_km} km
                                    {' | '}Compatible types: {results.compatible_types.join(', ')}
                                </p>
                            </div>
                        </div>

                        {results.total === 0 ? (
                            <div className="text-center py-12 bg-gray-50 rounded-xl">
                                <FaTint className="text-6xl text-gray-300 mx-auto mb-4" />
                                <p className="text-gray-500 text-lg">No compatible donors found in your area.</p>
                                <p className="text-gray-400 text-sm mt-2">Try increasing the search radius or check back later.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {results.donors.map((donor, idx) => (
                                    <div key={donor.id}
                                        className="flex flex-col md:flex-row md:items-center justify-between p-5 bg-gray-50 hover:bg-indigo-50 rounded-xl border border-gray-100 hover:border-indigo-200 transition-all duration-200">
                                        <div className="flex items-center gap-4">
                                            <div className="w-14 h-14 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl flex items-center justify-center text-white font-extrabold text-lg shadow-md">
                                                {donor.blood_type}
                                            </div>
                                            <div>
                                                <p className="font-bold text-gray-800 text-lg">{donor.full_name}</p>
                                                <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                                                    <span className="flex items-center gap-1">
                                                        <FaMapMarkerAlt className="text-indigo-500" />
                                                        {donor.city}, {donor.state}
                                                    </span>
                                                    <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full text-xs font-semibold">
                                                        {donor.distance_km} km away
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <a href={`tel:${donor.phone}`}
                                            className="mt-3 md:mt-0 inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-semibold rounded-xl hover:shadow-lg transition-all text-sm">
                                            <FaPhoneAlt /> {donor.phone}
                                        </a>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </PageLayout>
    );
};

export default BloodNetwork;
