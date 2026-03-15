import React, { useState } from 'react';
import axios from 'axios';
import PageLayout from '../components/PageLayout';
import PredictionResult from '../components/PredictionResult';
import FormField from '../components/FormField';

const inputFields = [
    { name: 'fo', placeholder: 'MDVP:Fo(Hz)' }, { name: 'fhi', placeholder: 'MDVP:Fhi(Hz)' },
    { name: 'flo', placeholder: 'MDVP:Flo(Hz)' }, { name: 'Jitter_percent', placeholder: 'MDVP:Jitter(%)' },
    { name: 'Jitter_Abs', placeholder: 'MDVP:Jitter(Abs)' }, { name: 'RAP', placeholder: 'MDVP:RAP' },
    { name: 'PPQ', placeholder: 'MDVP:PPQ' }, { name: 'DDP', placeholder: 'Jitter:DDP' },
    { name: 'Shimmer', placeholder: 'MDVP:Shimmer' }, { name: 'Shimmer_dB', placeholder: 'MDVP:Shimmer(dB)' },
    { name: 'APQ3', placeholder: 'Shimmer:APQ3' }, { name: 'APQ5', placeholder: 'Shimmer:APQ5' },
    { name: 'APQ', placeholder: 'MDVP:APQ' }, { name: 'DDA', placeholder: 'Shimmer:DDA' },
    { name: 'NHR', placeholder: 'NHR' }, { name: 'HNR', placeholder: 'HNR' },
    { name: 'RPDE', placeholder: 'RPDE' }, { name: 'DFA', placeholder: 'DFA' },
    { name: 'spread1', placeholder: 'spread1' }, { name: 'spread2', placeholder: 'spread2' },
    { name: 'D2', placeholder: 'D2' }, { name: 'PPE', placeholder: 'PPE' }
];

const initialFormState = inputFields.reduce((acc, field) => ({ ...acc, [field.name]: '' }), {});

const Parkinsons = () => {
    const [formData, setFormData] = useState(initialFormState);
    const [result, setResult] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleChange = (e) => {
        const { name, value } = e.target;
        // Allow negative numbers, numbers, and a single decimal
        if (/^-?\d*\.?\d*$/.test(value)) {
            setFormData({ ...formData, [name]: value });
        }
    };

    const handleReset = () => {
        setFormData(initialFormState);
        setResult(null);
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (Object.values(formData).some(v => v === '')) {
            setError('Please fill out all fields before submitting.');
            return;
        }
        setError('');
        setIsLoading(true);
        setResult(null);
        try {
            const response = await axios.post('http://127.0.0.1:5000/predict/parkinsons', formData);
            setResult(response.data);
        } catch (err) {
            console.error("Prediction API error:", err);
            setError('Could not connect to the server or an error occurred. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <PageLayout title="Parkinson's Disease Prediction">
            {!result ? (
                <div className="bg-white p-8 rounded-xl shadow-lg">
                    <p className="mb-8 text-gray-600 text-lg">Enter the patient's vocal measurement data to predict the presence of Parkinson's disease.</p>
                    <form onSubmit={handleSubmit}>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-5">
                            {inputFields.map(field => (
                                <FormField key={field.name} {...field} value={formData[field.name]} onChange={handleChange} />
                            ))}
                        </div>
                        {error && <p className="text-red-600 text-center mt-6 font-semibold animate-pulse">{error}</p>}
                        <div className="mt-10 text-right border-t pt-6">
                            <button type="submit" disabled={isLoading} className="px-10 py-3 bg-indigo-600 text-white font-bold rounded-lg shadow-md hover:bg-indigo-700 disabled:bg-indigo-300 disabled:cursor-not-allowed transition-all duration-200 ease-in-out transform hover:scale-105">
                                {isLoading ? 'Analyzing Data...' : 'Get Prediction'}
                            </button>
                        </div>
                    </form>
                </div>
            ) : (
                <PredictionResult 
                    result={result} 
                    title="Parkinson's Disease" 
                    inputs={formData} 
                    onReset={handleReset}
                    diseaseType="parkinsons"
                />
            )}
        </PageLayout>
    );
};

export default Parkinsons;