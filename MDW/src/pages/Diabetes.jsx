import React, { useState } from 'react';
import axios from 'axios';
import PageLayout from '../components/PageLayout';
import PredictionResult from '../components/PredictionResult';
import FormField from '../components/FormField';

const inputFields = [
    { name: 'Pregnancies', placeholder: 'e.g., 1', grid: 'md:col-span-1' },
    { name: 'Glucose', placeholder: 'e.g., 85', grid: 'md:col-span-1' },
    { name: 'BloodPressure', placeholder: 'e.g., 66', grid: 'md:col-span-1' },
    { name: 'SkinThickness', placeholder: 'e.g., 29', grid: 'md:col-span-1' },
    { name: 'Insulin', placeholder: 'e.g., 120', grid: 'md:col-span-1' },
    { name: 'BMI', placeholder: 'e.g., 26.6', grid: 'md:col-span-1' },
    { name: 'DiabetesPedigreeFunction', placeholder: 'e.g., 0.351', grid: 'md:col-span-2' },
    { name: 'Age', placeholder: 'e.g., 31', grid: 'md:col-span-1' },
];

const initialFormState = inputFields.reduce((acc, field) => ({ ...acc, [field.name]: '' }), {});

const Diabetes = () => {
    const [formData, setFormData] = useState(initialFormState);
    const [result, setResult] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleChange = (e) => {
        const { name, value } = e.target;
        // Allow only non-negative numbers and a single decimal point
        if (/^\d*\.?\d*$/.test(value)) {
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
            const response = await axios.post('http://127.0.0.1:5000/predict/diabetes', formData);
            setResult(response.data);
        } catch (err) {
            console.error("Prediction API error:", err);
            setError('Could not connect to the server or an error occurred. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <PageLayout title="Diabetes Prediction">
            {!result ? (
                <div className="bg-white p-6 md:p-8 rounded-xl shadow-lg">
                    <p className="mb-6 md:mb-8 text-gray-600 text-base md:text-lg">Enter the patient's details below to predict the likelihood of diabetes using our trained machine learning model.</p>
                    <form onSubmit={handleSubmit}>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                            {inputFields.map(field => (
                                <FormField key={field.name} {...field} value={formData[field.name]} onChange={handleChange} />
                            ))}
                        </div>
                        {error && <p className="text-red-600 text-center mt-6 font-semibold animate-pulse">{error}</p>}
                        <div className="mt-8 md:mt-10 text-right border-t pt-6">
                            <button 
                                type="submit" 
                                disabled={isLoading} 
                                className="px-8 md:px-10 py-3 bg-indigo-600 text-white font-bold rounded-lg shadow-md hover:bg-indigo-700 disabled:bg-indigo-300 disabled:cursor-not-allowed transition-all duration-200 ease-in-out transform hover:scale-105 text-sm md:text-base"
                            >
                                {isLoading ? 'Analyzing Data...' : 'Get Prediction'}
                            </button>
                        </div>
                    </form>
                </div>
            ) : (
                <PredictionResult 
                    result={result} 
                    title="Diabetes" 
                    inputs={formData} 
                    onReset={handleReset}
                    diseaseType="diabetes"
                />
            )}
        </PageLayout>
    );
};

export default Diabetes;