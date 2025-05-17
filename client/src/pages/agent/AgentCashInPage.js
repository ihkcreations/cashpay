// client/src/pages/agent/AgentCashInPage.js
import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../api/api';
import { useAuth } from '../../context/AuthContext'; // For agent's own details
import logoPath from '../../assets/CashPayLogo.png';

function AgentCashInPage() {
    const [step, setStep] = useState(1);
    const [userMobileNumber, setUserMobileNumber] = useState('');
    const [amount, setAmount] = useState('');
    const [agentPin, setAgentPin] = useState(''); // Agent's own PIN

    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [transactionDetails, setTransactionDetails] = useState(null);

    const { user: agentUser, updateUser } = useAuth();
    const navigate = useNavigate();

    const [confirmHoldTime, setConfirmHoldTime] = useState(0);
    const confirmIntervalRef = useRef(null);
    const CONFIRM_HOLD_DURATION = 3;


    const handleNextStep = () => {
        setError('');
        if (step === 1) { // User Mobile Number
            if (!userMobileNumber || !/^(?:\+?88)?01[3-9]\d{8}$/.test(userMobileNumber)) {
                setError('সঠিক গ্রাহকের মোবাইল নাম্বার দিন।');
                return;
            }
            // Optional: API call to verify if userMobileNumber exists and is active
            setStep(2);
        } else if (step === 2) { // Amount
            const numAmount = parseFloat(amount);
            if (isNaN(numAmount) || numAmount <= 0) {
                setError('সঠিক পরিমাণ লিখুন।');
                return;
            }
            // Optional: Check against agent's own balance if backend model deducts from agent
            if (agentUser && agentUser.balance < numAmount) {
                setError('আপনার এজেন্ট একাউন্টে অপর্যাপ্ত ব্যালেন্স।');
                // return;
            }
            setStep(3);
        }
        // Step 3 (PIN & Confirm) has its own button logic
    };

    const handleGoBack = () => {
        setError('');
        if (step > 1 && step < 4) {
            setStep(step - 1);
            if (step === 2) setAmount('');
            if (step === 3) setAgentPin('');
        } else {
            navigate('/agent/dashboard');
        }
    };

    const handleConfirmMouseDown = () => { /* ... (same as other confirm buttons) ... */
        if (loading) return;
        if (confirmIntervalRef.current) clearInterval(confirmIntervalRef.current);
        setConfirmHoldTime(0); let chTime = 0;
        confirmIntervalRef.current = setInterval(() => {
            chTime++; setConfirmHoldTime(chTime);
            if (chTime >= CONFIRM_HOLD_DURATION) {
                if(confirmIntervalRef.current) clearInterval(confirmIntervalRef.current);
                handleProcessCashIn();
            }
        }, 1000);
    };
    const handleConfirmMouseUpOrLeave = () => { /* ... (same as other confirm buttons) ... */
        if (confirmIntervalRef.current) clearInterval(confirmIntervalRef.current);
        if (confirmHoldTime < CONFIRM_HOLD_DURATION) setConfirmHoldTime(0);
    };

    const handleProcessCashIn = async () => {
        if (agentPin.length !== 5 || !/^\d{5}$/.test(agentPin)) {
            setError('অনুগ্রহ করে আপনার সঠিক ৫-সংখ্যার পিন দিন।');
            setLoading(false); // Ensure loading is false if validation fails here
            setConfirmHoldTime(0);
            return;
        }
        setLoading(true); setError(''); setMessage('');
        try {
            const payload = {
                userMobileNumber,
                amount: parseFloat(amount),
                agentPin
            };
            // The API interceptor should use agentToken if path starts with /agent/
            const { data } = await api.post('/agent/cash-in', payload);
            
            setMessage(data.message || 'ক্যাশ ইন সফল হয়েছে!');
            if (data.agentNewBalance !== undefined) {
                // updateCurrentAgent({ balance: data.agentNewBalance }); // Update agent's own balance
                updateUser({ balance: data.agentNewBalance }); 
            }else{
                console.warn("agentNewBalance missing or not a number in API response:", data.agentNewBalance);
            }

            if (data.transactionForAgent) {
                setTransactionDetails(data.transactionForAgent);
            } else {
                console.warn("transactionForAgent missing in API response:", data.transactionForAgent);
                // Potentially throw an error here if this is critical for success screen.
                // throw new Error("Failed to get transaction details for success screen.");
            }
            setStep(4); // Success screen
        } catch (err) {
            console.error("Frontend Cash In Error Catch Block:", err); // Log the full error object
            console.error("Error Response Data:", err.response?.data); // Log backend response data if available
            const errorMessage = err.response?.data?.message || err.message || 'ক্যাশ ইন প্রক্রিয়া ব্যর্থ হয়েছে।';
            setError(errorMessage);
            setStep(3); // Go back to PIN/Confirm step on error
        } finally {
            setLoading(false);
            setConfirmHoldTime(0);
        }
    };

    

    const renderStepContent = () => {
        switch (step) {
            case 1: // Enter User's Mobile Number
                return (
                    <form onSubmit={(e) => {e.preventDefault(); handleNextStep();}}>
                        <h3 className="agent-step-heading centered">গ্রাহকের মোবাইল নাম্বার</h3>
                        <div className="input-group mobile-input-group agent-mobile-input">
                            <span className="country-code">+88</span>
                            <input type="text" className="mobile-field" placeholder="01XXXXXXXXX" value={userMobileNumber} onChange={(e) => setUserMobileNumber(e.target.value)} required pattern="01[3-9]\d{8}" />
                        </div>
                    </form>
                );
            case 2: // Enter Amount
                return (
                    <form onSubmit={(e) => {e.preventDefault(); handleNextStep();}}>
                        <div className="recipient-display static"> {/* Display user mobile */}
                            <span className="label">গ্রাহকের মোবাইল</span>
                            <p className="displayed-value">{userMobileNumber}</p>
                        </div>
                        <div className="input-group amount-input-group">
                            <label htmlFor="amount" className="visually-hidden">পরিমাণ</label>
                            <span className="taka-symbol">৳</span>
                            <input type="number" id="amount" className="amount-input" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" required min="1"/>
                        </div>
                         {agentUser && ( // Show agent's current balance
                            <p className="available-balance large">আপনার বর্তমান ব্যালেন্স<br/>৳ {agentUser.balance?.toFixed(2) || '0.00'}</p>
                        )}
                    </form>
                );
            case 3: // Enter Agent PIN & Confirm
                return (
                    <>
                        <h2 className="feature-page-heading centered">ক্যাশ ইন নিশ্চিত করুন</h2>
                        <div className="confirmation-details agent-theme-confirm">
                            <div className="confirmation-row"><span className="label">গ্রাহকের নাম্বার:</span><span className="value">{userMobileNumber}</span></div>
                            <div className="confirmation-row"><span className="label">পরিমাণ:</span><span className="value bold">৳{parseFloat(amount)?.toFixed(2)}</span></div>
                            {/* <div className="confirmation-row"><span className="label">আপনার নতুন ব্যালেন্স হবে:</span><span className="value bold">৳{(currentAgent.balance - parseFloat(amount))?.toFixed(2)}</span></div> */}
                        </div>
                        <div className="input-group" style={{marginTop: '20px'}}>
                            <label htmlFor="agentPin" className="input-label centered-text">আপনার এজেন্ট পিন দিন</label>
                            <input type="password" id="agentPin" className="pin-input large-dots agent-pin-input" value={agentPin} onChange={(e) => setAgentPin(e.target.value)} placeholder="● ● ● ● ●" maxLength="5" required />
                        </div>
                        <p className="confirm-instruction">ক্যাশ ইন করতে নিচের বাটন ৩ সেকেন্ড ধরে রাখুন</p>
                    </>
                );
            case 4: // Success
                return (
                    <>
                        <h2 className="feature-page-heading centered success-heading">ক্যাশ ইন সফল</h2>
                        <div className="confirmation-details agent-theme-confirm">
                            <div className="confirmation-row"><span className="label">গ্রাহকের নাম্বার:</span><span className="value">{userMobileNumber}</span></div>
                            <div className="confirmation-row"><span className="label">ক্যাশ ইন পরিমাণ:</span><span className="value bold">৳{parseFloat(amount)?.toFixed(2)}</span></div>
                            <div className="confirmation-row"><span className="label">আপনার নতুন ব্যালেন্স:</span><span className="value bold">৳{agentUser?.balance?.toFixed(2)}</span></div>
                            <div className="confirmation-row"><span className="label">ট্রানজেকশন আইডি:</span><span className="value">{transactionDetails?._id?.slice(-10) || 'N/A'}</span></div>
                        </div>
                        <p className="success-message-text">ক্যাশ ইন সফল হয়েছে</p>
                    </>
                );
            default: return null;
        }
    };

    const backString = '←'

    return (
        <div className="agent-page-layout cash-in-page">
            <div className="agent-page-top-section">
                {(step > 1 && step !== 4) && (
                    <button onClick={handleGoBack} className="agent-back-button">
                      <span className="agent-back-button">{backString}</span> 
                    </button>
                )}
                {step === 1 && (
                    <button onClick={handleGoBack} className="agent-back-button">
                      <span className="agent-back-button">{backString}</span> 
                    </button>
                )}
                {(step !== 3 && step !== 4) && <img src={logoPath} alt="CashPay Logo" className="feature-page-logo" />}
                {(step !== 3 && step !== 4) && <h2 className="feature-page-heading agent-theme-heading">ক্যাশ ইন</h2>}
            </div>
            <div className="agent-page-content">
                {error && <p className="error-message global-error">{error}</p>}
                {message && !error && <p className="success-message global-success">{message}</p>}
                {renderStepContent()}
            </div>
            {step !== 4 && (
                <div className="agent-page-bottom-section">
                    {step === 3 ? (
                        <button
                            className={`agent-page-next-button confirm-hold-button ${confirmHoldTime > 0 ? 'holding' : ''}`}
                            onMouseDown={handleConfirmMouseDown} onMouseUp={handleConfirmMouseUpOrLeave}
                            onMouseLeave={handleConfirmMouseUpOrLeave} onTouchStart={handleConfirmMouseDown}
                            onTouchEnd={handleConfirmMouseUpOrLeave}
                            disabled={loading || !agentPin || confirmHoldTime === CONFIRM_HOLD_DURATION}
                        >
                            {loading ? 'প্রসেসিং...' : `কনফার্ম (${CONFIRM_HOLD_DURATION - confirmHoldTime} সেকেন্ড)`}
                            {(!loading && confirmHoldTime < CONFIRM_HOLD_DURATION) && <span className="button-arrow">{' '}</span>}
                        </button>
                    ) : (
                        <button onClick={handleNextStep} className="agent-page-next-button" disabled={loading || (step === 1 && !userMobileNumber) || (step === 2 && !amount) }>
                            {loading ? 'প্রসেসিং...' : 'পরবর্তী'}
                            {!loading && <span className="button-arrow">{' '}</span>}
                        </button>
                    )}
                </div>
            )}
            {step === 4 && (
                <div className="agent-page-bottom-section">
                    <button onClick={() => navigate('/agent/dashboard')} className="agent-page-next-button">
                        ড্যাশবোর্ডে ফিরে যান <span className="button-arrow">{' '}</span>
                    </button>
                </div>
            )}
        </div>
    );
}
export default AgentCashInPage;