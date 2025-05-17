// client/src/pages/admin/AdminWelcomeLoginPage.js
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext'; // To potentially store admin token
import api from '../../api/api'; // For API calls
import logoPath from '../../assets/CashPayLogo.png';

function AdminWelcomeLoginPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { generalLogin, loading: authLoading } = useAuth();

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const callAdminLoginApi = (credentials) => api.post('/admin/auth/login', credentials);
            await generalLogin(callAdminLoginApi, 'adminToken', { username, password });
            navigate('/admin/dashboard');
        } catch (err) {
            setError(err.response?.data?.message || 'Login failed. Please check credentials.');
        }
        setLoading(false);
    };

    if (authLoading && !loading) return null;

    return (
        <div className="admin-auth-page">
            <div className="admin-auth-sidebar">
                <img src={logoPath} alt="CashPay Logo" className="admin-auth-logo" />
                <h1 className="admin-auth-welcome-title">স্বাগতম</h1>
                <p className="admin-auth-welcome-subtitle">ক্যাশপে এডমিন প্যানেল</p>
                <hr className="admin-auth-divider" />
                <p className="admin-auth-apply-prompt">নতুন Admin Account এর জন্য আবেদন?</p>
                <Link to="/admin/apply" className="admin-auth-apply-button">Apply Now</Link>
            </div>
            <div className="admin-auth-form-container">
                <div className="admin-auth-form-card">
                    <h2 className="admin-form-title">লগইন</h2>
                    <p className="admin-form-subtitle">ক্যাশপে ড্যাশবোর্ড</p>
                    <form onSubmit={handleLogin}>
                        <div className="admin-input-group">
                            <input
                                type="text"
                                id="username"
                                placeholder="Username"
                                className="admin-input"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                            />
                        </div>
                        <div className="admin-input-group">
                            <input
                                type="password"
                                id="password"
                                placeholder="Password"
                                className="admin-input"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                        {error && <p className="admin-error-message">{error}</p>}
                        <button type="submit" className="admin-submit-button" disabled={loading}>
                            {loading ? 'Logging in...' : 'Login'}
                        </button>
                        <div className="admin-form-footer">
                            <Link to="/admin/forgot-password" className="admin-forgot-password-link">
                                Password ভুলে গিয়েছেন?
                            </Link>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default AdminWelcomeLoginPage;