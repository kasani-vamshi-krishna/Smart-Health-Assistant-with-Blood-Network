import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useParams, Link } from 'react-router-dom';
import PageLayout from '../components/PageLayout';
import PredictionResult from '../components/PredictionResult';
import { API_URL } from '../context/AuthContext';
import { FaArrowLeft } from 'react-icons/fa';

const HistoryDetail = () => {
    const { id } = useParams();
    const [item, setItem] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        axios.get(`${API_URL}/history/${id}`)
            .then(res => setItem(res.data.item))
            .catch(err => setError(err.response?.data?.error || 'Failed to load record.'))
            .finally(() => setLoading(false));
    }, [id]);

    if (loading) {
        return (
            <PageLayout title="Prediction Report">
                <div className="text-center py-16">
                    <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                </div>
            </PageLayout>
        );
    }

    if (error || !item) {
        return (
            <PageLayout title="Prediction Report">
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4">{error || 'Not found'}</div>
                <Link to="/history" className="text-indigo-600 font-semibold hover:underline">&larr; Back to history</Link>
            </PageLayout>
        );
    }

    const result = {
        prediction: item.prediction,
        diagnosis: item.diagnosis,
        risk_score: item.risk_score,
        risk_category: item.risk_category,
        normal_ranges: item.normal_ranges || {},
    };

    return (
        <PageLayout title={`${item.disease_type.charAt(0).toUpperCase() + item.disease_type.slice(1)} Report`}>
            <Link to="/history" className="inline-flex items-center gap-2 text-indigo-600 font-semibold hover:underline mb-4">
                <FaArrowLeft /> Back to history
            </Link>
            <p className="text-gray-500 text-sm mb-4">Recorded on {new Date(item.created_at).toLocaleString()}</p>
            <PredictionResult
                result={result}
                title={item.disease_type}
                inputs={item.inputs}
                diseaseType={item.disease_type}
                historyId={item.id}
                existingPlan={item.plan}
                onReset={() => window.history.back()}
            />
        </PageLayout>
    );
};

export default HistoryDetail;
