// client/src/pages/admin/AdminManageInvestmentsPage.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/api';
import { useAuth } from '../../context/AuthContext';

function AdminManageInvestmentsPage() {
    const [investments, setInvestments] = useState([]);
    const [selectedInvestment, setSelectedInvestment] = useState(null);
    const [filterStatus, setFilterStatus] = useState('active'); // Default to active investments
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const { user: adminUser } = useAuth();

    const fetchInvestments = async () => {
        setLoading(true); setError(''); setSuccessMessage('');
        try {
            let url = '/admin/data/investments';
            if (filterStatus) {
                url += `?status=${filterStatus}`;
            }
            const { data } = await api.get(url);
            setInvestments(data);
            if (selectedInvestment && !data.find(inv => inv._id === selectedInvestment._id)) {
                setSelectedInvestment(null);
            }
        } catch (err) { setError(err.response?.data?.message || 'Failed to fetch investments.'); }
        setLoading(false);
    };

    useEffect(() => {
        if (adminUser && (adminUser.role === 'admin' || adminUser.role === 'super_admin')) {
            fetchInvestments();
        }
    }, [filterStatus, adminUser]);

    const handleSelectInvestment = (investment) => setSelectedInvestment(investment);

    const handleProcessPayout = async (investmentId) => {
        if (!window.confirm("Are you sure you want to process payout for this investment? This will mark it as matured and calculate profit.")) return;
        setLoading(true); setError(''); setSuccessMessage('');
        try {
            // Admin might input actual return rate if it's variable, or system calculates based on plan
            // For now, backend /process-payout calculates based on stored expectedReturnRate
            const { data } = await api.put(`/admin/data/investments/${investmentId}/process-payout`);
            setSuccessMessage(data.message || 'Investment payout processed.');
            fetchInvestments(); // Refresh
             if (selectedInvestment?._id === investmentId) setSelectedInvestment(data.investment);
        } catch (err) { setError(err.response?.data?.message || 'Failed to process payout.'); }
        setLoading(false);
    };

    const formatDate = (dateStr) => dateStr ? new Date(dateStr).toLocaleDateString() : 'N/A';

    if (loading && investments.length === 0) return <div className="admin-content-area"><p>Loading investments...</p></div>;

    return (
        <div className="admin-manage-entities-page">
            <div className="admin-page-header">
                <h1>Manage Investments</h1>
                <select className="admin-filter-select" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                    <option value="">All Statuses</option>
                    <option value="active">Active</option>
                    <option value="matured">Matured (Ready for Payout)</option>
                    <option value="payout_pending">Payout Pending</option>
                    <option value="withdrawn">Withdrawn</option>
                </select>
            </div>

            {error && <p className="admin-error-message main-error">{error}</p>}
            {successMessage && <p className="admin-success-message main-success">{successMessage}</p>}

            <div className="admin-entities-layout-grid">
                <div className="admin-list-container">
                    <div className="admin-table-wrapper">
                        <table className="admin-table">
                            <thead><tr><th>User</th><th>Amount (৳)</th><th>Type</th><th>Status</th><th>Inv. Date</th><th>Maturity</th><th>Actions</th></tr></thead>
                            <tbody>
                                {investments.map(inv => (
                                    <tr key={inv._id} onClick={() => handleSelectInvestment(inv)} className={selectedInvestment?._id === inv._id ? 'selected-row' : ''}>
                                        <td>{inv.user?.name || inv.user?.mobileNumber || 'N/A'}</td>
                                        <td style={{textAlign:'right'}}>{inv.investedAmount?.toFixed(2)}</td>
                                        <td>{inv.investmentType?.replace('_', ' ').toUpperCase()}</td>
                                        <td><span className={`status-badge status-${inv.status?.toLowerCase()}`}>{inv.status?.toUpperCase()}</span></td>
                                        <td>{formatDate(inv.investmentDate)}</td>
                                        <td>{formatDate(inv.maturityDate)}</td>
                                        <td className="action-buttons">
                                            {(inv.status === 'active' || (inv.status === 'matured' && !inv.payoutDate)) && ( // Can process if active or matured but not yet paid out
                                                <button onClick={(e) => {e.stopPropagation(); handleProcessPayout(inv._id);}} className="action-btn process-payout-btn" title="Process Payout">⚙️💰</button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {investments.length === 0 && <tr><td colSpan="7" style={{ textAlign: 'center' }}>No investments found for this status.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                    {/* Pagination later */}
                </div>

                <div className="admin-entity-details-panel">
                    {selectedInvestment ? (
                        <>
                            <div className="details-header">
                                <h3>Investment Details</h3>
                                <span className={`status-badge status-${selectedInvestment.status?.toLowerCase()}`}>{selectedInvestment.status?.toUpperCase()}</span>
                            </div>
                            <div className="details-body">
                                <p><strong>User:</strong> {selectedInvestment.user?.name} ({selectedInvestment.user?.mobileNumber})</p>
                                <p><strong>Invested:</strong> ৳{selectedInvestment.investedAmount?.toFixed(2)}</p>
                                <p><strong>Type:</strong> {selectedInvestment.investmentType?.replace('_',' ').toUpperCase()}</p>
                                <p><strong>Invest. Date:</strong> {formatDate(selectedInvestment.investmentDate)}</p>
                                {selectedInvestment.termMonths && <p><strong>Term:</strong> {selectedInvestment.termMonths} months</p>}
                                {selectedInvestment.maturityDate && <p><strong>Maturity Date:</strong> {formatDate(selectedInvestment.maturityDate)}</p>}
                                <p><strong>Exp. Return Rate:</strong> {(selectedInvestment.expectedReturnRate * 100).toFixed(2)}%</p>
                                <p><strong>Profit Earned:</strong> ৳{selectedInvestment.profitEarned?.toFixed(2)}</p>
                                <p><strong>Total Payout:</strong> ৳{selectedInvestment.totalPayoutAmount?.toFixed(2)}</p>
                                {selectedInvestment.payoutDate && <p><strong>Payout Date:</strong> {formatDate(selectedInvestment.payoutDate)}</p>}
                                <p><strong>Inv. TxID:</strong> {selectedInvestment.investmentTransactionId}</p>
                                {selectedInvestment.payoutTransactionId && <p><strong>Payout TxID:</strong> {selectedInvestment.payoutTransactionId}</p>}
                            </div>
                             <div className="details-actions">
                                 {(selectedInvestment.status === 'active' || (selectedInvestment.status === 'matured' && !selectedInvestment.payoutDate)) && (
                                    <button onClick={() => handleProcessPayout(selectedInvestment._id)} className="admin-action-button process-payout">
                                        Process Payout & Mark Matured
                                    </button>
                                )}
                                {selectedInvestment.status === 'matured' && selectedInvestment.payoutDate && <p>Payout processed. User can withdraw.</p>}
                            </div>
                        </>
                    ) : <p className="no-selection-message">Select an investment to view details.</p>}
                </div>
            </div>
        </div>
    );
}
export default AdminManageInvestmentsPage;