// client/src/pages/MakeInvestmentPage.js
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/api';
import { useAuth } from '../context/AuthContext';
import logoPath from '../assets/CashPayLogo.png';

function MakeInvestmentPage() {
    const [investedAmount, setInvestedAmount] = useState('');
    const [investmentType, setInvestmentType] = useState('standard_yield'); // Example
    // const [termMonths, setTermMonths] = useState(''); // If you have terms
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const { user, updateUser } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');
        const numericAmount = parseFloat(investedAmount);
        if (isNaN(numericAmount) || numericAmount <= 0) {
            setError('অনুগ্রহ করে সঠিক পরিমাণ লিখুন।');
            return;
        }
        if (user && user.balance < numericAmount) {
            setError('অপর্যাপ্ত ব্যালেন্স।');
            return;
        }

        setLoading(true);
        try {
            const payload = { investedAmount: numericAmount, investmentType /*, termMonths: parseInt(termMonths) || null */ };
            const { data } = await api.post('/investments/new', payload);
            setMessage(data.message || 'বিনিয়োগ সফল হয়েছে।');
            updateUser(prev => ({ ...prev, balance: data.newBalance }));
            setInvestedAmount('');
            // setInvestmentType('standard_yield');
            // setTermMonths('');
            setTimeout(() => navigate('/app/my-investments'), 2500);
        } catch (err) {
            setError(err.response?.data?.message || 'বিনিয়োগ করতে সমস্যা হয়েছে।');
        }
        setLoading(false);
    };

    if (!user) return <p>Please login to make an investment.</p>;

    const backString = '←'

    return (
        <div className="feature-page-layout user-theme-bg">
            <div className="feature-page-top-section user-theme-header">
                <button onClick={() => navigate('/app')} className="back-button user-theme-back">{backString}</button>
                <img src={logoPath} alt="CashPay Logo" className="feature-page-logo" />
                <h2 className="feature-page-heading user-theme-heading">ইনভেস্ট করুন</h2>
            </div>
            <div className="feature-page-content">
                {error && <p className="error-message global-error">{error}</p>}
                {message && <p className="success-message global-success">{message}</p>}
                <form onSubmit={handleSubmit}>
                    <div className="input-group">
                        <label htmlFor="investmentType">ইনভেস্টমেন্ট প্ল্যান</label>
                        <select id="investmentType" className="standard-input" value={investmentType} onChange={e => setInvestmentType(e.target.value)}>
                            <option value="standard_yield">স্ট্যান্ডার্ড ইয়েল্ড (প্রোটোটাইপ)</option>
                            {/* Add more plan options here later */}
                        </select>
                    </div>
                    {/* Example if you add termMonths
                    <div className="input-group">
                        <label htmlFor="termMonths">Term (Months)</label>
                        <input type="number" id="termMonths" className="standard-input" value={termMonths} onChange={e => setTermMonths(e.target.value)} placeholder="e.g., 12" />
                    </div>
                    */}
                    <div className="input-group">
                        <label htmlFor="investedAmount">বিনিয়োগের পরিমাণ (৳)</label>
                        <input type="number" id="investedAmount" className="standard-input" value={investedAmount} onChange={e => setInvestedAmount(e.target.value)} placeholder="ন্যূনতম ৫০০" required min="500"/>
                    </div>
                    <p className="available-balance">ব্যবহারযোগ্য ব্যালেন্স: ৳ {user?.balance?.toFixed(2) || '0.00'}</p>

                    <div>
                        {/* take to my investment page */}
                        <Link to="/app/my-investments" className="link-to-my-investments">
                            <strong>আমার বিনিয়োগসমূহ</strong>
                        </Link>
                    </div>

                    <div className="feature-page-bottom-section user-theme-footer">
                        <button type="submit" className="feature-page-next-button user-theme-button" disabled={loading}>
                            {loading ? 'প্রসেসিং...' : 'ইনভেস্ট করুন'}
                            {!loading && <span className="button-arrow user-theme-arrow">{' '}</span>}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
export default MakeInvestmentPage;