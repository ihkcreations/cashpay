// client/src/pages/MyLoansPage.js
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/api';
import { useAuth } from '../context/AuthContext';
import logoPath from '../assets/CashPayLogo.png';

function MyLoansPage() {
    const [loanRequests, setLoanRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [repayAmount, setRepayAmount] = useState('');
    const [selectedLoanForRepay, setSelectedLoanForRepay] = useState(null);
    const { user, updateUser } = useAuth();
    const navigate = useNavigate();

    const fetchMyLoans = async () => {
        setLoading(true);
        setError('');
        try {
            const { data } = await api.get('/loans/my-requests');
            setLoanRequests(data);
        } catch (err) {
            setError(err.response?.data?.message || 'লোনের তথ্য আনতে সমস্যা হয়েছে।');
        }
        setLoading(false);
    };

    useEffect(() => {
        if (user) fetchMyLoans();
    }, [user]);

    const handleRepaySubmit = async (e) => {
        e.preventDefault();
        if (!selectedLoanForRepay || !repayAmount) return;
        setLoading(true);
        setError('');
        try {
            const numericRepay = parseFloat(repayAmount);
            const { data } = await api.post(`/loans/${selectedLoanForRepay._id}/repay`, { amountToRepay: numericRepay });
            alert(data.message || "Repayment successful!");
            updateUser(prev => ({ ...prev, balance: data.newBalance })); // Update balance
            fetchMyLoans(); // Refresh loan list
            setSelectedLoanForRepay(null);
            setRepayAmount('');
        } catch (err) {
            setError(err.response?.data?.message || "Repayment failed.");
        }
        setLoading(false);
    };

    const formatDate = (dateStr) => dateStr ? new Date(dateStr).toLocaleDateString() : 'N/A';

    if (loading && loanRequests.length === 0) return <div className="feature-page-layout user-theme-bg"><div className="feature-page-content"><p>Loading your loan requests...</p></div></div>;

    const backString = '←'

    return (
        <div className="feature-page-layout user-theme-bg">
            <div className="feature-page-top-section user-theme-header">
                <button onClick={() => navigate('/app/request-loan')} className="back-button user-theme-back">{backString}</button>
                <img src={logoPath} alt="CashPay Logo" className="feature-page-logo" />
                <h2 className="feature-page-heading user-theme-heading">আমার লোনসমূহ</h2>
            </div>

            <div className="feature-page-content">
                {error && <p className="error-message global-error">{error}</p>}
                {!loading && loanRequests.length === 0 && <p>আপনার কোনো লোনের আবেদন নেই। <Link to="/app/request-loan">নতুন আবেদন করুন</Link></p>}

                {loanRequests.map(loan => (
                    <div key={loan._id} className="loan-item-card user-theme-card">
                        <p><strong>পরিমাণ:</strong> ৳{loan.requestedAmount.toFixed(2)} {loan.approvedAmount && loan.approvedAmount !== loan.requestedAmount ? `(অনুমোদিত: ৳${loan.approvedAmount.toFixed(2)})` : ''}</p>
                        <p><strong>স্ট্যাটাস:</strong> <span className={`status-badge status-${loan.status.toLowerCase()}`}>{loan.status.toUpperCase()}</span></p>
                        <p><strong>আবেদনের তারিখ:</strong> {formatDate(loan.requestedAt)}</p>
                        {loan.approvedAmount && <p><strong>পরিশোধিত:</strong> ৳{loan.repaidAmount.toFixed(2)} / ৳{loan.approvedAmount.toFixed(2)}</p>}
                        {loan.dueDate && <p><strong>শেষ তারিখ:</strong> {formatDate(loan.dueDate)}</p>}
                        {loan.reason && <p><strong>কারণ:</strong> {loan.reason}</p>}

                        {(loan.status === 'disbursed' || loan.status === 'repaying') && !selectedLoanForRepay && (
                             <button onClick={() => setSelectedLoanForRepay(loan)} className="repay-button user-theme-button-alt">
                                 পরিশোধ করুন
                             </button>
                        )}
                    </div>
                ))}

                {selectedLoanForRepay && (
                    <div className="repayment-form-card user-theme-card">
                        <h3>লোন পরিশোধ: {selectedLoanForRepay.requestedAmount.toFixed(2)}</h3>
                        <form onSubmit={handleRepaySubmit}>
                            <div className="input-group">
                                <label htmlFor="repayAmount">পরিশোধের পরিমাণ (৳)</label>
                                <input type="number" id="repayAmount" className="standard-input" value={repayAmount} onChange={e => setRepayAmount(e.target.value)} min="1" max={selectedLoanForRepay.approvedAmount - selectedLoanForRepay.repaidAmount} required/>
                            </div>
                            <div className="repayment-actions">
                                <button type="submit" className="feature-page-next-button user-theme-button" disabled={loading}>{loading ? "প্রসেসিং..." : "পরিশোধ করুন"}</button>
                                <button type="button" onClick={() => setSelectedLoanForRepay(null)} className="cancel-button user-theme-button-outline">বাতিল</button>
                            </div>
                        </form>
                    </div>
                )}
            </div>
            {/* No fixed bottom bar for this list page, actions are per item */}
        </div>
    );
}
export default MyLoansPage;