// client/src/pages/RequestLoanPage.js
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/api';
import { useAuth } from '../context/AuthContext'; // To ensure user is logged in
import logoPath from '../assets/CashPayLogo.png'; // Assuming logo path

function RequestLoanPage() {
    const [requestedAmount, setRequestedAmount] = useState('');
    const [reason, setReason] = useState('');
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const { user } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');

        const numericAmount = parseFloat(requestedAmount);
        if (isNaN(numericAmount) || numericAmount <= 0) {
            setError('অনুগ্রহ করে সঠিক পরিমাণ লিখুন।');
            return;
        }
        // Add min/max loan amount validation if desired

        setLoading(true);
        try {
            const payload = { requestedAmount: numericAmount, reason };
            const { data } = await api.post('/loans/request', payload); // API call
            setMessage(data.message || 'লোনের আবেদন সফলভাবে জমা হয়েছে।');
            setRequestedAmount('');
            setReason('');
            // Optional: Navigate to MyLoansPage after a delay
            setTimeout(() => navigate('/app/my-loans'), 2500);
        } catch (err) {
            setError(err.response?.data?.message || 'লোনের আবেদন জমা দিতে সমস্যা হয়েছে।');
        }
        setLoading(false);
    };

    if (!user) { // Should be caught by ProtectedRoute, but good fallback
        return <p>Please login to request a loan.</p>;
    }

    const backString = '←'

    return (
        <div className="feature-page-layout user-theme-bg"> {/* Use a class for user theme bg */}
            <div className="feature-page-top-section user-theme-header">
                <button onClick={() => navigate('/app')} className="back-button user-theme-back">{backString}</button>
                <img src={logoPath} alt="CashPay Logo" className="feature-page-logo" />
                <h2 className="feature-page-heading user-theme-heading">লোনের জন্য আবেদন</h2>
            </div>

            <div className="feature-page-content">
                {error && <p className="error-message global-error">{error}</p>}
                {message && <p className="success-message global-success">{message}</p>}

                <form onSubmit={handleSubmit}>
                    <div className="input-group">
                        <label htmlFor="requestedAmount">প্রয়োজনীয় অর্থের পরিমাণ (৳)</label>
                        <input
                            type="number"
                            id="requestedAmount"
                            className="standard-input"
                            value={requestedAmount}
                            onChange={(e) => setRequestedAmount(e.target.value)}
                            placeholder="৳: 5000"
                            required
                            min="100" // Example min
                        />
                    </div>
                    <div className="input-group">
                        <label htmlFor="reason">লোনের কারণ (ঐচ্ছিক)</label>
                        <textarea
                            id="reason"
                            className="standard-input"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="যেমন: ব্যবসার জন্য, ব্যক্তিগত প্রয়োজন"
                            rows="3"
                        />
                    </div>
                    {/* show my loan page link */}
                    <div >
                        <Link to="/app/my-loans" className="link-text user-theme-link">
                           <strong>আমার লোনের আবেদনসমূহ দেখুন</strong>
                        </Link>
                    </div>

                    <div className="feature-page-bottom-section user-theme-footer">
                        <button type="submit" className="feature-page-next-button user-theme-button" disabled={loading}>
                            {loading ? 'সাবমিট হচ্ছে...' : 'আবেদন জমা দিন'}
                            {!loading && <span className="button-arrow user-theme-arrow">{' '}</span>}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default RequestLoanPage;