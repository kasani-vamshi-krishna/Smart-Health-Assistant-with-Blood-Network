import React, { useState } from 'react';
import axios from 'axios';
import PageLayout from '../components/PageLayout';
import PredictionResult from '../components/PredictionResult';
import FormField from '../components/FormField';

const inputFields = [
    { name: 'age', placeholder: 'e.g., 63' },
    { name: 'sex', placeholder: '1 for Male, 0 for Female' },
    { name: 'cp', placeholder: 'Chest Pain Type (0-3)' },
    { name: 'trestbps', placeholder: 'Resting Blood Pressure (mm Hg)' },
    { name: 'chol', placeholder: 'Serum Cholesterol (mg/dl)' },
    { name: 'fbs', placeholder: 'Fasting Blood Sugar > 120 mg/dl (1=true)' },
    { name: 'restecg', placeholder: 'Resting ECG results (0-2)' },
    { name: 'thalach', placeholder: 'Max Heart Rate achieved' },
    { name: 'exang', placeholder: 'Exercise Induced Angina (1=yes)' },
    { name: 'oldpeak', placeholder: 'ST depression by exercise' },
    { name: 'slope', placeholder: 'Slope of peak exercise ST (0-2)' },
    { name: 'ca', placeholder: 'Major vessels colored (0-3)' },
    { name: 'thal', placeholder: '0=normal; 1=fixed; 2=reversable' },
];

const initialFormState = inputFields.reduce((acc, field) => ({ ...acc, [field.name]: '' }), {});

const Heart = () => {
    const [formData, setFormData] = useState(initialFormState);
    const [result, setResult] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleChange = (e) => {
        const { name, value } = e.target;
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
            const response = await axios.post('http://127.0.0.1:5000/predict/heart', formData);
            setResult(response.data);
        } catch (err) {
            console.error("Prediction API error:", err);
            setError('Could not connect to the server or an error occurred. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <PageLayout title="Heart Disease Prediction">
            {!result ? (
                <div className="bg-white p-8 rounded-xl shadow-lg">
                    <p className="mb-8 text-gray-600 text-lg">Provide the patient's clinical data to assess the risk of heart disease.</p>
                    <form onSubmit={handleSubmit}>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                    title="Heart Disease" 
                    inputs={formData} 
                    onReset={handleReset}
                    diseaseType="heart"
                />
            )}
        </PageLayout>
    );
};

export default Heart;