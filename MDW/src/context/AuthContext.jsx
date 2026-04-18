import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);
export const API_URL = 'http://127.0.0.1:5000';

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('token'));
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (token) {
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            axios.get(`${API_URL}/auth/me`)
                .then(res => setUser(res.data.user))
                .catch(() => {
                    localStorage.removeItem('token');
                    setToken(null);
                    setUser(null);
                })
                .finally(() => setLoading(false));
        } else {
            setLoading(false);
        }
    }, [token]);

    const login = async (email, password) => {
        const res = await axios.post(`${API_URL}/auth/login`, { email, password });
        const { token: newToken, user: userData } = res.data;
        localStorage.setItem('token', newToken);
        axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
        setToken(newToken);
        setUser(userData);
        return userData;
    };

    const register = async (formData) => {
        const res = await axios.post(`${API_URL}/auth/register`, formData);
        const { token: newToken, user: userData } = res.data;
        localStorage.setItem('token', newToken);
        axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
        setToken(newToken);
        setUser(userData);
        return userData;
    };

    const logout = () => {
        localStorage.removeItem('token');
        delete axios.defaults.headers.common['Authorization'];
        setToken(null);
        setUser(null);
    };

    const updateUser = (updates) => {
        setUser(prev => ({ ...prev, ...updates }));
    };

    const toggleDonate = async (willing, details = {}) => {
        const payload = { willing_to_donate: willing, ...details };
        const res = await axios.put(`${API_URL}/auth/toggle-donate`, payload);
        setUser(res.data.user);
        return res.data.user;
    };

    const updateProfile = async (payload) => {
        const res = await axios.put(`${API_URL}/auth/update-profile`, payload);
        setUser(res.data.user);
        return res.data.user;
    };

    const updateLocation = async (payload) => {
        const res = await axios.put(`${API_URL}/auth/update-location`, payload);
        setUser(res.data.user);
        return res.data.user;
    };

    return (
        <AuthContext.Provider value={{
            user, token, loading, login, register, logout,
            updateUser, toggleDonate, updateProfile, updateLocation
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within AuthProvider');
    return context;
};
