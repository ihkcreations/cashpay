// client/src/pages/StatementPage.js
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/api';
import { useAuth } from '../context/AuthContext'; // To get current user's ID
import logoPath from '../assets/CashPayLogo.png'; // Assuming logo path

function StatementPage() {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const { user } = useAuth(); // Get the logged-in user
    const navigate = useNavigate();

    // Pagination state (optional, but good for long statements)
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const ITEMS_PER_PAGE = 15; // Or your desired limit

    useEffect(() => {
        const fetchStatement = async (currentPage) => {
            if (!user) { // Ensure user is loaded before fetching
                setLoading(false); // Stop loading if no user
                return;
            }
            setLoading(true);
            setError('');
            try {
                // API endpoint might need to be updated if it's not /api/transactions/statement
                // Or if it requires userId (though protect middleware should handle it)
                // Also, add pagination query params
                const { data } = await api.get(`/transactions/statement?page=${currentPage}&limit=${ITEMS_PER_PAGE}`);

                // Assuming backend returns { transactions: [], page, totalPages, totalTransactions }
                setTransactions(data.transactions || []);
                setPage(data.page || 1);
                setTotalPages(data.totalPages || 1);

            } catch (err) {
                setError(err.response?.data?.message || 'Failed to fetch statement.');
                console.error("Error fetching statement:", err);
            }
            setLoading(false);
        };

        fetchStatement(page);
    }, [user, page]); // Refetch if user changes or page changes

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        // More concise date format for statements
        return new Date(dateString).toLocaleString([], {
            month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
        });
    };

    // Helper to determine transaction narration for the user
    const getNarration = (tx) => {
        if (!user) return tx.description || tx.type;

        const isSender = tx.sender && tx.sender._id === user._id;
        const isReceiver = tx.receiver && tx.receiver._id === user._id;

        switch (tx.type) {
            case 'Send Money':
                return `Sent to ${tx.receiver?.name || tx.receiverMobile || 'User'}`;
            case 'Receive Money':
                return `Received from ${tx.sender?.name || tx.senderMobile || 'User/Agent'}`;
            case 'Add Money':
                return 'Added Money to Wallet';
            case 'Payment':
                return `Paid to ${tx.receiver?.merchantName || tx.receiverMobile || 'Merchant'}`;
            case 'Payment Received': // User is a merchant receiving payment
                 return `Payment from ${tx.sender?.name || tx.senderMobile || 'User'}`;
            case 'Cashout': // User initiated cashout
                return `Cashed Out via Agent ${tx.receiverMobile || tx.receiver?.shopName || 'Agent'}`;
            case 'User Cashout via Agent': // This is the user's record when agent processes
                return `Cashed Out via Agent ${tx.receiver?.shopName || tx.receiverMobile || 'Agent'}`;
            case 'Cash In (User Received)': // User received cash-in from agent
                return `Cash In from Agent ${tx.sender?.shopName || tx.senderMobile || 'Agent'}`;
            case 'Mobile Recharge':
                return `Recharge for ${tx.receiverMobile || tx.description || 'Number'}`;
            case 'Pay Bill':
                return tx.description || `Bill Payment`;
            case 'Loan Disbursed':
                return 'Loan Amount Credited';
            case 'Loan Repayment':
                return 'Loan Repayment Made';
            case 'Investment Made':
                return 'Investment Made';
            case 'Investment Withdrawal':
                return 'Investment Withdrawn';
            case 'Investment Profit':
                 return 'Investment Profit Credited';
            default:
                return tx.description || tx.type;
        }
    };

    // Determine amount color and prefix
    const getAmountDetails = (tx) => {
        if (!user) return { text: tx.amount.toFixed(2), color: 'inherit', prefix: '' };

        let color = 'inherit';
        let prefix = '';

        // Debit conditions for the current user
        if (tx.sender && tx.sender._id === user._id) {
            if (['Send Money', 'Payment', 'Cashout', 'User Cashout via Agent', 'Mobile Recharge', 'Pay Bill', 'Loan Repayment', 'Investment Made'].includes(tx.type)) {
                color = 'red';
                prefix = '- ';
            }
        }
        // Credit conditions for the current user
        else if (tx.receiver && tx.receiver._id === user._id) {
            if (['Receive Money', 'Add Money', 'Cash In (User Received)', 'Loan Disbursed', 'Investment Withdrawal', 'Investment Profit', 'Payment Received'].includes(tx.type)) {
                color = 'green';
                prefix = '+ ';
            }
        }
        // For Add Money specifically, user is receiver
        else if (tx.type === 'Add Money' && (!tx.sender || (tx.receiver && tx.receiver._id === user._id))) {
            color = 'green';
            prefix = '+ ';
        }


        return { text: `${prefix}৳${tx.amount.toFixed(2)}`, color };
    };


    if (loading && transactions.length === 0 && page === 1) {
        return <div className="feature-page-layout user-theme-bg"><div className="feature-page-content" style={{textAlign: 'center'}}><p>Loading statement...</p></div></div>;
    }
     if (!user) { // Should be caught by ProtectedRoute
        return <div className="feature-page-layout user-theme-bg"><div className="feature-page-content" style={{textAlign: 'center'}}><p>Please login to view statement.</p></div></div>;
    }

    const backString = '←'

    return (
        <div className="feature-page-layout user-theme-bg statement-page">
            <div className="feature-page-top-section user-theme-header">
                <button onClick={() => navigate('/app')} className="back-button user-theme-back">{backString}</button>
                <img src={logoPath} alt="CashPay Logo" className="feature-page-logo" />
                <h2 className="feature-page-heading user-theme-heading">লেনদেন বিবরণী</h2> {/* Statement */}
            </div>

            <div className="feature-page-content">
                {error && <p className="error-message global-error">{error}</p>}
                
                {transactions.length === 0 && !loading && (
                    <p style={{textAlign: 'center'}}>কোনো লেনদেন খুঁজে পাওয়া যায়নি।</p>
                )}

                {transactions.length > 0 && (
                    <ul className="statement-list">
                        {transactions.map(tx => {
                            const amountDetails = getAmountDetails(tx);
                            return (
                                <li key={tx._id} className="statement-item">
                                    <div className="statement-item-main">
                                        <span className="statement-narration">{getNarration(tx)}</span>
                                        <span className="statement-amount" style={{ color: amountDetails.color }}>
                                            {amountDetails.text}
                                        </span>
                                    </div>
                                    <div className="statement-item-sub">
                                        <span className="statement-date">{formatDate(tx.createdAt)}</span>
                                        <span className="statement-balance">
                                            ব্যালেন্স: ৳{tx.balanceAfterTransaction !== null && tx.balanceAfterTransaction !== undefined ? tx.balanceAfterTransaction.toFixed(2) : 'N/A'}
                                        </span>
                                    </div>
                                    {tx.fee > 0 && (
                                        <div className="statement-item-fee">
                                            <span className="statement-fee">চার্জ: ৳{tx.fee.toFixed(2)}</span>
                                        </div>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                )}

                {totalPages > 1 && (
                    <div className="admin-pagination-controls" style={{ marginTop: '20px', paddingBottom: '10px' }}> {/* Reusing admin pagination style */}
                        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1 || loading}>
                            পূর্ববর্তী
                        </button>
                        <span> পৃষ্ঠা {page} / {totalPages} </span>
                        <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages || loading}>
                            পরবর্তী
                        </button>
                    </div>
                )}
            </div>
             {/* No fixed bottom bar unless you want one */}
        </div>
    );
}

export default StatementPage;