// client/src/pages/CashoutPage.js
import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/api'; // Ensure correct path
import { useAuth } from '../context/AuthContext'; // Ensure correct path
import logoPath from '../assets/CashPayLogo.png';


function CashoutPage() {
    const [step, setStep] = useState(1);
    const [searchQuery, setSearchQuery] = useState('');
    const [allAgents, setAllAgents] = useState([]); // Will be fetched from API
    const [filteredAgents, setFilteredAgents] = useState([]);
    const [selectedAgent, setSelectedAgent] = useState(null); // { name, mobileNumber, _id }
    const [amount, setAmount] = useState('');
    const [pin, setPin] = useState('');
    const [reference, setReference] = useState(''); // Optional reference
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false); // For API calls
    const [uiLoading, setUiLoading] = useState(false); // For UI loading like fetching agents
    const [transactionDetails, setTransactionDetails] = useState(null);

    const { user, updateUser } = useAuth();
    const navigate = useNavigate();

    const [confirmHoldTime, setConfirmHoldTime] = useState(0);
    const confirmIntervalRef = useRef(null);
    const CONFIRM_HOLD_DURATION = 3; // 3 seconds for Cash Out confirm

    // --- Fee Calculation (Example) ---
    const CASH_OUT_FEE_PERCENTAGE = 0.0185; // 1.85%
    const calculateFee = (cashoutAmount) => {
        if (isNaN(cashoutAmount) || cashoutAmount <= 0) return 0;
        return Math.ceil(cashoutAmount * CASH_OUT_FEE_PERCENTAGE);
    };
    const fee = calculateFee(parseFloat(amount));
    const totalDeduction = parseFloat(amount) + fee;


    // Filter agents based on search query (Similar to SendMoneyPage)
    useEffect(() => {
        if (step === 1 && allAgents.length === 0) {
            const fetchAgents = async () => {
                setUiLoading(true); // Start UI loading for agent list
                setError('');
                try {
                    // API call to your new endpoint for listing agents
                    const { data } = await api.get('/agent'); // Uses the base path from index.js + agentRoutes.js
                    setAllAgents(data);
                    setFilteredAgents(data);
                } catch (err) {
                    setError('এজেন্ট তালিকা লোড করতে সমস্যা হয়েছে।');
                    console.error("Error fetching agents:", err);
                }
                setUiLoading(false); // End UI loading
            };
            fetchAgents();
        }
    }, [step, allAgents.length]); // Rerun if step changes or if allAgents was initially empty

    // Filter agents based on search query (same as before)
    useEffect(() => {
        if (step === 1) {
            if (searchQuery === '') {
                setFilteredAgents(allAgents);
            } else {
                const lowerQuery = searchQuery.toLowerCase();
                setFilteredAgents(
                    allAgents.filter(
                        agent =>
                            (agent.shopName && agent.shopName.toLowerCase().includes(lowerQuery)) || // Search by shopName
                            (agent.name && agent.name.toLowerCase().includes(lowerQuery)) ||       // Search by agent's contact name
                            agent.mobileNumber.includes(searchQuery)
                    )
                );
            }
        }
    }, [searchQuery, allAgents, step]);


    const handleNextStep = () => {
        setError('');
        if (step === 1) {
            if (!selectedAgent && !/^(?:\+?88)?01[3-9]\d{8}$/.test(searchQuery)) { // Allow direct number input if valid
                setError('Please select an agent or enter a valid agent number.');
                return;
            }
            // If searchQuery is a valid number and no agent selected, use searchQuery
            if (!selectedAgent && /^(?:\+?88)?01[3-9]\d{8}$/.test(searchQuery)) {
                setSelectedAgent({ name: `Agent (${searchQuery})`, mobileNumber: searchQuery, _id: null });
            } else if (!selectedAgent) {
                 setError('Please select an agent.');
                 return;
            }
            setStep(2);
        } else if (step === 2) {
            const numAmount = parseFloat(amount);
            if (isNaN(numAmount) || numAmount <= 0) {
                setError('Please enter a valid amount.');
                return;
            }
            if (user && user.balance < (numAmount + calculateFee(numAmount)) ) { // Check against total deduction
                setError(`Insufficient balance. Required: ${(numAmount + calculateFee(numAmount)).toFixed(2)}`);
                return;
            }
            setStep(3);
        } else if (step === 3) {
            if (pin.length !== 5 || !/^\d{5}$/.test(pin)) {
                setError('Please enter a valid 5-digit PIN.');
                return;
            }
            setStep(4);
        }
    };

    const handleGoBack = () => {
        setError('');
        if (step > 1) {
            setStep(step - 1);
            if (step === 2) setAmount('');
            if (step === 3) setPin('');
        } else if (step === 1) {
            navigate('/app');
        }
    };

    const handleSelectAgent = (agent) => {
        setSelectedAgent(agent);
        setSearchQuery('');
    };

    // --- Confirmation Button Hold Logic (Step 4) ---
    const handleConfirmMouseDown = () => {
        if (loading) return;
        if (confirmIntervalRef.current) clearInterval(confirmIntervalRef.current);
        setConfirmHoldTime(0);
        let currentHoldTime = 0;
        confirmIntervalRef.current = setInterval(() => {
            currentHoldTime++;
            setConfirmHoldTime(currentHoldTime);
            if (currentHoldTime >= CONFIRM_HOLD_DURATION) {
                if (confirmIntervalRef.current) clearInterval(confirmIntervalRef.current);
                handleCashOut();
            }
        }, 1000);
    };

    const handleConfirmMouseUpOrLeave = () => {
        if (confirmIntervalRef.current) clearInterval(confirmIntervalRef.current);
        if (confirmHoldTime < CONFIRM_HOLD_DURATION) setConfirmHoldTime(0);
    };


    const handleCashOut = async () => {
        setLoading(true);
        setError('');
        setMessage('');

        try {
            const payload = {
                agentNumber: selectedAgent.mobileNumber,
                amount: parseFloat(amount),
                pin: pin,
                reference: reference || undefined
            };
            const { data } = await api.post('/transactions/cashout', payload);

            setMessage(data.message || 'Cash Out successful!');
            if (data.newBalance !== undefined) {
                updateUser(prevUser => ({ ...prevUser, balance: data.newBalance }));
            }
            // Prepare details for success screen, including fee
            setTransactionDetails({
                ...data.transaction, // Backend should return the transaction object
                amountCashedOut: data.amountCashedOut,
                feeCharged: data.feeCharged
            });
            setStep(5);
            setConfirmHoldTime(0);

        } catch (err) {
            const errorMessage = err.response?.data?.message || 'Cash Out failed. Please try again.';
            setError(errorMessage);
            setStep(3); // Go back to PIN entry
            setPin('');
            setConfirmHoldTime(0);
        } finally {
            setLoading(false);
        }
    };

    // --- JSX for each step ---
    const renderStepContent = () => {
        switch (step) {
            case 1: // Select Agent
                return (
                    <>
                        <div className="input-group">
                            <label htmlFor="searchQuery">এজেন্ট নাম্বার বা দোকানের নাম দিন</label>
                            <input
                                type="text" id="searchQuery" className="standard-input"
                                placeholder="এজেন্ট নাম্বার বা নাম"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <h3 className="contact-list-header">এজেন্ট লিস্ট (প্রোটোটাইপ)</h3>
                        <div className="contact-list">
                            {uiLoading && <p style={{textAlign: 'center', padding: '10px'}}>এজেন্ট লোড হচ্ছে...</p>}
                            {!uiLoading && filteredAgents.length === 0 && !searchQuery && <p style={{textAlign: 'center', padding: '10px'}}>কোনো সক্রিয় এজেন্ট পাওয়া যায়নি।</p>}
                            {!uiLoading && filteredAgents.length === 0 && searchQuery && <p style={{textAlign: 'center', padding: '10px'}}>আপনার সার্চের সাথে মিলে এমন কোনো এজেন্ট নেই।</p>}
                            {filteredAgents.map(agent => (
                                <div key={agent._id || agent.mobileNumber} // Use _id if available from API
                                     className={`contact-item ${selectedAgent?.mobileNumber === agent.mobileNumber ? 'selected-in-list' : ''}`}
                                     onClick={() => handleSelectAgent(agent)}>
                                    <span className="contact-avatar agent-avatar">{/* Agent Icon */}🏢</span> {/* Building for agent */}
                                    <div className="contact-details">
                                        {/* Display shopName primarily, then agent's contact name if available */}
                                        <span className="contact-name">{agent.shopName || agent.name}</span>
                                        <span className="contact-number">{agent.mobileNumber}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                );
            case 2: // Enter Amount
                return (
                    <>
                        <div className="recipient-display"> {/* Reusing class, semantic name "target-display" might be better */}
                            <span className="label">এজেন্ট</span>
                            <div className="contact-item selected">
                                <span className="contact-avatar"></span>
                                <div className="contact-details">
                                    <span className="contact-name">{selectedAgent?.shopName || selectedAgent?.name}</span>
                                    <span className="contact-number">{selectedAgent?.mobileNumber}</span>
                                </div>
                            </div>
                        </div>
                        <div className="input-group amount-input-group">
                            <label htmlFor="amount" className="visually-hidden">পরিমাণ</label>
                            <span className="taka-symbol">৳</span>
                            <input
                                type="number" id="amount" className="amount-input"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="0" required min="1"
                            />
                        </div>
                        <p className="available-balance large">
                            ব্যবহারযোগ্য ব্যালেন্স<br/>৳ {user?.balance?.toFixed(2) || '0.00'}
                        </p>
                    </>
                );
            case 3: // Enter PIN & Reference
                return (
                    <>
                        <div className="recipient-display">
                            <span className="label">এজেন্ট</span>
                            <div className="contact-item selected">
                                <span className="contact-avatar"></span>
                                <div className="contact-details">
                                    <span className="contact-name">{selectedAgent?.shopName || selectedAgent?.name}</span>
                                    <span className="contact-number">{selectedAgent?.mobileNumber}</span>
                                </div>
                            </div>
                        </div>
                        <div className="amount-display">
                            <span className="label">পরিমাণ</span>
                            <span className="amount-value">৳{parseFloat(amount)?.toFixed(2) || '0.00'}</span>
                        </div>
                        <div className="input-group">
                            <label htmlFor="pin" className="visually-hidden">বিকাশ পিন</label>
                            <input
                                type="password" id="pin" className="pin-input large-dots"
                                value={pin} onChange={(e) => setPin(e.target.value)}
                                placeholder="● ● ● ● ●" maxLength="5" required
                            />
                        </div>
                        <div className="input-group">
                            <label htmlFor="reference" className="input-label">রেফারেন্স (Optional)</label>
                            <input
                                type="text" id="reference" className="standard-input"
                                value={reference} onChange={(e) => setReference(e.target.value)}
                                placeholder="e.g., For expenses"
                            />
                        </div>
                    </>
                );
            case 4: // Confirmation
                return (
                    <>
                        <h2 className="feature-page-heading centered">ক্যাশ আউট নিশ্চিত করুন</h2>
                        <div className="confirmation-details">
                            <div className="confirmation-row">
                                <span className="label">এজেন্ট:</span>
                                <div className="contact-item selected small">
                                    <span className="contact-avatar"></span>
                                    <div className="contact-details">
                                        <span className="contact-name">{selectedAgent?.shopName || selectedAgent?.name}</span>
                                        <span className="contact-number">{selectedAgent?.mobileNumber}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="confirmation-grid">
                                <div className="grid-item"><span className="label">পরিমাণ</span><span className="value">৳{parseFloat(amount)?.toFixed(2)}</span></div>
                                <div className="grid-item"><span className="label">চার্জ</span><span className="value">৳{fee.toFixed(2)}</span></div>
                                <div className="grid-item"><span className="label">মোট</span><span className="value">৳{totalDeduction.toFixed(2)}</span></div>
                                <div className="grid-item"><span className="label">নতুন ব্যালেন্স</span><span className="value">৳{(user.balance - totalDeduction).toFixed(2)}</span></div>
                                {reference && <div className="grid-item full-width"><span className="label">রেফারেন্স</span><span className="value">{reference}</span></div>}
                            </div>
                        </div>
                        <p className="confirm-instruction">
                            ক্যাশ আউট করতে নিচের বাটন ৩ সেকেন্ড ধরে রাখুন
                        </p>
                    </>
                );
            case 5: // Success
                return (
                    <>
                        <h2 className="feature-page-heading centered success-heading">ক্যাশ আউট সফল</h2>
                        <div className="confirmation-details">
                            <div className="confirmation-row">
                                <span className="label">এজেন্ট:</span>
                                <div className="contact-item selected small">
                                    <span className="contact-avatar"></span>
                                    <div className="contact-details">
                                        <span className="contact-name">{selectedAgent?.shopName || selectedAgent?.name}</span>
                                        <span className="contact-number">{selectedAgent?.mobileNumber}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="confirmation-grid">
                                <div className="grid-item"><span className="label">পরিমাণ</span><span className="value">৳{transactionDetails?.amountCashedOut?.toFixed(2)}</span></div>
                                <div className="grid-item"><span className="label">চার্জ</span><span className="value">৳{transactionDetails?.feeCharged?.toFixed(2)}</span></div>
                                <div className="grid-item"><span className="label">নতুন ব্যালেন্স</span><span className="value">৳{transactionDetails?.balanceAfterTransaction?.toFixed(2) ?? user?.balance?.toFixed(2)}</span></div>
                                <div className="grid-item"><span className="label">ট্রানজেকশন আইডি</span><span className="value">{transactionDetails?._id?.slice(-10) || 'N/A'}</span></div>
                                {transactionDetails?.description?.includes('Ref:') && <div className="grid-item full-width"><span className="label">রেফারেন্স</span><span className="value">{transactionDetails.description.split('Ref: ')[1]?.replace(')','')}</span></div>}
                            </div>
                        </div>
                        <p className="success-message-text">ক্যাশ আউট সফল হয়েছে</p>
                    </>
                );
            default: return null;
        }
    };

    const backString = '←'

    return (
        <div className="feature-page-layout cashout-layout">
            <div className="feature-page-top-section">
                {(step > 1 && step !== 5) && <button onClick={handleGoBack} className="back-button">{backString}</button>}
                {step === 1 && <button onClick={handleGoBack} className="back-button">{backString}</button>} {/* Always show back on step 1 to go to dashboard */}
                {(step !== 4 && step !== 5) && <img src={logoPath} alt="C Pay Logo" className="feature-page-logo" />}
                {(step !== 4 && step !== 5) && <h2 className="feature-page-heading">ক্যাশ আউট</h2>}
            </div>

            <div className="feature-page-content">
                {error && <p className="error-message global-error">{error}</p>}
                {renderStepContent()}
            </div>

            {step !== 5 && (
                <div className="feature-page-bottom-section">
                    {step === 4 ? (
                        <button
                            className={`feature-page-next-button confirm-hold-button ${confirmHoldTime > 0 ? 'holding' : ''}`}
                            onMouseDown={handleConfirmMouseDown} onMouseUp={handleConfirmMouseUpOrLeave}
                            onMouseLeave={handleConfirmMouseUpOrLeave} onTouchStart={handleConfirmMouseDown}
                            onTouchEnd={handleConfirmMouseUpOrLeave}
                            disabled={loading || confirmHoldTime === CONFIRM_HOLD_DURATION}
                        >
                            {loading ? 'প্রসেসিং...' : `কনফার্ম (${CONFIRM_HOLD_DURATION - confirmHoldTime} সেকেন্ড)`}
                            {(!loading && confirmHoldTime < CONFIRM_HOLD_DURATION) && <span className="button-arrow">{' '}</span>}
                        </button>
                    ) : (
                        <button
                            onClick={handleNextStep} className="feature-page-next-button"
                            disabled={loading || (step === 1 && !selectedAgent && !searchQuery) || (step === 2 && !amount)}
                        >
                            {loading ? 'প্রসেসিং...' : 'পরবর্তী'}
                            {!loading && <span className="button-arrow">{' '}</span>}
                        </button>
                    )}
                </div>
            )}
            {step === 5 && (
                 <div className="feature-page-bottom-section">
                    <button onClick={() => navigate('/app')} className="feature-page-next-button">
                        হোম এ ফিরে যান <span className="button-arrow">{' '}</span>
                    </button>
                </div>
            )}
        </div>
    );
}

export default CashoutPage;