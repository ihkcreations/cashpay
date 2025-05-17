// client/src/pages/admin/AdminPasswordResetPage.js
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../api/api';
import logoPath from '../../assets/CashPayLogo.png';
import { useOtpDisplay } from '../../context/OtpDisplayContext';

function AdminPasswordResetPage() {
    const { showOtpOnScreen } = useOtpDisplay();
    const [step, setStep] = useState(1); // 1 for request OTP, 2 for reset with OTP
    const [username, setUsername] = useState('');
    const [otpCode, setOtpCode] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleRequestOtp = async (e) => {
        if(e) e.preventDefault();
        setError('');
        setMessage('');
        setLoading(true);
        try {
            const { data } = await api.post('/admin/auth/request-password-reset', { username });
            setMessage(data.message);
            if (data.prototypeOtp) { // Check if backend sent it
                showOtpOnScreen(data.prototypeOtp);
            }
            setStep(2); // Move to OTP and new password input
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to request OTP.');
        }
        setLoading(false);
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');
        if (newPassword !== confirmNewPassword) {
            setError("New passwords do not match.");
            return;
        }
        // Add other validations for OTP, password strength
        setLoading(true);
        try {
            const { data } = await api.post('/admin/auth/reset-password', { username, otpCode, newPassword });
            setMessage(data.message + " Redirecting to login...");
            setTimeout(() => {
                navigate('/admin/login');
            }, 3000);
        } catch (err) {
            setError(err.response?.data?.message || 'Password reset failed.');
        }
        setLoading(false);
    };


    return (
        <div className="admin-auth-page">
            <div className="admin-auth-sidebar">
                 <img src={logoPath} alt="CashPay Logo" className="admin-auth-logo" />
                <h1 className="admin-auth-welcome-title">স্বাগতম</h1>
                <p className="admin-auth-welcome-subtitle">ক্যাশেপে এডমিন প্যানেল</p>
            </div>
            <div className="admin-auth-form-container">
                <div className="admin-auth-form-card">
                    <h2 className="admin-form-title">Password Reset</h2>
                    <p className="admin-form-subtitle">ক্যাশেপে ড্যাশবোর্ড</p>

                    {step === 1 && (
                        <form onSubmit={handleRequestOtp}>
                            <div className="admin-input-group">
                                <input type="text" placeholder="admin_control1 (Username)" className="admin-input" value={username} onChange={(e) => setUsername(e.target.value)} required />
                            </div>
                            {error && <p className="admin-error-message">{error}</p>}
                            {message && <p className="admin-success-message">{message}</p>}
                            <button type="submit" className="admin-submit-button" disabled={loading}>
                                {loading ? 'Sending OTP...' : 'Send OTP'}
                            </button>
                        </form>
                    )}

                    {step === 2 && (
                        <form onSubmit={handleResetPassword}>
                            <p style={{textAlign: 'center', marginBottom: '15px'}}>OTP sent to contact for: <strong>{username}</strong></p>
                             <div className="admin-input-group admin-otp-group">
                                 <input type="text" placeholder="OTP from Super Admin/Email" className="admin-input otp-input" value={otpCode} onChange={(e) => setOtpCode(e.target.value)} required maxLength="8" />
                            </div>
                            <div className="admin-input-group">
                                <input type="password" placeholder="New Password" className="admin-input" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
                            </div>
                            <div className="admin-input-group">
                                <input type="password" placeholder="Confirm New Password" className="admin-input" value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)} required />
                            </div>
                            {error && <p className="admin-error-message">{error}</p>}
                            {message && <p className="admin-success-message">{message}</p>}
                            <button type="submit" className="admin-submit-button" disabled={loading}>
                                {loading ? 'Resetting...' : 'Reset Password'}
                            </button>
                        </form>
                    )}
                    <div className="admin-form-footer">
                        <Link to="/admin/login" className="admin-forgot-password-link">Login?</Link>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default AdminPasswordResetPage;