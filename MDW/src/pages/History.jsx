import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import PageLayout from '../components/PageLayout';
import { API_URL } from '../context/AuthContext';
import { FaHistory, FaStethoscope, FaHeartbeat, FaBrain, FaTrash, FaArrowRight } from 'react-icons/fa';

const ICONS = {
    diabetes: FaStethoscope,
    heart: FaHeartbeat,
    parkinsons: FaBrain,
};

const COLORS = {
    diabetes: 'from-blue-500 to-cyan-500',
    heart: 'from-red-500 to-pink-500',
    parkinsons: 'from-purple-500 to-indigo-500',
};

const riskColor = (cat) =>
    cat === 'Low Risk' ? 'text-emerald-600 bg-emerald-50'
    : cat === 'Moderate Risk' ? 'text-amber-600 bg-amber-50'
    : 'text-red-600 bg-red-50';

const History = () => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const load = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${API_URL}/history`);
            setItems(res.data.history);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to load history.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const handleDelete = async (id) => {
        if (!confirm('Delete this prediction record?')) return;
        try {
            await axios.delete(`${API_URL}/history/${id}`);
            setItems(prev => prev.filter(i => i.id !== id));
        } catch {
            setError('Delete failed.');
        }
    };

    return (
        <PageLayout title="History & Reports">
            <p className="text-gray-600 mb-6">All your previous predictions are saved here. Click any record to view details or re-download the report.</p>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4">{error}</div>
            )}

            {loading ? (
                <div className="text-center py-16">
                    <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <p className="mt-3 text-gray-500 text-sm">Loading history…</p>
                </div>
            ) : items.length === 0 ? (
                <div className="bg-white rounded-2xl shadow p-12 text-center">
                    <FaHistory className="text-5xl text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-600 font-semibold">No predictions yet.</p>
                    <p className="text-gray-400 text-sm">Run a Diabetes, Heart or Parkinson's prediction to see it here.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {items.map(item => {
                        const Icon = ICONS[item.disease_type] || FaHistory;
                        const gradient = COLORS[item.disease_type] || 'from-gray-500 to-gray-700';
                        return (
                            <Link to={`/history/${item.id}`} key={item.id}
                                className="flex items-center justify-between bg-white hover:bg-indigo-50 rounded-2xl shadow-sm hover:shadow-md p-5 border border-gray-100 transition">
                                <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 bg-gradient-to-br ${gradient} text-white rounded-xl flex items-center justify-center`}>
                                        <Icon className="text-xl" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-800 capitalize">{item.disease_type} Prediction</p>
                                        <p className="text-xs text-gray-500">{new Date(item.created_at).toLocaleString()}</p>
                                        <p className="text-sm text-gray-700 mt-1">{item.diagnosis}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${riskColor(item.risk_category)}`}>
                                        {item.risk_category} · {item.risk_score}/100
                                    </span>
                                    <button onClick={(e) => { e.preventDefault(); handleDelete(item.id); }}
                                        className="text-gray-400 hover:text-red-500 p-2">
                                        <FaTrash />
                                    </button>
                                    <FaArrowRight className="text-gray-300" />
                                </div>
                            </Link>
                        );
                    })}
                </div>
            )}
        </PageLayout>
    );
};

export default History;
