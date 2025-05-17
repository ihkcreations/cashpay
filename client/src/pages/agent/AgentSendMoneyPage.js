// client/src/pages/agent/AgentSendMoneyPage.js
import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../api/api';
import { useAuth } from '../../context/AuthContext';
import logoPath from '../../assets/CashPayLogo.png';

function AgentSendMoneyPage() {
    const [step, setStep] = useState(1);
    const [searchQuery, setSearchQuery] = useState('');
    const [allRecipients, setAllRecipients] = useState([]);
    const [filteredRecipients, setFilteredRecipients] = useState([]);
    const [selectedRecipient, setSelectedRecipient] = useState(null); // Will store { _id, mobileNumber, displayName, type: 'User'|'Agent' }
    const [amount, setAmount] = useState('');
    const [agentPin, setAgentPin] = useState(''); // Agent's own PIN
    const [reference, setReference] = useState('');

    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false); // For API call processing
    const [uiLoading, setUiLoading] = useState(false); // For fetching recipients list
    const [transactionDetails, setTransactionDetails] = useState(null); // For success screen

    const { user: currentAgent, updateUser: updateCurrentAgent } = useAuth(); // Agent's own data from context
    const navigate = useNavigate();

    const [confirmHoldTime, setConfirmHoldTime] = useState(0);
    const confirmIntervalRef = useRef(null);
    const CONFIRM_HOLD_DURATION = 3; // 3 seconds for confirmation

    // Fetch potential recipients (Active Users and other Active Agents)
    useEffect(() => {
        if (step === 1 && allRecipients.length === 0 && currentAgent?._id) {
            const fetchRecipients = async () => {
                setUiLoading(true);
                setError('');
                try {
                    // Use the new dedicated endpoint for agents
                const { data } = await api.get('/user/recipients-for-agent');
                // The backend now returns a combined list with 'type' and 'displayName'
                setAllRecipients(data || []);
                setFilteredRecipients(data || []);
                } catch (err) {
                    setError('প্রাপকের তালিকা লোড করতে সমস্যা হয়েছে।');
                    console.error("Error fetching recipients:", err);
                }
                setUiLoading(false);
            };
            fetchRecipients();
        }
    }, [step, currentAgent, allRecipients.length]);

    // Filter recipients based on search query
    useEffect(() => {
        if (step === 1) {
            if (searchQuery === '') {
                setFilteredRecipients(allRecipients);
            } else {
                const lowerQuery = searchQuery.toLowerCase();
                setFilteredRecipients(
                    allRecipients.filter(r =>
                        (r.displayName && r.displayName.toLowerCase().includes(lowerQuery)) ||
                        r.mobileNumber.includes(searchQuery)
                    )
                );
            }
        }
    }, [searchQuery, allRecipients, step]);

    const handleNextStep = () => {
        setError('');
        if (step === 1) {
            if (!selectedRecipient) {
                // Try to match searchQuery directly if nothing selected from list
                const directMatch = allRecipients.find(r => r.mobileNumber === searchQuery || (r.displayName && r.displayName.toLowerCase() === searchQuery.toLowerCase()));
                if (directMatch) {
                    setSelectedRecipient(directMatch);
                    setStep(2);
                } else if (/^(?:\+?88)?01[3-9]\d{8}$/.test(searchQuery)) {
                    // If it's a valid number format but not in list, create a temporary recipient object
                    // Backend will ultimately validate if this number corresponds to an active user/agent
                    setSelectedRecipient({ mobileNumber: searchQuery, displayName: `নাম্বার: ${searchQuery}`, type: 'Unknown' });
                    setStep(2);
                } else {
                    setError('অনুগ্রহ করে প্রাপক নির্বাচন করুন বা সঠিক নাম্বার দিন।');
                    return;
                }
            } else {
                 setStep(2);
            }
        } else if (step === 2) {
            const numAmount = parseFloat(amount);
            if (isNaN(numAmount) || numAmount <= 0) {
                setError('অনুগ্রহ করে সঠিক পরিমাণ লিখুন।'); return;
            }
            if (currentAgent && currentAgent.balance < numAmount) {
                setError('আপনার এজেন্ট একাউন্টে অপর্যাপ্ত ব্যালেন্স।'); return;
            }
            setStep(3);
        } else if (step === 3) {
            if (agentPin.length !== 5 || !/^\d{5}$/.test(agentPin)) {
                setError('অনুগ্রহ করে আপনার সঠিক ৫-সংখ্যার এজেন্ট পিন দিন।'); return;
            }
            setStep(4);
        }
    };

    const handleGoBack = () => {
        setError(''); setMessage('');
        if (step > 1 && step < 5) {
            setStep(prevStep => prevStep - 1);
            if (step === 2) setAmount('');
            if (step === 3) setAgentPin('');
            if (step === 4) {/* No specific reset for confirm data, re-evaluates */ }
        } else {
            navigate('/agent/dashboard');
        }
    };

    const handleSelectRecipient = (recipient) => {
        setSelectedRecipient(recipient);
        setSearchQuery(''); // Clear search
    };

    const handleConfirmMouseDown = () => {
        if (loading) return;
        if (confirmIntervalRef.current) clearInterval(confirmIntervalRef.current);
        setConfirmHoldTime(0); let chTime = 0;
        confirmIntervalRef.current = setInterval(() => {
            chTime++; setConfirmHoldTime(chTime);
            if (chTime >= CONFIRM_HOLD_DURATION) {
                if(confirmIntervalRef.current) clearInterval(confirmIntervalRef.current);
                handleAgentSendMoneyApiCall();
            }
        }, 1000);
    };

    const handleConfirmMouseUpOrLeave = () => {
        if (confirmIntervalRef.current) {
            clearInterval(confirmIntervalRef.current);
            confirmIntervalRef.current = null;
        }
        if (confirmHoldTime < CONFIRM_HOLD_DURATION && !loading) {
            setConfirmHoldTime(0);
        }
    };

    const handleAgentSendMoneyApiCall = async () => {
        setLoading(true); setError(''); setMessage('');
        try {
            const payload = {
                receiverMobile: selectedRecipient.mobileNumber,
                amount: parseFloat(amount),
                agentPin, // Agent's own PIN
                reference: reference || undefined
            };
            const { data } = await api.post('/agent/send-money', payload);
            setMessage(data.message || 'টাকা পাঠানো সফল হয়েছে!');
            if (data.agentNewBalance !== undefined) {
                updateCurrentAgent({ balance: data.agentNewBalance });
            }
            setTransactionDetails(data.transactionForAgent);
            setStep(5);
        } catch (err) {
            setError(err.response?.data?.message || 'টাকা পাঠাতে সমস্যা হয়েছে।');
            // setStep(3); // Stay on PIN page or go back to PIN? Let's stay and show error.
            setConfirmHoldTime(0);
        } finally {
            setLoading(false);
        }
    };

    

    const renderStepContent = () => {
        switch (step) {
            case 1: // Select Recipient (User or Agent)
                return (
                    <>
                        <div className="input-group">
                            <label htmlFor="searchQuery" className="input-label">প্রাপকের নাম বা নাম্বার দিন</label>
                            <input
                                type="tel" id="searchQuery" className="standard-input agent-input"
                                value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="নাম বা মোবাইল নাম্বার"
                            />
                        </div>
                        <h3 className="contact-list-header agent-text">প্রাপকের তালিকা</h3>
                        <div className="contact-list">
                            {uiLoading && <p style={{textAlign: 'center', padding: '10px'}}>লোড হচ্ছে...</p>}
                            {!uiLoading && filteredRecipients.length === 0 && !searchQuery && <p style={{textAlign: 'center', padding: '10px'}}>কোনো প্রাপক নেই।</p>}
                            {!uiLoading && filteredRecipients.length === 0 && searchQuery && <p style={{textAlign: 'center', padding: '10px'}}>এই নামে/নাম্বারে কাউকে খুঁজে পাওয়া যায়নি।</p>}
                            {filteredRecipients.map(r => (
                                <div key={r._id || r.mobileNumber}
                                     className={`contact-item ${selectedRecipient?.mobileNumber === r.mobileNumber ? 'selected-in-list' : ''}`}
                                     onClick={() => handleSelectRecipient(r)}>
                                    <span className="contact-avatar">{r.type === 'User' ? '👤' : '🏢'}</span>
                                    <div className="contact-details">
                                        <span className="contact-name">{r.displayName} ({r.type})</span>
                                        <span className="contact-number">{r.mobileNumber}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                );
            case 2: // Enter Amount
                return (
                    <>
                        <div className="recipient-display static">
                            <span className="label">প্রাপক</span>
                            <div className={`contact-item selected ${selectedRecipient?.type?.toLowerCase()}-selected`}>
                                <span className="contact-avatar">{selectedRecipient?.type === 'User' ? '👤' : '🏢'}</span>
                                <div className="contact-details">
                                    <span className="contact-name">{selectedRecipient?.displayName || selectedRecipient?.mobileNumber}</span>
                                    <span className="contact-number">{selectedRecipient?.mobileNumber}</span>
                                </div>
                            </div>
                        </div>
                        <div className="input-group amount-input-group agent-amount-input">
                            <label htmlFor="amount" className="visually-hidden">পরিমাণ</label>
                            <span className="taka-symbol">৳</span>
                            <input type="number" id="amount" className="amount-input" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" required min="1"/>
                        </div>
                        {currentAgent && (
                            <p className="available-balance large">
                                আপনার ব্যবহারযোগ্য ব্যালেন্স<br/>৳ {currentAgent.balance?.toFixed(2) || '0.00'}
                            </p>
                        )}
                    </>
                );
            case 3: // Enter Agent PIN & Reference
                return (
                    <>
                        <div className="recipient-display static">
                            <span className="label">প্রাপক</span>
                             <div className={`contact-item selected ${selectedRecipient?.type?.toLowerCase()}-selected`}>
                                <span className="contact-avatar">{selectedRecipient?.type === 'User' ? '👤' : '🏢'}</span>
                                <div className="contact-details">
                                    <span className="contact-name">{selectedRecipient?.displayName}</span>
                                    <span className="contact-number">{selectedRecipient?.mobileNumber}</span>
                                </div>
                            </div>
                        </div>
                        <div className="amount-display">
                            <span className="label">পরিমাণ</span>
                            <span className="amount-value">৳{parseFloat(amount)?.toFixed(2) || '0.00'}</span>
                        </div>
                        <div className="input-group">
                            <label htmlFor="agentPin" className="input-label centered-text">আপনার এজেন্ট পিন</label>
                            <input type="password" id="agentPin" className="pin-input large-dots agent-pin-input" value={agentPin} onChange={(e) => setAgentPin(e.target.value)} placeholder="● ● ● ● ●" maxLength="5" required />
                        </div>
                        <div className="input-group">
                            <label htmlFor="reference" className="input-label">রেফারেন্স (ঐচ্ছিক)</label>
                            <input type="text" id="reference" className="standard-input agent-input" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="যেমন: বন্ধুর জন্য" />
                        </div>
                    </>
                );
            case 4: // Confirmation
                return (
                    <>
                        <h2 className="feature-page-heading centered agent-theme-heading">সেন্ড মানি নিশ্চিত করুন</h2>
                        <div className="confirmation-details agent-theme-confirm">
                            <div className="confirmation-row">
                                <span className="label">প্রাপক:</span>
                                <div className={`contact-item selected small ${selectedRecipient?.type?.toLowerCase()}-selected`}>
                                    <span className="contact-avatar">{selectedRecipient?.type === 'User' ? '👤' : '🏢'}</span>
                                    <div className="contact-details">
                                        <span className="contact-name">{selectedRecipient?.displayName}</span>
                                        <span className="contact-number">{selectedRecipient?.mobileNumber} ({selectedRecipient?.type})</span>
                                    </div>
                                </div>
                            </div>
                            <div className="confirmation-grid">
                                <div className="grid-item"><span className="label">পরিমাণ</span><span className="value">৳{parseFloat(amount)?.toFixed(2)}</span></div>
                                <div className="grid-item"><span className="label">রেফারেন্স</span><span className="value">{reference || '-'}</span></div>
                                <div className="grid-item full-width new-balance-item"><span className="label">আপনার নতুন ব্যালেন্স হবে</span><span className="value large-value">৳{(currentAgent.balance - parseFloat(amount))?.toFixed(2)}</span></div>
                            </div>
                        </div>
                        <p className="confirm-instruction">সেন্ড মানি করতে নিচের বাটন ৩ সেকেন্ড ধরে রাখুন</p>
                    </>
                );
            case 5: // Success
                return (
                    <>
                        <h2 className="feature-page-heading centered success-heading agent-success-heading">সেন্ড মানি সফল</h2>
                        <div className="confirmation-details agent-theme-confirm">
                            <div className="confirmation-row">
                                <span className="label">প্রাপক:</span>
                                <div className={`contact-item selected small ${selectedRecipient?.type?.toLowerCase()}-selected`}>
                                    <span className="contact-avatar">{selectedRecipient?.type === 'User' ? '👤' : '🏢'}</span>
                                    <div className="contact-details">
                                        <span className="contact-name">{selectedRecipient?.displayName}</span>
                                        <span className="contact-number">{selectedRecipient?.mobileNumber} ({selectedRecipient?.type})</span>
                                    </div>
                                </div>
                            </div>
                            <div className="confirmation-grid">
                                <div className="grid-item"><span className="label">পরিমাণ</span><span className="value">৳{transactionDetails?.amount?.toFixed(2) || parseFloat(amount)?.toFixed(2)}</span></div>
                                <div className="grid-item"><span className="label">রেফারেন্স</span><span className="value">{transactionDetails?.description?.includes('Ref:') ? transactionDetails.description.split('Ref: ')[1]?.replace(')','') : (reference || '-')}</span></div>
                                <div className="grid-item"><span className="label">আপনার নতুন ব্যালেন্স</span><span className="value bold">৳{currentAgent?.balance?.toFixed(2)}</span></div>
                                <div className="grid-item"><span className="label">ট্রানজেকশন আইডি</span><span className="value">{transactionDetails?._id?.slice(-10) || 'N/A'}</span></div>
                            </div>
                        </div>
                        <p className="success-message-text agent-success-text">সেন্ড মানি সফল হয়েছে</p>
                    </>
                );
            default: return null;
        }
    };

    const backString = '←'

    return (
        <div className="agent-page-layout send-money-agent-page">
            <div className="agent-page-top-section">
                {(step > 1 && step !== 5) && <button onClick={handleGoBack} className="agent-back-button">{backString}</button>}
                {step === 1 && <button onClick={handleGoBack} className="agent-back-button">{backString}</button>}
                {(step !== 4 && step !== 5) && <img src={logoPath} alt="CashPay Logo" className="feature-page-logo" />}
                {(step !== 4 && step !== 5) && <h2 className="feature-page-heading agent-theme-heading">সেন্ড মানি</h2>}
            </div>

            <div className="agent-page-content">
                {error && <p className="error-message global-error">{error}</p>}
                {message && !error && <p className="success-message global-success">{message}</p>}
                {uiLoading && step === 1 && <p style={{textAlign: 'center'}}>প্রাপকের তালিকা লোড হচ্ছে...</p>}
                {(!uiLoading || step !== 1) && renderStepContent()}
            </div>

            {step !== 5 && (
                <div className="agent-page-bottom-section">
                    {step === 4 ? (
                        <button
                            className={`agent-page-next-button confirm-hold-button ${confirmHoldTime > 0 ? 'holding' : ''} ${loading ? 'processing' : ''}`}
                            onMouseDown={handleConfirmMouseDown} onMouseUp={handleConfirmMouseUpOrLeave}
                            onMouseLeave={handleConfirmMouseUpOrLeave} onTouchStart={handleConfirmMouseDown}
                            onTouchEnd={handleConfirmMouseUpOrLeave}
                            disabled={loading || confirmHoldTime === CONFIRM_HOLD_DURATION}
                        >
                            {loading ? 'প্রসেসিং...' : `কনফার্ম (${CONFIRM_HOLD_DURATION - confirmHoldTime} সেকেন্ড)`}
                            {(!loading && confirmHoldTime < CONFIRM_HOLD_DURATION) && <span className="button-arrow">{' '}</span>}
                        </button>
                    ) : (
                        <button onClick={handleNextStep} className="agent-page-next-button"
                            disabled={loading || uiLoading || (step === 1 && !selectedRecipient && !searchQuery) || (step === 2 && !amount) || (step === 3 && !agentPin) }
                        >
                            {loading || uiLoading ? 'প্রসেসিং...' : 'পরবর্তী'}
                            {(!loading && !uiLoading) && <span className="button-arrow">{' '}</span>}
                        </button>
                    )}
                </div>
            )}
            {step === 5 && (
                 <div className="agent-page-bottom-section">
                    <button onClick={() => navigate('/agent/dashboard')} className="agent-page-next-button">
                        ড্যাশবোর্ডে ফিরে যান <span className="button-arrow">{' '}</span>
                    </button>
                </div>
            )}
        </div>
    );
}

export default AgentSendMoneyPage;