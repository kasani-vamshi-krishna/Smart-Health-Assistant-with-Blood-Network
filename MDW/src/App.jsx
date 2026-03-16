import React from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Diabetes from './pages/Diabetes';
import Heart from './pages/Heart';
import Parkinsons from './pages/Parkinsons';
import BloodNetwork from './pages/BloodNetwork';

const ProtectedRoute = ({ children }) => {
    const { user, loading } = useAuth();
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <p className="mt-4 text-gray-600 font-medium">Loading...</p>
                </div>
            </div>
        );
    }
    return user ? children : <Navigate to="/login" />;
};

const AppLayout = () => {
    return (
        <div className="flex h-screen bg-gray-50 font-sans">
            <Sidebar />
            <main className="flex-1 flex overflow-hidden">
                <Routes>
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/diabetes" element={<Diabetes />} />
                    <Route path="/heart" element={<Heart />} />
                    <Route path="/parkinsons" element={<Parkinsons />} />
                    <Route path="/blood-network" element={<BloodNetwork />} />
                    <Route path="*" element={<Navigate to="/dashboard" />} />
                </Routes>
            </main>
        </div>
    );
};

function App() {
    return (
        <Router>
            <AuthProvider>
                <Routes>
                    <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
                    <Route path="/*" element={<ProtectedRoute><AppLayout /></ProtectedRoute>} />
                </Routes>
            </AuthProvider>
        </Router>
    );
}

const PublicRoute = ({ children }) => {
    const { user, loading } = useAuth();
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }
    return user ? <Navigate to="/dashboard" /> : children;
};

export default App;
