import React, { useState } from 'react';
import { FaTimes, FaTint, FaHeartbeat } from 'react-icons/fa';

const CONDITION_OPTIONS = [
    { key: 'alcohol', label: 'Alcohol consumption' },
    { key: 'smoking', label: 'Smoking / Tobacco' },
    { key: 'diabetes', label: 'Diabetes' },
    { key: 'hypertension', label: 'High blood pressure' },
    { key: 'heart_disease', label: 'Heart disease' },
    { key: 'recent_surgery', label: 'Surgery in last 6 months' },
    { key: 'pregnancy', label: 'Pregnant / Breastfeeding' },
    { key: 'medications', label: 'On regular medication' },
];

const DonorDetailsModal = ({ open, onClose, onSubmit, initial = {}, submitting = false }) => {
    const [quantity, setQuantity] = useState(initial.donor_quantity_ml || 350);
    const [conditions, setConditions] = useState(initial.donor_health_conditions || {});
    const [other, setOther] = useState((initial.donor_health_conditions && initial.donor_health_conditions.other) || '');

    if (!open) return null;

    const toggleCondition = (key) => {
        setConditions(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const payload = {
            donor_quantity_ml: Number(quantity) || 0,
            donor_health_conditions: { ...conditions, other: other.trim() }
        };
        onSubmit(payload);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between p-5 border-b bg-gradient-to-r from-red-500 to-red-600 text-white rounded-t-2xl">
                    <div className="flex items-center gap-3">
                        <FaTint className="text-2xl" />
                        <div>
                            <h3 className="text-lg font-bold">Donor Details</h3>
                            <p className="text-xs text-red-100">Help us match you safely with hospitals in need</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-white/80 hover:text-white">
                        <FaTimes />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-5 space-y-5">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Quantity willing to donate (ml)
                        </label>
                        <input
                            type="number"
                            min="100"
                            max="500"
                            step="50"
                            value={quantity}
                            onChange={(e) => setQuantity(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                            required
                        />
                        <p className="text-xs text-gray-500 mt-1">Standard donation is 350–450 ml.</p>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                            <FaHeartbeat className="text-red-500" /> Health conditions (tick all that apply)
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {CONDITION_OPTIONS.map(opt => (
                                <label key={opt.key}
                                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition ${
                                        conditions[opt.key] ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-gray-50'
                                    }`}>
                                    <input
                                        type="checkbox"
                                        checked={!!conditions[opt.key]}
                                        onChange={() => toggleCondition(opt.key)}
                                        className="accent-red-500"
                                    />
                                    <span className="text-sm text-gray-700">{opt.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Other conditions (optional)</label>
                        <textarea
                            value={other}
                            onChange={(e) => setOther(e.target.value)}
                            rows="2"
                            className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                            placeholder="Anything hospitals should know..."
                        />
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t">
                        <button type="button" onClick={onClose}
                            className="px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-100">
                            Cancel
                        </button>
                        <button type="submit" disabled={submitting}
                            className="px-6 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold rounded-lg shadow hover:shadow-lg disabled:opacity-50">
                            {submitting ? 'Saving…' : 'Confirm & Enable'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default DonorDetailsModal;
