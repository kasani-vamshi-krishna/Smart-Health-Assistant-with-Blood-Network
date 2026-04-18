import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth, API_URL } from '../context/AuthContext';
import { FaHeartbeat, FaEnvelope, FaLock, FaUserPlus, FaSignInAlt, FaHospital, FaUser, FaShieldAlt } from 'react-icons/fa';
import DonorDetailsModal from '../components/DonorDetailsModal';

const Login = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [role, setRole] = useState('user'); // 'user' | 'hospital'
    const [error, setError] = useState('');
    const [info, setInfo] = useState('');
    const [loading, setLoading] = useState(false);
    const [donorModalOpen, setDonorModalOpen] = useState(false);
    const [otpSent, setOtpSent] = useState(false);
    const [otp, setOtp] = useState('');
    const [otpLoading, setOtpLoading] = useState(false);
    const [resendIn, setResendIn] = useState(0);
    const { login, register } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (resendIn <= 0) return;
        const t = setTimeout(() => setResendIn(resendIn - 1), 1000);
        return () => clearTimeout(t);
    }, [resendIn]);

    const [form, setForm] = useState({
        full_name: '', email: '', password: '', confirm_password: '',
        phone: '', blood_type: 'O+', age: '', gender: 'Male',
        city: '', state: '', willing_to_donate: false,
        latitude: 0, longitude: 0,
        hospital_name: '', license_number: '',
        donor_quantity_ml: 0, donor_health_conditions: null,
    });

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        if (type === 'checkbox' && name === 'willing_to_donate') {
            if (checked) {
                setDonorModalOpen(true);
            } else {
                setForm(prev => ({ ...prev, willing_to_donate: false, donor_quantity_ml: 0, donor_health_conditions: null }));
            }
            return;
        }
        setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    const handleDonorSubmit = (details) => {
        setForm(prev => ({ ...prev, willing_to_donate: true, ...details }));
        setDonorModalOpen(false);
    };

    const detectLocation = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    setForm(prev => ({
                        ...prev,
                        latitude: pos.coords.latitude,
                        longitude: pos.coords.longitude
                    }));
                },
                () => setError('Location access denied. You can still register without it.')
            );
        }
    };

    const validateRegistrationForm = () => {
        if (!form.email || !form.email.includes('@')) return 'Please enter a valid email';
        if (form.password.length < 6) return 'Password must be at least 6 characters';
        if (form.password !== form.confirm_password) return 'Passwords do not match';
        const required = ['full_name', 'phone', 'age', 'city', 'state'];
        if (role === 'hospital') required.push('hospital_name', 'license_number');
        for (const f of required) {
            if (!form[f]) return `Please fill in ${f.replace('_', ' ')}`;
        }
        return null;
    };

    const handleSendOtp = async () => {
        setError('');
        setInfo('');
        const problem = validateRegistrationForm();
        if (problem) { setError(problem); return; }
        setOtpLoading(true);
        try {
            await axios.post(`${API_URL}/auth/send-otp`, { email: form.email, purpose: 'registration' });
            setOtpSent(true);
            setResendIn(30);
            setInfo(`Verification code sent to ${form.email}. Check your inbox (or spam).`);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to send verification code.');
        } finally {
            setOtpLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setInfo('');
        setLoading(true);

        try {
            if (isLogin) {
                await login(form.email, form.password);
            } else {
                const problem = validateRegistrationForm();
                if (problem) { setError(problem); setLoading(false); return; }
                if (!otpSent) {
                    setError('Please request and enter the email verification code first.');
                    setLoading(false);
                    return;
                }
                if (!otp || otp.length !== 6) {
                    setError('Enter the 6-digit code sent to your email.');
                    setLoading(false);
                    return;
                }
                await register({ ...form, role, otp });
            }
            navigate('/dashboard');
        } catch (err) {
            setError(err.response?.data?.error || 'Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const switchMode = () => {
        setIsLogin(!isLogin);
        setError('');
        setInfo('');
        setOtpSent(false);
        setOtp('');
        setResendIn(0);
    };

    return (
        <div className="min-h-screen w-full flex">
            <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 text-white flex-col justify-center items-center p-12 relative overflow-hidden">
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-20 left-20 w-72 h-72 bg-white rounded-full blur-3xl"></div>
                    <div className="absolute bottom-20 right-20 w-96 h-96 bg-purple-300 rounded-full blur-3xl"></div>
                </div>
                <div className="relative z-10 text-center max-w-lg">
                    <div className="flex items-center justify-center mb-8">
                        <FaHeartbeat className="text-6xl text-red-300 mr-4" />
                        <h1 className="text-5xl font-extrabold tracking-tight">Health AI</h1>
                    </div>
                    <p className="text-xl text-indigo-200 leading-relaxed mb-8">
                        Smart Health Assistant with an integrated Blood Donor Network — hospital-verified for donor safety.
                    </p>
                    <div className="grid grid-cols-3 gap-4 text-center">
                        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                            <p className="text-3xl font-bold">3</p>
                            <p className="text-sm text-indigo-200">Disease Models</p>
                        </div>
                        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                            <p className="text-3xl font-bold">AI</p>
                            <p className="text-sm text-indigo-200">Powered Plans</p>
                        </div>
                        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                            <p className="text-3xl font-bold">24/7</p>
                            <p className="text-sm text-indigo-200">Blood Network</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="w-full lg:w-1/2 flex items-center justify-center p-6 md:p-12 bg-gray-50 overflow-y-auto">
                <div className="w-full max-w-lg">
                    <div className="lg:hidden flex items-center justify-center mb-8">
                        <FaHeartbeat className="text-4xl text-indigo-600 mr-3" />
                        <h1 className="text-3xl font-extrabold text-gray-800">Health AI</h1>
                    </div>

                    <h2 className="text-3xl font-bold text-gray-800 mb-2">
                        {isLogin ? 'Welcome Back' : 'Create Account'}
                    </h2>
                    <p className="text-gray-500 mb-6">
                        {isLogin ? 'Sign in to access your health dashboard' : 'Join our health network today'}
                    </p>

                    {!isLogin && (
                        <div className="grid grid-cols-2 gap-2 mb-6 bg-gray-100 p-1 rounded-xl">
                            <button type="button" onClick={() => setRole('user')}
                                className={`py-2 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition ${
                                    role === 'user' ? 'bg-white shadow text-indigo-600' : 'text-gray-500'
                                }`}>
                                <FaUser /> Individual
                            </button>
                            <button type="button" onClick={() => setRole('hospital')}
                                className={`py-2 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition ${
                                    role === 'hospital' ? 'bg-white shadow text-red-600' : 'text-gray-500'
                                }`}>
                                <FaHospital /> Hospital / Clinic
                            </button>
                        </div>
                    )}

                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
                            {error}
                        </div>
                    )}
                    {info && (
                        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-lg mb-4 text-sm">
                            {info}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {!isLogin && (
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">
                                    {role === 'hospital' ? 'Contact Person Name' : 'Full Name'}
                                </label>
                                <input type="text" name="full_name" value={form.full_name} onChange={handleChange}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
                                    placeholder="John Doe" required />
                            </div>
                        )}

                        {!isLogin && role === 'hospital' && (
                            <div className="grid grid-cols-1 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Hospital / Organization Name</label>
                                    <input type="text" name="hospital_name" value={form.hospital_name} onChange={handleChange}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 outline-none"
                                        placeholder="Apollo Hospitals" required />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Verified License Number</label>
                                    <input type="text" name="license_number" value={form.license_number} onChange={handleChange}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 outline-none"
                                        placeholder="e.g., APOLLO-HYD-001" required />
                                    <p className="text-xs text-gray-500 mt-1">
                                        Only pre-verified hospital license numbers may access donor phone numbers. Try demo code:
                                        <code className="ml-1 px-1 bg-gray-100 rounded">MED-DEMO-0000</code>
                                    </p>
                                </div>
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Email</label>
                            <div className="relative">
                                <FaEnvelope className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input type="email" name="email" value={form.email} onChange={handleChange}
                                    className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
                                    placeholder="you@email.com" required />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Password</label>
                            <div className="relative">
                                <FaLock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input type="password" name="password" value={form.password} onChange={handleChange}
                                    className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
                                    placeholder="Min. 6 characters" required />
                            </div>
                        </div>

                        {!isLogin && (
                            <>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Confirm Password</label>
                                    <input type="password" name="confirm_password" value={form.confirm_password} onChange={handleChange}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
                                        placeholder="Re-enter password" required />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1">Phone</label>
                                        <input type="tel" name="phone" value={form.phone} onChange={handleChange}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                                            placeholder="+91 9876543210" required />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1">Blood Type</label>
                                        <select name="blood_type" value={form.blood_type} onChange={handleChange}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none bg-white">
                                            {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(t => (
                                                <option key={t} value={t}>{t}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1">Age</label>
                                        <input type="number" name="age" value={form.age} onChange={handleChange}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                                            placeholder="25" min="1" max="120" required />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1">Gender</label>
                                        <select name="gender" value={form.gender} onChange={handleChange}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none bg-white">
                                            <option value="Male">Male</option>
                                            <option value="Female">Female</option>
                                            <option value="Other">Other</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1">City</label>
                                        <input type="text" name="city" value={form.city} onChange={handleChange}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                                            placeholder="Hyderabad" required />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1">State</label>
                                        <input type="text" name="state" value={form.state} onChange={handleChange}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                                            placeholder="Telangana" required />
                                    </div>
                                </div>

                                {role === 'user' && (
                                    <div className="flex items-center justify-between bg-indigo-50 p-4 rounded-xl">
                                        <div>
                                            <p className="font-semibold text-gray-800 text-sm">Willing to Donate Blood?</p>
                                            <p className="text-xs text-gray-500">
                                                {form.willing_to_donate
                                                    ? `Quantity: ${form.donor_quantity_ml} ml • details captured`
                                                    : 'We\'ll ask a few health questions to keep donations safe'}
                                            </p>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input type="checkbox" name="willing_to_donate" checked={form.willing_to_donate}
                                                onChange={handleChange} className="sr-only peer" />
                                            <div className="w-11 h-6 bg-gray-300 peer-focus:ring-2 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                                        </label>
                                    </div>
                                )}

                                <button type="button" onClick={detectLocation}
                                    className="w-full py-3 border-2 border-dashed border-indigo-300 text-indigo-600 rounded-xl hover:bg-indigo-50 transition text-sm font-semibold">
                                    {form.latitude !== 0 ? 'Location Detected Successfully' : 'Detect My Location (for Blood Network)'}
                                </button>

                                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
                                    <div className="flex items-center gap-2 text-gray-700 font-semibold text-sm">
                                        <FaShieldAlt className="text-indigo-500" /> Email verification
                                    </div>
                                    {!otpSent ? (
                                        <button type="button" onClick={handleSendOtp} disabled={otpLoading}
                                            className="w-full py-2.5 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 text-sm">
                                            {otpLoading ? 'Sending…' : 'Send verification code to email'}
                                        </button>
                                    ) : (
                                        <div className="space-y-2">
                                            <label className="block text-xs font-semibold text-gray-600">Enter the 6-digit code sent to {form.email}</label>
                                            <input type="text" inputMode="numeric" maxLength={6}
                                                value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                                                className="w-full px-4 py-3 border border-gray-300 rounded-xl text-center text-2xl tracking-[0.5em] font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                                                placeholder="••••••" />
                                            <button type="button" onClick={handleSendOtp}
                                                disabled={resendIn > 0 || otpLoading}
                                                className="text-xs text-indigo-600 hover:underline disabled:text-gray-400 disabled:no-underline">
                                                {resendIn > 0 ? `Resend code in ${resendIn}s` : 'Resend code'}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}

                        <button type="submit" disabled={loading}
                            className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2 text-lg">
                            {loading ? (
                                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                                <>
                                    {isLogin ? <FaSignInAlt /> : <FaUserPlus />}
                                    {isLogin ? 'Sign In' : 'Create Account'}
                                </>
                            )}
                        </button>
                    </form>

                    <p className="text-center mt-6 text-gray-600">
                        {isLogin ? "Don't have an account?" : 'Already have an account?'}{' '}
                        <button onClick={switchMode}
                            className="text-indigo-600 font-semibold hover:underline">
                            {isLogin ? 'Sign Up' : 'Sign In'}
                        </button>
                    </p>
                </div>
            </div>

            <DonorDetailsModal
                open={donorModalOpen}
                onClose={() => setDonorModalOpen(false)}
                onSubmit={handleDonorSubmit}
                initial={{ donor_quantity_ml: form.donor_quantity_ml, donor_health_conditions: form.donor_health_conditions }}
            />
        </div>
    );
};

export default Login;
