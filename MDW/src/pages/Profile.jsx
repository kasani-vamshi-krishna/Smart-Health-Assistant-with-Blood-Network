import React, { useState, useRef } from 'react';
import PageLayout from '../components/PageLayout';
import DonorDetailsModal from '../components/DonorDetailsModal';
import { useAuth } from '../context/AuthContext';
import { FaCamera, FaMapMarkerAlt, FaTint, FaCheck, FaHospital, FaUser, FaEnvelope, FaPhone, FaEdit } from 'react-icons/fa';

const Profile = () => {
    const { user, updateProfile, updateLocation, toggleDonate } = useAuth();
    const fileRef = useRef(null);

    const [form, setForm] = useState({
        full_name: user?.full_name || '',
        phone: user?.phone || '',
        city: user?.city || '',
        state: user?.state || '',
    });
    const [status, setStatus] = useState('');
    const [saving, setSaving] = useState(false);
    const [donorModalOpen, setDonorModalOpen] = useState(false);
    const [toggleBusy, setToggleBusy] = useState(false);

    const isHospital = user?.role === 'hospital';

    const handleChange = (e) => {
        setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        setStatus('');
        try {
            await updateProfile(form);
            setStatus('Profile updated successfully.');
        } catch (err) {
            setStatus(err.response?.data?.error || 'Failed to update profile.');
        } finally {
            setSaving(false);
        }
    };

    const handlePictureChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) {
            setStatus('Image too large (max 2 MB).');
            return;
        }
        const reader = new FileReader();
        reader.onload = async () => {
            try {
                await updateProfile({ profile_picture: reader.result });
                setStatus('Profile picture updated.');
            } catch (err) {
                setStatus('Failed to upload picture.');
            }
        };
        reader.readAsDataURL(file);
    };

    const detectAndSaveLocation = () => {
        if (!navigator.geolocation) {
            setStatus('Geolocation not supported.');
            return;
        }
        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                try {
                    await updateLocation({
                        latitude: pos.coords.latitude,
                        longitude: pos.coords.longitude,
                    });
                    setStatus('Location updated successfully.');
                } catch {
                    setStatus('Failed to save location.');
                }
            },
            () => setStatus('Location access denied.')
        );
    };

    const saveCityState = async () => {
        try {
            await updateLocation({
                latitude: user?.latitude || 0,
                longitude: user?.longitude || 0,
                city: form.city,
                state: form.state,
            });
            setStatus('City / State updated.');
        } catch {
            setStatus('Failed to update city / state.');
        }
    };

    const handleToggleDonate = async () => {
        if (user?.willing_to_donate) {
            setToggleBusy(true);
            try {
                await toggleDonate(false);
                setStatus('You have disabled blood donation.');
            } finally {
                setToggleBusy(false);
            }
        } else {
            setDonorModalOpen(true);
        }
    };

    const handleDonorSubmit = async (details) => {
        setToggleBusy(true);
        try {
            await toggleDonate(true, details);
            setStatus('Donation preferences saved. Thank you!');
            setDonorModalOpen(false);
        } catch {
            setStatus('Failed to update donation preferences.');
        } finally {
            setToggleBusy(false);
        }
    };

    return (
        <PageLayout title="My Profile">
            {status && (
                <div className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl text-sm">
                    {status}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left: identity card */}
                <div className="bg-white rounded-2xl shadow-lg p-6 text-center">
                    <div className="relative inline-block">
                        {user?.profile_picture ? (
                            <img src={user.profile_picture} alt="profile"
                                className="w-32 h-32 rounded-full object-cover border-4 border-indigo-200" />
                        ) : (
                            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-5xl font-bold">
                                {isHospital ? <FaHospital /> : user?.full_name?.charAt(0)?.toUpperCase()}
                            </div>
                        )}
                        <button onClick={() => fileRef.current?.click()}
                            className="absolute bottom-0 right-0 w-10 h-10 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-indigo-700">
                            <FaCamera />
                        </button>
                        <input ref={fileRef} type="file" accept="image/*" onChange={handlePictureChange} className="hidden" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-800 mt-4">
                        {isHospital ? user?.hospital_name : user?.full_name}
                    </h2>
                    <p className="text-gray-500 text-sm flex items-center justify-center gap-1 mt-1">
                        <FaEnvelope /> {user?.email}
                    </p>
                    <div className="flex items-center justify-center gap-2 mt-3 flex-wrap">
                        {isHospital ? (
                            <>
                                <span className="px-3 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded-full flex items-center gap-1">
                                    <FaCheck /> Verified Hospital
                                </span>
                                <span className="px-3 py-1 bg-gray-100 text-gray-700 text-xs font-semibold rounded-full">
                                    {user?.license_number}
                                </span>
                            </>
                        ) : (
                            <>
                                <span className="px-3 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full">
                                    {user?.blood_type}
                                </span>
                                <span className="px-3 py-1 bg-gray-100 text-gray-700 text-xs font-semibold rounded-full">
                                    {user?.gender}, {user?.age} yrs
                                </span>
                            </>
                        )}
                    </div>
                </div>

                {/* Middle+Right: editable forms */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-2xl shadow-lg p-6">
                        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <FaEdit className="text-indigo-500" /> Personal Details
                        </h3>
                        <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-semibold text-gray-700">Full Name</label>
                                <input name="full_name" value={form.full_name} onChange={handleChange}
                                    className="w-full mt-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                            </div>
                            <div>
                                <label className="text-sm font-semibold text-gray-700">Phone</label>
                                <input name="phone" value={form.phone} onChange={handleChange}
                                    className="w-full mt-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                            </div>
                            <div className="md:col-span-2 text-right">
                                <button type="submit" disabled={saving}
                                    className="px-6 py-2.5 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                                    {saving ? 'Saving…' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>

                    <div className="bg-white rounded-2xl shadow-lg p-6">
                        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <FaMapMarkerAlt className="text-emerald-500" /> Location
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                            <div>
                                <label className="text-sm font-semibold text-gray-700">City</label>
                                <input name="city" value={form.city} onChange={handleChange}
                                    className="w-full mt-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" />
                            </div>
                            <div>
                                <label className="text-sm font-semibold text-gray-700">State</label>
                                <input name="state" value={form.state} onChange={handleChange}
                                    className="w-full mt-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" />
                            </div>
                        </div>
                        <div className="text-sm text-gray-500 mb-3">
                            GPS: {user?.latitude?.toFixed?.(3) || 0}, {user?.longitude?.toFixed?.(3) || 0}
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <button onClick={saveCityState}
                                className="px-4 py-2 bg-gray-800 text-white rounded-lg text-sm font-semibold hover:bg-gray-900">
                                Save City / State
                            </button>
                            <button onClick={detectAndSaveLocation}
                                className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 flex items-center gap-2">
                                <FaMapMarkerAlt /> Detect & Save GPS
                            </button>
                        </div>
                    </div>

                    {!isHospital && (
                        <div className="bg-white rounded-2xl shadow-lg p-6">
                            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                                <FaTint className="text-red-500" /> Blood Donation
                            </h3>
                            <div className="flex items-center justify-between bg-gradient-to-r from-red-50 to-pink-50 p-4 rounded-xl">
                                <div>
                                    <p className="font-semibold text-gray-800">
                                        {user?.willing_to_donate ? 'You are an active donor' : 'Donation currently disabled'}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        {user?.willing_to_donate
                                            ? `Quantity: ${user?.donor_quantity_ml || 0} ml`
                                            : 'Enable to help hospitals find compatible donors'}
                                    </p>
                                </div>
                                <button onClick={handleToggleDonate} disabled={toggleBusy}
                                    className={`px-5 py-2 rounded-lg font-semibold text-white text-sm disabled:opacity-50 ${
                                        user?.willing_to_donate ? 'bg-gray-600 hover:bg-gray-700' : 'bg-red-500 hover:bg-red-600'
                                    }`}>
                                    {user?.willing_to_donate ? 'Disable' : 'Enable Donation'}
                                </button>
                            </div>

                            {user?.willing_to_donate && user?.donor_health_conditions && (
                                <div className="mt-4 text-sm text-gray-700">
                                    <p className="font-semibold mb-1">Health conditions on record:</p>
                                    <div className="flex flex-wrap gap-2">
                                        {Object.entries(user.donor_health_conditions)
                                            .filter(([k, v]) => v && k !== 'other')
                                            .map(([k]) => (
                                                <span key={k} className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs">
                                                    {k.replace(/_/g, ' ')}
                                                </span>
                                            ))}
                                        {!Object.entries(user.donor_health_conditions).some(([k, v]) => v && k !== 'other') && (
                                            <span className="text-xs text-gray-500">None reported</span>
                                        )}
                                    </div>
                                    {user.donor_health_conditions.other && (
                                        <p className="mt-2 text-xs text-gray-500">Other: {user.donor_health_conditions.other}</p>
                                    )}
                                    <button onClick={() => setDonorModalOpen(true)}
                                        className="mt-3 text-indigo-600 text-sm font-semibold hover:underline">
                                        Edit donor details
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <DonorDetailsModal
                open={donorModalOpen}
                onClose={() => setDonorModalOpen(false)}
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

export default Profile;
