// client/src/pages/admin/AdminTransactionsHistoryPage.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom'; // If any links are needed
import api from '../../api/api';
import { useAuth } from '../../context/AuthContext'; // For admin role check

function AdminTransactionsHistoryPage() {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalTransactions, setTotalTransactions] = useState(0);
    const { user: adminUser } = useAuth(); // Get logged-in admin

    const TRANSACTIONS_PER_PAGE = 20; // Or make this configurable

    const fetchTransactions = async (currentPage) => {
        setLoading(true);
        setError('');
        try {
            const { data } = await api.get(`/admin/data/transactions?page=${currentPage}&limit=${TRANSACTIONS_PER_PAGE}`);
            setTransactions(data.transactions || []); // data.transactions should be the formatted list
            setPage(data.page || 1);
            setTotalPages(data.totalPages || 1);
            setTotalTransactions(data.totalTransactions || 0);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to fetch transactions.');
            console.error("Fetch transactions error:", err);
        }
        setLoading(false);
    };

    useEffect(() => {
        if (adminUser && (adminUser.role === 'admin' || adminUser.role === 'super_admin')) {
            fetchTransactions(page);
        }
    }, [page, adminUser]); // Refetch when page or adminUser changes

    const handleClearAllTransactions = async () => {
        if (!window.confirm("ARE YOU ABSOLUTELY SURE you want to delete ALL transaction history? This action is irreversible!")) {
            return;
        }
        if (!window.confirm("SECOND CONFIRMATION: This will permanently erase all transaction records. Proceed?")) {
            return;
        }

        setLoading(true);
        setError('');
        try {
            const { data } = await api.delete('/admin/data/transactions/all');
            alert(data.message || "All transactions cleared successfully.");
            fetchTransactions(1); // Refresh to page 1
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to clear transactions.');
        }
        setLoading(false);
    };

    // Helper to format date for display
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
    };

    // Helper to create display name for From/To based on backend's prep or raw data
    const getPartyDisplay = (party, partyMobile, partyType, txType, isSenderField) => {
        if (txType === 'Add Money') {
            return isSenderField ? 'External (Bank/Card)' : `User: ${party?.name || partyMobile || 'Self'}`;
        }
        if (txType === 'Mobile Recharge') {
            return isSenderField ? `User: ${party?.name || partyMobile}` : `Number: ${partyMobile || party?.description || 'N/A'}`;
        }
        if (txType === 'Cashout') {
            return isSenderField ? `User: ${party?.name || partyMobile}` : `Agent: ${partyMobile || party?.description || 'N/A'}`;
        }
        if (txType === 'Pay Bill') {
             return isSenderField ? `User: ${party?.name || partyMobile}` : `Biller: ${partyMobile || party?.description || 'N/A'}`;
        }

        // General cases for Send Money, Payment, etc.
        if (party) {
            if (party.role === 'user') return `User: ${party.name || party.mobileNumber}`;
            if (party.role === 'agent') return `Agent: ${party.shopName || party.name || party.mobileNumber}`;
            if (party.merchantName) return `Merchant: ${party.merchantName} (${party.merchantId || party.mobileNumber})`;
            // Fallback for other types or if role/type not clear on populated object
            return `${party.name || party.username || party.mobileNumber || 'System Entity'}`;
        }
        if (partyMobile) return `Ext: ${partyMobile}`;
        return 'System/N/A';
    };


    if (loading && transactions.length === 0) {
        return <div className="admin-content-area"><p>Loading transaction history...</p></div>;
    }

    return (
        <div className="admin-manage-entities-page admin-transactions-history-page"> {/* Reusing class for overall page structure */}
            <div className="admin-page-header">
                <h1>Transactions History</h1>
                <div className="admin-page-actions">
                    {/* Add search/filter inputs here later if needed */}
                    {adminUser?.role === 'super_admin' && (
                        <button onClick={handleClearAllTransactions} className="admin-delete-button danger" disabled={loading}>
                            Clear All Transactions History
                        </button>
                    )}
                </div>
            </div>

            {error && <p className="admin-error-message main-error">{error}</p>}

            <div className="admin-list-container" style={{ flex: '1' }}> {/* Allow table to take more space */}
                <div className="admin-table-wrapper">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Type</th>
                                <th>Amount (৳)</th>
                                <th>Fee (৳)</th>
                                <th>From</th>
                                <th>To</th>
                                <th>Description</th>
                                {/* <th>Transaction ID</th> */}
                            </tr>
                        </thead>
                        <tbody>
                            {transactions.length > 0 ? (
                                transactions.map(tx => (
                                    <tr key={tx._id}>
                                        <td>{formatDate(tx.createdAt)}</td>
                                        <td>{tx.type}</td>
                                        <td style={{textAlign: 'right'}}>{tx.amount?.toFixed(2)}</td>
                                        <td style={{textAlign: 'right'}}>{tx.fee?.toFixed(2) || '0.00'}</td>
                                        <td>
                                            {tx.fromDisplay || getPartyDisplay(tx.sender, tx.senderMobile, tx.senderModel, tx.type, true)}
                                        </td>
                                        <td>
                                            {tx.toDisplay || getPartyDisplay(tx.receiver, tx.receiverMobile, tx.receiverModel, tx.type, false)}
                                            {/* Logic for "Self" if sender and receiver are the same user for certain types */}
                                            {(tx.type === 'Add Money' && tx.sender === null && tx.receiver && tx.receiver._id) ? '(Self)' : ''}
                                        </td>
                                        <td>{tx.description}</td>
                                        {/* <td>{tx._id}</td> */}
                                    </tr>
                                ))
                            ) : (
                                <tr><td colSpan="7" style={{ textAlign: 'center' }}>No transactions found.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
                {/* Pagination Controls */}
                {totalPages > 1 && (
                    <div className="admin-pagination-controls">
                        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1 || loading}>
                            Previous
                        </button>
                        <span> Page {page} of {totalPages} (Total: {totalTransactions}) </span>
                        <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages || loading}>
                            Next
                        </button>
                    </div>
                )}
            </div>
            {/* No details panel needed for this page as per screenshot */}
        </div>
    );
}

export default AdminTransactionsHistoryPage;