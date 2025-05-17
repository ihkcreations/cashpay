// client/src/pages/admin/AdminManageLoansPage.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom'; // For potential links to user profiles
import api from '../../api/api';
import { useAuth } from '../../context/AuthContext';

function AdminManageLoansPage() {
    const [loanRequests, setLoanRequests] = useState([]);
    const [selectedLoan, setSelectedLoan] = useState(null);
    const [filterStatus, setFilterStatus] = useState('pending'); // Default to pending requests
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const { user: adminUser } = useAuth();

    // --- Pagination State ---
    const [page, setPage] = useState(1); // <<<< ADD THIS LINE: Initialize page state
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0); // Renamed from totalTransactions for clarity

    // For Approve Modal (if approving with specific amount/notes)
    const [showApproveModal, setShowApproveModal] = useState(false);
    const [loanToProcess, setLoanToProcess] = useState(null); // Loan being approved/rejected
    const [approvedAmount, setApprovedAmount] = useState('');
    const [adminNotes, setAdminNotes] = useState('');
    const [dueDate, setDueDate] = useState('');

     const ITEMS_PER_PAGE = 15; // Define items per page


    const fetchLoanRequests = async (currentPage) => {
        setLoading(true); setError(''); setSuccessMessage('');
        try {
            let url = `/admin/data/loan-requests?page=${currentPage}&limit=${ITEMS_PER_PAGE}`;
            if (filterStatus) {
                url += `&status=${filterStatus}`;
            }
            const { data } = await api.get(url);
            setLoanRequests(data.loanRequests || data || []); // Adjust based on backend response structure
            setPage(data.page || 1);
            setTotalPages(data.totalPages || 1);
            setTotalItems(data.totalLoanRequests || data.totalItems || 0); // Adjust based on backend

            if (selectedLoan && !(data.loanRequests || data || []).find(lr => lr._id === selectedLoan._id)) {
                setSelectedLoan(null);
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to fetch loan requests.');
        }
        setLoading(false);
    };

    useEffect(() => {
        if (adminUser && (adminUser.role === 'admin' || adminUser.role === 'super_admin')) {
            fetchLoanRequests();
        }
    }, [filterStatus, adminUser]);

    const handleSelectLoan = (loan) => {
        setSelectedLoan(loan);
        // Reset approve modal fields when selecting a new loan
        setApprovedAmount(loan.requestedAmount?.toString() || '');
        setAdminNotes(loan.adminNotes || '');
        setDueDate(loan.dueDate ? new Date(loan.dueDate).toISOString().split('T')[0] : '');
        setLoanToProcess(loan); // Set for potential modal use
    };

    const openApproveModal = (loan) => {
        setLoanToProcess(loan);
        setApprovedAmount(loan.requestedAmount.toString());
        setAdminNotes(''); // Clear notes for new approval
        setDueDate('');   // Clear due date
        setShowApproveModal(true);
    };

    const handleApprove = async (e) => {
        if (e) e.preventDefault(); // If called from form submit
        if (!loanToProcess) return;
        setLoading(true); setError(''); setSuccessMessage('');
        try {
            const payload = {
                approvedAmount: parseFloat(approvedAmount),
                adminNotes: adminNotes || undefined,
                dueDate: dueDate || undefined,
            };
            const { data } = await api.put(`/admin/data/loan-requests/${loanToProcess._id}/approve`, payload);
            setSuccessMessage(data.message || 'Loan approved successfully.');
            fetchLoanRequests(); // Refresh
            setShowApproveModal(false);
            setLoanToProcess(null);
             if (selectedLoan?._id === data.loanRequest?._id) setSelectedLoan(data.loanRequest);
        } catch (err) { setError(err.response?.data?.message || 'Failed to approve loan.'); }
        setLoading(false);
    };

    const handleReject = async (loanId) => {
        // const reason = prompt("Enter reason for rejection (optional):"); // Simple prompt for reason
        if (!window.confirm("Are you sure you want to reject this loan application?")) return;
        setLoading(true); setError(''); setSuccessMessage('');
        try {
            const { data } = await api.put(`/admin/data/loan-requests/${loanId}/reject`, { adminNotes: "Rejected by admin" /* Or get from prompt */ });
            setSuccessMessage(data.message || 'Loan rejected successfully.');
            fetchLoanRequests(); // Refresh
            if (selectedLoan?._id === loanId) setSelectedLoan(data.loanRequest);
        } catch (err) { setError(err.response?.data?.message || 'Failed to reject loan.'); }
        setLoading(false);
    };

    const handleDisburse = async (loanId) => {
        if (!window.confirm("Are you sure you want to mark this loan as disbursed? This will transfer funds to the user.")) return;
        setLoading(true); setError(''); setSuccessMessage('');
        try {
            const { data } = await api.post(`/admin/data/loan-requests/${loanId}/disburse`);
            setSuccessMessage(data.message || 'Loan disbursed successfully.');
            fetchLoanRequests(); // Refresh
            if (selectedLoan?._id === loanId) setSelectedLoan(data.loanRequest);
        } catch (err) { setError(err.response?.data?.message || 'Failed to disburse loan.'); }
        setLoading(false);
    };

    const formatDate = (dateStr) => dateStr ? new Date(dateStr).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'N/A';

    if (loading && loanRequests.length === 0) return <div className="admin-content-area"><p>Loading loan requests...</p></div>;

    return (
        <div className="admin-manage-entities-page">
            <div className="admin-page-header">
                <h1>Manage Loan Requests</h1>
                <div className="admin-page-actions">
                    <select 
                        className="admin-filter-select" 
                        value={filterStatus} 
                        onChange={(e) => {
                            setFilterStatus(e.target.value); 
                            setPage(1); // Reset to page 1 when filter changes
                        }}
                    >
                        <option value="">All Statuses</option>
                        <option value="pending">Pending</option>
                        <option value="approved">Approved</option>
                        <option value="disbursed">Disbursed</option>
                        <option value="repaying">Repaying</option>
                        <option value="repaid">Repaid</option>
                        <option value="rejected">Rejected</option>
                    </select>
                    {/* Search Input - TODO: Implement backend search or client-side filter for current page */}
                </div>
            </div>

            {error && <p className="admin-error-message main-error">{error}</p>}
            {successMessage && <p className="admin-success-message main-success">{successMessage}</p>}

            <div className="admin-entities-layout-grid">
                <div className="admin-list-container">
                    <div className="admin-table-wrapper">
                        {/* ... Table JSX (same as before) ... */}
                         <table className="admin-table">
                            <thead><tr><th>User</th><th>Requested (৳)</th><th>Reason</th><th>Status</th><th>Requested At</th><th>Actions</th></tr></thead>
                            <tbody>
                                {loanRequests.map(lr => (
                                    <tr key={lr._id} onClick={() => handleSelectLoan(lr)} className={selectedLoan?._id === lr._id ? 'selected-row' : ''}>
                                        <td>{lr.user?.name || lr.user?.mobileNumber || 'Unknown User'}</td>
                                        <td style={{textAlign:'right'}}>{lr.requestedAmount?.toFixed(2)}</td>
                                        <td>{lr.reason?.substring(0, 30) || 'N/A'}{lr.reason?.length > 30 ? '...' : ''}</td>
                                        <td><span className={`status-badge status-${lr.status?.toLowerCase()}`}>{lr.status?.toUpperCase()}</span></td>
                                        <td>{formatDate(lr.requestedAt)}</td>
                                        <td className="action-buttons">
                                            {lr.status === 'pending' && (
                                                <>
                                                    <button onClick={(e) => { e.stopPropagation(); openApproveModal(lr); }} className="action-btn approve-btn" title="Review & Approve">🔍✔️</button>
                                                    <button onClick={(e) => { e.stopPropagation(); handleReject(lr._id); }} className="action-btn reject-btn" title="Reject">❌</button>
                                                </>
                                            )}
                                            {lr.status === 'approved' && (
                                                <button onClick={(e) => { e.stopPropagation(); handleDisburse(lr._id); }} className="action-btn disburse-btn" title="Disburse Loan">💸</button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {loanRequests.length === 0 && !loading && <tr><td colSpan="6" style={{ textAlign: 'center' }}>No loan requests found for this status.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                        <div className="admin-pagination-controls">
                            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1 || loading}>
                                Previous
                            </button>
                            <span> Page {page} of {totalPages} (Total: {totalItems}) </span>
                            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages || loading}>
                                Next
                            </button>
                        </div>
                    )}
                </div>

                <div className="admin-entity-details-panel">
                    {selectedLoan ? (
                        <>
                            <div className="details-header">
                                <h3>Loan Request Details</h3>
                                <span className={`status-badge status-${selectedLoan.status?.toLowerCase()}`}>{selectedLoan.status?.toUpperCase()}</span>
                            </div>
                            <div className="details-body">
                                <p><strong>User:</strong> {selectedLoan.user?.name || selectedLoan.user?.mobileNumber}</p>
                                <p><strong>Requested:</strong> ৳{selectedLoan.requestedAmount?.toFixed(2)}</p>
                                {selectedLoan.approvedAmount && <p><strong>Approved:</strong> ৳{selectedLoan.approvedAmount?.toFixed(2)}</p>}
                                <p><strong>Reason:</strong> {selectedLoan.reason || 'N/A'}</p>
                                <p><strong>Repaid:</strong> ৳{selectedLoan.repaidAmount?.toFixed(2)}</p>
                                <p><strong>Requested At:</strong> {formatDate(selectedLoan.requestedAt)}</p>
                                {selectedLoan.approvedBy && <p><strong>Processed By:</strong> Admin {selectedLoan.approvedBy?.name || selectedLoan.approvedBy?.username}</p>}
                                {selectedLoan.adminActionAt && <p><strong>Processed At:</strong> {formatDate(selectedLoan.adminActionAt)}</p>}
                                {selectedLoan.disbursedAt && <p><strong>Disbursed At:</strong> {formatDate(selectedLoan.disbursedAt)}</p>}
                                {selectedLoan.dueDate && <p><strong>Due Date:</strong> {formatDate(selectedLoan.dueDate)}</p>}
                                {selectedLoan.adminNotes && <p><strong>Admin Notes:</strong> {selectedLoan.adminNotes}</p>}
                            </div>
                             <div className="details-actions">
                                {selectedLoan.status === 'pending' && (
                                    <>
                                        <button onClick={() => openApproveModal(selectedLoan)} className="admin-action-button approve">Review & Approve</button>
                                        <button onClick={() => handleReject(selectedLoan._id)} className="admin-action-button reject">Reject</button>
                                    </>
                                )}
                                {selectedLoan.status === 'approved' && (
                                     <button onClick={() => handleDisburse(selectedLoan._id)} className="admin-action-button disburse">Mark as Disbursed</button>
                                )}
                            </div>
                        </>
                    ) : <p className="no-selection-message">Select a loan request to view details.</p>}
                </div>
            </div>

            {showApproveModal && loanToProcess && (
                <div className="admin-modal-overlay">
                    <div className="admin-modal-content">
                        <h3>Approve Loan for {loanToProcess.user?.name || loanToProcess.user?.mobileNumber}</h3>
                        <p>Requested: ৳{loanToProcess.requestedAmount.toFixed(2)}</p>
                        <form onSubmit={handleApprove}>
                            <div className="admin-input-group">
                                <label htmlFor="approvedAmount">Approved Amount (৳)</label>
                                <input type="number" id="approvedAmount" className="admin-input" value={approvedAmount} onChange={(e) => setApprovedAmount(e.target.value)} required min="1"/>
                            </div>
                            <div className="admin-input-group">
                                <label htmlFor="dueDate">Repayment Due Date (Optional)</label>
                                <input type="date" id="dueDate" className="admin-input" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                            </div>
                            <div className="admin-input-group">
                                <label htmlFor="adminNotes">Admin Notes (Optional)</label>
                                <textarea id="adminNotes" className="admin-input" value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} rows="2" />
                            </div>
                            {error && <p className="admin-error-message">{error}</p>} {/* Modal specific error */}
                            <div className="admin-modal-actions">
                                <button type="submit" className="admin-submit-button" disabled={loading}>{loading ? 'Approving...' : 'Approve Loan'}</button>
                                <button type="button" className="admin-cancel-button" onClick={() => setShowApproveModal(false)} disabled={loading}>Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
}
export default AdminManageLoansPage;