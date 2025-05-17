// client/src/pages/admin/AdminApplyPage.js
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../api/api';
import logoPath from '../../assets/CashPayLogo.png';

function AdminApplyPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState(''); // For password confirmation
    const [name, setName] = useState(''); // Admin's full name
    const [superAdminOtp, setSuperAdminOtp] = useState('');
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    // Placeholder for requesting OTP from Super Admin - In a real app, this would be a backend call
    const handleRequestOtp = () => {
        setMessage('Super Admin OTP is "25684238');
        // In a real scenario, you might call an API here:
        // api.post('/admin/request-super-otp').then(...).catch(...);
    };


    const handleSubmitApplication = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');
        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }
        // Add other validations (e.g., password strength)
        setLoading(true);
        try {
            const { data } = await api.post('/admin/auth/apply', {
                username,
                password,
                name,
                superAdminOtp
            });
            setMessage(data.message + " You will be redirected to login shortly.");
            setTimeout(() => {
                navigate('/admin/login'); // Or a specific "application submitted" page
            }, 3000);
        } catch (err) {
            setError(err.response?.data?.message || 'Application failed. Please try again.');
        }
        setLoading(false);
    };

    return (
        <div className="admin-auth-page">
            <div className="admin-auth-sidebar">
                <img src={logoPath} alt="CashPay Logo" className="admin-auth-logo" />
                <h1 className="admin-auth-welcome-title">স্বাগতম</h1>
                <p className="admin-auth-welcome-subtitle">ক্যাশেপে এডমিন প্যানেল</p>
                {/* Sidebar content can be different for apply page if needed */}
            </div>
            <div className="admin-auth-form-container">
                <div className="admin-auth-form-card">
                    <h2 className="admin-form-title">Apply New Admin</h2>
                    <p className="admin-form-subtitle">ক্যাশেপে ড্যাশবোর্ড</p>
                    <form onSubmit={handleSubmitApplication}>
                        <div className="admin-input-group">
                            <input type="text" placeholder="admin_01 (Username)" className="admin-input" value={username} onChange={(e) => setUsername(e.target.value)} required />
                        </div>
                        <div className="admin-input-group">
                            <input type="password" placeholder="Password" className="admin-input" value={password} onChange={(e) => setPassword(e.target.value)} required />
                        </div>
                        <div className="admin-input-group">
                            <input type="password" placeholder="Confirm Password" className="admin-input" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
                        </div>
                         <div className="admin-input-group">
                            <input type="text" placeholder="Your Full Name" className="admin-input" value={name} onChange={(e) => setName(e.target.value)} required />
                        </div>
                        <div className="admin-input-group admin-otp-group">
                            <button type="button" onClick={handleRequestOtp} className="admin-request-otp-button">Request OTP from Super Admin</button>
                            <input type="text" placeholder="Super Admin OTP" className="admin-input otp-input" value={superAdminOtp} onChange={(e) => setSuperAdminOtp(e.target.value)} required maxLength="8" />
                        </div>

                        {error && <p className="admin-error-message">{error}</p>}
                        {message && <p className="admin-success-message">{message}</p>}

                        <button type="submit" className="admin-submit-button" disabled={loading}>
                            {loading ? 'Submitting...' : 'Request New Account'}
                        </button>
                        <div className="admin-form-footer">
                            <Link to="/admin/login" className="admin-forgot-password-link">Login?</Link>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
export default AdminApplyPage;