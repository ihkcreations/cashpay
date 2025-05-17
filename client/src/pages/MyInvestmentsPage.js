// client/src/pages/MyInvestmentsPage.js
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/api';
import { useAuth } from '../context/AuthContext';
import logoPath from '../assets/CashPayLogo.png';

function MyInvestmentsPage() {
    const [investments, setInvestments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const { user, updateUser } = useAuth();
    const navigate = useNavigate();

    const fetchMyInvestments = async () => {
        setLoading(true); setError('');
        try {
            const { data } = await api.get('/investments/my-investments');
            setInvestments(data);
        } catch (err) { setError(err.response?.data?.message || 'বিনিয়োগের তথ্য আনতে সমস্যা হয়েছে।');}
        setLoading(false);
    };

    useEffect(() => {
        if (user) fetchMyInvestments();
    }, [user]);

    const handleWithdraw = async (investmentId) => {
        if (!window.confirm("Are you sure you want to request withdrawal for this matured investment?")) return;
        setLoading(true); setError('');
        try {
            const { data } = await api.post(`/investments/${investmentId}/withdraw`);
            alert(data.message || "Withdrawal successful!");
            updateUser(prev => ({ ...prev, balance: data.newBalance }));
            fetchMyInvestments(); // Refresh
        } catch (err) {
            setError(err.response?.data?.message || "Withdrawal failed.");
        }
        setLoading(false);
    };

    const formatDate = (dateStr) => dateStr ? new Date(dateStr).toLocaleDateString() : 'N/A';

    if (loading && investments.length === 0) return <div className="feature-page-layout user-theme-bg"><div className="feature-page-content"><p>Loading your investments...</p></div></div>;

    const backString = '←'

    return (
        <div className="feature-page-layout user-theme-bg">
            <div className="feature-page-top-section user-theme-header">
                <button onClick={() => navigate('/app/make-investment')} className="back-button user-theme-back">{backString}</button>
                <img src={logoPath} alt="CashPay Logo" className="feature-page-logo" />
                <h2 className="feature-page-heading user-theme-heading">আমার ইনভেস্টমেন্ট</h2>
            </div>
            <div className="feature-page-content">
                {error && <p className="error-message global-error">{error}</p>}
                {!loading && investments.length === 0 && <p>আপনার কোনো সক্রিয় ইনভেস্টমেন্ট নেই। <Link to="/app/make-investment">নতুন ইনভেস্ট করুন</Link></p>}

                {investments.map(inv => (
                    <div key={inv._id} className="investment-item-card user-theme-card">
                        <p><strong>পরিমাণ:</strong> ৳{inv.investedAmount.toFixed(2)}</p>
                        <p><strong>প্ল্যান:</strong> {inv.investmentType.replace('_', ' ').toUpperCase()}</p>
                        <p><strong>স্ট্যাটাস:</strong> <span className={`status-badge status-${inv.status.toLowerCase()}`}>{inv.status.toUpperCase()}</span></p>
                        <p><strong>তারিখ:</strong> {formatDate(inv.investmentDate)}</p>
                        {inv.termMonths && <p><strong>মেয়াদ:</strong> {inv.termMonths} মাস</p>}
                        {inv.maturityDate && <p><strong>ম্যাচুরিটির তারিখ:</strong> {formatDate(inv.maturityDate)}</p>}
                        {inv.status === 'matured' && inv.profitEarned > 0 && <p><strong>মুনাফা:</strong> ৳{inv.profitEarned.toFixed(2)}</p>}
                        {inv.status === 'matured' && (
                            <button onClick={() => handleWithdraw(inv._id)} className="withdraw-button user-theme-button-alt" disabled={loading}>
                                টাকা উত্তোলন করুন
                            </button>
                        )}
                         {inv.status === 'payout_pending' && <p style={{color: 'orange'}}>উত্তোলনের অনুরোধ প্রক্রিয়াধীন।</p>}
                         {inv.status === 'withdrawn' && <p style={{color: 'green'}}>টাকা উত্তোলন সম্পন্ন হয়েছে ({formatDate(inv.payoutDate)})।</p>}
                    </div>
                ))}
            </div>
        </div>
    );
}
export default MyInvestmentsPage;