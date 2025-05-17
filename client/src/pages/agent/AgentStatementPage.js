// client/src/pages/agent/AgentStatementPage.js
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../api/api'; // Ensure this path is correct
import { useAuth } from '../../context/AuthContext'; // Ensure this path is correct
import logoPath from '../../assets/CashPayLogo.png';

function AgentStatementPage() {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);

    const { user: currentAgent } = useAuth(); // Get the logged-in agent from context
    const navigate = useNavigate();
    const ITEMS_PER_PAGE = 20; // Number of transactions per page

    useEffect(() => {
        const fetchAgentStatement = async (currentPage) => {
            if (!currentAgent?._id) { // Check if currentAgent and its _id exist
                setLoading(false); // Stop loading if no agent context
                // setError("Agent session not found. Please login again."); // Optional error
                return;
            }
            setLoading(true);
            setError('');
            try {
                // The API interceptor should handle attaching the agentToken
                const { data } = await api.get(`/agent/statement?page=${currentPage}&limit=${ITEMS_PER_PAGE}`);
                setTransactions(data.transactions || []);
                setPage(data.page || 1);
                setTotalPages(data.totalPages || 1);
                setTotalItems(data.totalTransactions || 0);
            } catch (err) {
                setError(err.response?.data?.message || 'Failed to fetch agent statement.');
                console.error("Fetch agent statement error:", err);
            }
            setLoading(false);
        };

        fetchAgentStatement(page);
    }, [currentAgent, page]); // Re-fetch if currentAgent changes (e.g. on login) or page changes

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleString([], {
            month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true
        });
    };

    // Simplified Narration and Amount Details from Agent's Perspective
    const getTransactionDisplayDetails = (tx) => {
        if (!currentAgent?._id) return { narration: tx.type, amountText: `৳${tx.amount.toFixed(2)}`, amountColor: 'inherit' };

        let narration = tx.description || tx.type;
        let amountColor = '#333'; // Default text color
        let prefix = '';
        const agentIdStr = currentAgent._id.toString();

        const agentIsSender = tx.sender && tx.sender._id.toString() === agentIdStr && tx.senderModel === 'Agent';
        const agentIsReceiver = tx.receiver && tx.receiver._id.toString() === agentIdStr && tx.receiverModel === 'Agent';

        // Determine Credit (+) or Debit (-) for the Agent's E-WALLET
        if (agentIsReceiver) {
            amountColor = 'green';
            prefix = '+ ';
        } else if (agentIsSender) {
            amountColor = 'red';
            prefix = '- ';
        }

        // Generate Narration based on transaction type from agent's perspective
        switch (tx.type) {
            case 'Cash In Processed (Agent)': // Agent's e-wallet DECREASED (gave e-money to user for physical cash)
                narration = `Cash In to User: ${tx.receiver?.name || tx.receiverMobile || 'Unknown'}`;
                // This type means agent's e-wallet was the source for the user's e-wallet credit.
                // If 'sender' in this tx is the agent, then it's a debit for agent.
                // If model is agent's e-wallet decreases and user's increases:
                // amountColor = 'red'; prefix = '- '; (this depends on how backend modeled this flow for agent's e-wallet)
                // Let's assume 'Cash In Processed (Agent)' means agent's e-wallet balance decreased.
                if (tx.sender && tx.sender._id.toString() === agentIdStr) {
                     amountColor = 'red'; prefix = '- ';
                }
                break;
            case 'Agent Processed User Cashout': // Agent gave physical cash, agent's e-wallet INCREASED
                narration = `User Cash Out: ${tx.sender?.name || tx.senderMobile || 'Unknown User'}`;
                // Here agent is receiver of e-money
                if (tx.receiver && tx.receiver._id.toString() === agentIdStr) {
                    amountColor = 'green'; prefix = '+ ';
                }
                break;
            case 'Send Money': // If agent is the sender
                if (agentIsSender) {
                    narration = `Sent to ${tx.receiver?.name || tx.receiver?.shopName || tx.receiverMobile || 'Recipient'}`;
                }
                break;
            case 'Receive Money': // If agent is the receiver
                if (agentIsReceiver) {
                    narration = `Received from ${tx.sender?.name || tx.sender?.shopName || tx.senderMobile || 'Sender'}`;
                }
                break;
            case 'Agent Pay Bill for User':
                narration = tx.description || `Bill Pay for Acc: ${tx.receiverMobile}`;
                // This is a debit from agent's wallet
                if (agentIsSender) { amountColor = 'red'; prefix = '- '; }
                break;
            case 'Payment Received': // If the Agent acts as a Merchant and receives a payment
                if (agentIsReceiver) {
                    narration = `Payment from User: ${tx.sender?.name || tx.senderMobile || 'Unknown'}`;
                    amountColor = 'green'; prefix = '+ ';
                }
                break;
            // Add more cases if agents can perform other transaction types like Add Money to their own float, etc.
            default:
                // For types not specifically handled, rely on sender/receiver status for color
                if (!agentIsSender && !agentIsReceiver) { // Transaction doesn't directly involve agent's _id as sender/receiver
                    prefix = ''; // No +/-
                    amountColor = '#555'; // Neutral color
                }
                break;
        }
        return { narration, amountText: `${prefix}৳${tx.amount.toFixed(2)}`, amountColor };
    };

    if (loading && transactions.length === 0 && page === 1) {
        return (
            <div className="agent-page-layout agent-statement-page">
                <div className="agent-page-content" style={{ textAlign: 'center', paddingTop: '50px' }}>
                    <p>Loading statement...</p>
                </div>
            </div>
        );
    }

    if (!currentAgent) {
        return (
            <div className="agent-page-layout agent-statement-page">
                <div className="agent-page-content" style={{ textAlign: 'center', paddingTop: '50px' }}>
                    <p>Agent not loaded. Please try logging in again.</p>
                    <Link to="/agent/login">Go to Agent Login</Link>
                </div>
            </div>
        );
    }

    const backString = '←'

    return (
        <div className="agent-page-layout agent-statement-page">
            <div className="agent-page-top-section">
                <button onClick={() => navigate('/agent/dashboard')} className="agent-back-button">{backString}</button>
                {/* <img src={logoPath} alt="CashPay Logo" className="feature-page-logo" /> */}
                <h2 className="feature-page-heading agent-theme-heading">এজেন্ট স্টেটমেন্ট</h2>
            </div>

            <div className="agent-page-content">
                {error && <p className="error-message global-error">{error}</p>}

                {transactions.length === 0 && !loading && (
                    <p style={{ textAlign: 'center' }}>আপনার কোনো লেনদেন নেই।</p>
                )}

                {transactions.length > 0 && (
                    <div className="admin-table-wrapper" style={{ marginTop: '0px' }}> {/* Reusing admin table style wrapper */}
                        <table className="admin-table agent-table"> {/* Agent specific table style if needed */}
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Narration / Type</th>
                                    <th style={{textAlign: 'right'}}>Amount (৳)</th>
                                    {/* Replaced From/To with single Narration for simplicity from agent's view */}
                                    {/* <th>From</th> */}
                                    {/* <th>To</th> */}
                                    <th style={{textAlign: 'right'}}>Balance (৳)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {transactions.map(tx => {
                                    const display = getTransactionDisplayDetails(tx);
                                    return (
                                        <tr key={tx._id}>
                                            <td>{formatDate(tx.createdAt)}</td>
                                            <td>{display.narration}</td>
                                            <td style={{ textAlign: 'right', color: display.amountColor, fontWeight: 'bold' }}>
                                                {display.amountText}
                                            </td>
                                            <td style={{ textAlign: 'right' }}>
                                                {/* Display balanceAfterTransaction if it's relevant to the agent for this tx */}
                                                {/* This field in Transaction model is the balance of the PRIMARY actor of that record */}
                                                {(tx.sender?._id?.toString() === currentAgent._id.toString() || tx.receiver?._id?.toString() === currentAgent._id.toString()) && tx.balanceAfterTransaction !== null && tx.balanceAfterTransaction !== undefined
                                                    ? tx.balanceAfterTransaction.toFixed(2)
                                                    : 'N/A'
                                                }
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {totalPages > 1 && (
                    <div className="admin-pagination-controls" style={{ marginTop: '20px', paddingBottom: '10px' }}>
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
        </div>
    );
}

export default AgentStatementPage;