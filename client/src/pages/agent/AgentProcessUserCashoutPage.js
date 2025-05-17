// client/src/pages/agent/AgentProcessUserCashoutPage.js
import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../api/api'; // Assuming this path is correct from your project root
import { useAuth } from '../../context/AuthContext'; // Assuming this path is correct
import logoPath from '../../assets/CashPayLogo.png';

function AgentProcessUserCashoutPage() {
    const [step, setStep] = useState(1);
    const [userMobileNumber, setUserMobileNumber] = useState('');
    const [amount, setAmount] = useState('');
    const [userOtp, setUserOtp] = useState(''); // OTP user provides to agent (simulated for prototype)
    const [agentPin, setAgentPin] = useState(''); // Agent's own PIN

    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false); // For API call processing
    const [uiLoading, setUiLoading] = useState(false); // For initial UI elements like fetching user name (if implemented)
    const [transactionDetails, setTransactionDetails] = useState(null); // For success screen
    const [fetchedUserName, setFetchedUserName] = useState(''); // To display user's name in Step 2

    // const { currentAgent, updateCurrentAgent } = useAuth(); // Agent's own data from context
    const { user: currentAgent, updateUser: updateCurrentAgent  } = useAuth();
    const navigate = useNavigate();

    const [confirmHoldTime, setConfirmHoldTime] = useState(0);
    const confirmIntervalRef = useRef(null);
    const CONFIRM_HOLD_DURATION = 3; // 3 seconds for confirmation

    // Step 1: Validate user mobile and proceed
    const handleUserMobileSubmit = async (e) => {
        if (e) e.preventDefault();
        setError('');
        if (!userMobileNumber || !/^(?:\+?88)?01[3-9]\d{8}$/.test(userMobileNumber)) {
            setError('অনুগ্রহ করে সঠিক গ্রাহকের মোবাইল নাম্বার দিন।');
            return;
        }
        setUiLoading(true);
        // Optional: API call to fetch user's name and verify existence
        // For prototype, we can skip this and rely on backend validation during cash-out
        // Or simulate a fetch:
        // For now, just setting a placeholder name for UI if number is valid
        try {
            // const { data: userData } = await api.get(`/user/details-by-mobile/${userMobileNumber}`); // Example endpoint
            // setFetchedUserName(userData.name || "Unknown User");
            setFetchedUserName("গ্রাহক"); // Placeholder if no API call
            setUiLoading(false);
            setStep(2);
        } catch (fetchErr) {
            setError("গ্রাহকের তথ্য আনতে সমস্যা হয়েছে বা নাম্বারটি রেজিস্টার্ড নয়।");
            setUiLoading(false);
        }
    };

    // Step 2: Validate amount and proceed
    const handleAmountSubmit = (e) => {
        if (e) e.preventDefault();
        setError('');
        const numAmount = parseFloat(amount);
        if (isNaN(numAmount) || numAmount <= 0) {
            setError('অনুগ্রহ করে সঠিক পরিমাণ লিখুন।');
            return;
        }
        // Optional: Check against user's fetched balance here if you implement that API call
        // Optional: Check against agent's own balance if that's a constraint on agent side
        setStep(3);
    };


    const handleGoBack = () => {
        setError('');
        setMessage('');
        if (step > 1 && step < 4) { // From step 2 or 3 back
            setStep(prevStep => prevStep - 1);
            if (step === 2) { setUserMobileNumber(fetchedUserName ? userMobileNumber : ''); setFetchedUserName('');} // Clear user if going back from amount
            if (step === 3) { setAgentPin(''); setUserOtp('');} // Clear PINs/OTP if going back from confirm
        } else { // From step 1 or success screen
            navigate('/agent/dashboard');
        }
    };

    const handleConfirmMouseDown = () => {
        if (loading || !agentPin || !userOtp) return; // Don't start if loading or fields empty
        if (confirmIntervalRef.current) clearInterval(confirmIntervalRef.current);
        setConfirmHoldTime(0);
        let currentHoldTime = 0;
        confirmIntervalRef.current = setInterval(() => {
            currentHoldTime++;
            setConfirmHoldTime(currentHoldTime);
            if (currentHoldTime >= CONFIRM_HOLD_DURATION) {
                if(confirmIntervalRef.current) clearInterval(confirmIntervalRef.current);
                handleProcessCashOutApiCall(); // Corrected function name
            }
        }, 1000);
    };

    const handleConfirmMouseUpOrLeave = () => {
        if (confirmIntervalRef.current) {
            clearInterval(confirmIntervalRef.current);
            confirmIntervalRef.current = null;
        }
        // Only reset visual hold time if we haven't started submitting
        if (confirmHoldTime < CONFIRM_HOLD_DURATION && !loading) { // Check loading here too
            setConfirmHoldTime(0);
        }
    };

    const handleProcessCashOutApiCall = async () => { // Renamed
        setError('');
        setMessage('');
        // Validate PINs here before setting loading, as it's part of the confirmation step
        if (userOtp.length !== 4 || !/^\d{4}$/.test(userOtp)) { // Assuming 4-digit User OTP for prototype
            setError('অনুগ্রহ করে গ্রাহকের সঠিক ৪-সংখ্যার OTP দিন।');
            setConfirmHoldTime(0); // Reset hold button
            return;
        }
        if (agentPin.length !== 5 || !/^\d{5}$/.test(agentPin)) {
            setError('অনুগ্রহ করে আপনার সঠিক ৫-সংখ্যার এজেন্ট পিন দিন।');
            setConfirmHoldTime(0); // Reset hold button
            return;
        }

        setLoading(true);
        try {
            const payload = {
                userMobileNumber, // Already validated and stored in state
                amount: parseFloat(amount),
                userOtp,          // User's OTP provided to agent
                agentPin          // Agent's own PIN for authorization
            };
            
            const { data } = await api.post('/agent/process-user-cashout', payload);

             

            setMessage(data.message || 'গ্রাহকের ক্যাশ আউট সফল হয়েছে!');
            if (data.agentNewBalance !== undefined) {
                updateCurrentAgent({ balance: data.agentNewBalance });
            }else {
                console.warn("[AgentCashOut] agentNewBalance missing or invalid in API response:", data?.agentNewBalance);
                // This might not be an error that should stop UI flow to success, but good to log
            }

            if (data.transactionForAgent) {
                setTransactionDetails(data.transactionForAgent);
            } else {
                console.warn("[AgentCashOut] transactionForAgent missing in API response:", data?.transactionForAgent);
                // This might not be an error that should stop UI flow to success
            }
            
            setStep(4); // Move to success screen

        } catch (err) {
            console.error("!!! FRONTEND CATCH BLOCK TRIGGERED (AgentProcessUserCashoutPage) !!!");
            console.error("Full error object:", err);
            if (err.response) {
                console.error("Error response status:", err.response.status);
                console.error("Error response data:", JSON.stringify(err.response.data, null, 2));
                setError(err.response.data.message || 'গ্রাহকের ক্যাশ আউট প্রক্রিয়া ব্যর্থ হয়েছে।');
            } else {
                console.error("Error without response object (e.g., network error, client-side JS error before send):", err.message);
                setError(err.message || 'গ্রাহকের ক্যাশ আউট প্রক্রিয়া ব্যর্থ হয়েছে। একটি অপ্রত্যাশিত সমস্যা হয়েছে।');
                setConfirmHoldTime(0); // Reset confirm button on error
            } 
        }finally {
            setLoading(false);
            setConfirmHoldTime(0);
        }
    };


    const renderStepContent = () => {
        switch (step) {
            case 1: // Enter User's Mobile Number
                return (
                    <form onSubmit={handleUserMobileSubmit}>
                        <h3 className="agent-step-heading centered">গ্রাহকের মোবাইল নাম্বার</h3>
                        <div className="input-group mobile-input-group agent-mobile-input">
                            <span className="country-code">+88</span>
                            <input
                                type="tel"
                                className="mobile-field"
                                value={userMobileNumber}
                                onChange={(e) => setUserMobileNumber(e.target.value)}
                                placeholder="01XXXXXXXXX"
                                required
                                pattern="01[3-9]\d{8}"
                                title="Enter a valid Bangladeshi mobile number (e.g., 01XXXXXXXXX)"
                            />
                        </div>
                        {/* Button is in bottom section */}
                    </form>
                );
            case 2: // Enter Amount
                return (
                    <form onSubmit={handleAmountSubmit}>
                        <div className="recipient-display static">
                            <span className="label">গ্রাহকের মোবাইল</span>
                            <p className="displayed-value">{fetchedUserName || userMobileNumber}</p>
                            {/* Add User's current balance here if fetched:
                            <p className="small-text">Balance: ৳{fetchedUserDetails?.balance?.toFixed(2)}</p> */}
                        </div>
                        <div className="input-group amount-input-group agent-amount-input">
                            <label htmlFor="amount" className="visually-hidden">পরিমাণ</label>
                            <span className="taka-symbol">৳</span>
                            <input
                                type="number"
                                id="amount"
                                className="amount-input"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="0"
                                required
                                min="1" // Example minimum cash out
                            />
                        </div>
                        {currentAgent && (
                            <p className="available-balance large">
                                আপনার ব্যবহারযোগ্য ব্যালেন্স<br/>৳ {currentAgent.balance?.toFixed(2) || '0.00'}
                            </p>
                        )}
                        {/* Button is in bottom section */}
                    </form>
                );
            case 3: // Enter User OTP, Agent PIN, Confirm
                return (
                    // No form tag needed here as submission is via hold button
                    <>
                        <h2 className="feature-page-heading centered agent-theme-heading">ক্যাশ আউট নিশ্চিত করুন</h2>
                        <div className="confirmation-details agent-theme-confirm">
                            <div className="confirmation-row"><span className="label">গ্রাহকের নাম্বার:</span><span className="value">{userMobileNumber}</span></div>
                            <div className="confirmation-row"><span className="label">ক্যাশ আউট পরিমাণ:</span><span className="value bold">৳{parseFloat(amount)?.toFixed(2)}</span></div>
                            {/* Display calculated fee for user if applicable, or total debit amount */}
                        </div>
                        <div className="input-group" style={{marginTop: '20px'}}>
                            <label htmlFor="userOtp" className="input-label centered-text">গ্রাহকের OTP (যেমন 1234)</label>
                            <input
                                type="password" // Mask OTP input
                                id="userOtp"
                                className="pin-input agent-pin-input" // Style like PIN input
                                value={userOtp}
                                onChange={(e) => setUserOtp(e.target.value)}
                                placeholder="গ্রাহকের OTP"
                                maxLength="4" // Assuming 4-digit User OTP for prototype
                                required
                            />
                        </div>
                        <div className="input-group">
                            <label htmlFor="agentPin" className="input-label centered-text">আপনার এজেন্ট পিন দিন</label>
                            <input
                                type="password"
                                id="agentPin"
                                className="pin-input large-dots agent-pin-input"
                                value={agentPin}
                                onChange={(e) => setAgentPin(e.target.value)}
                                placeholder="● ● ● ● ●"
                                maxLength="5"
                                required
                            />
                        </div>
                        <p className="confirm-instruction">ক্যাশ আউট করতে নিচের বাটন ৩ সেকেন্ড ধরে রাখুন</p>
                         {/* Button is in bottom section */}
                    </>
                );
            case 4: // Success
                return (
                    <>
                        <h2 className="feature-page-heading centered success-heading agent-success-heading">গ্রাহকের ক্যাশ আউট সফল</h2>
                        <div className="confirmation-details agent-theme-confirm">
                            <div className="confirmation-row"><span className="label">গ্রাহকের নাম্বার:</span><span className="value">{userMobileNumber}</span></div>
                            <div className="confirmation-row"><span className="label">ক্যাশ আউট পরিমাণ:</span><span className="value bold">৳{transactionDetails?.amount?.toFixed(2) || parseFloat(amount)?.toFixed(2)}</span></div>
                            {/* <div className="confirmation-row"><span className="label">চার্জ (গ্রাহক):</span><span className="value">৳{transactionDetails?.userFee?.toFixed(2) || '0.00'}</span></div> */}
                            <div className="confirmation-row"><span className="label">আপনার নতুন ব্যালেন্স:</span><span className="value bold">৳{currentAgent?.balance?.toFixed(2)}</span></div>
                            <div className="confirmation-row"><span className="label">ট্রানজেকশন আইডি:</span><span className="value">{transactionDetails?._id?.slice(-10) || 'N/A'}</span></div>
                        </div>
                        <p className="success-message-text agent-success-text">গ্রাহকের ক্যাশ আউট সফল হয়েছে</p>
                    </>
                );
            default: return null;
        }
    };

    const backString = '←'

    return (
        <div className="agent-page-layout cash-out-user-page">
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
                {(step !== 3 && step !== 4) && <h2 className="feature-page-heading agent-theme-heading">ক্যাশ আউট (গ্রাহক)</h2>}
                {/* Step 3 & 4 headings are inside renderStepContent */}
            </div>

            <div className="agent-page-content">
                {error && <p className="error-message global-error">{error}</p>}
                {message && !error && <p className="success-message global-success">{message}</p>}
                {uiLoading && step === 1 && <p style={{textAlign: 'center'}}>Checking user...</p>}
                {!uiLoading && renderStepContent()}
            </div>

            {step !== 4 && ( // Common Bottom Button section for steps 1, 2, 3
                <div className="agent-page-bottom-section">
                    {step === 3 ? ( // Confirmation Hold Button for Step 3
                        <button
                            className={`agent-page-next-button confirm-hold-button ${confirmHoldTime > 0 ? 'holding' : ''} ${loading ? 'processing' : ''}`}
                            onMouseDown={handleConfirmMouseDown}
                            onMouseUp={handleConfirmMouseUpOrLeave}
                            onMouseLeave={handleConfirmMouseUpOrLeave}
                            onTouchStart={handleConfirmMouseDown}
                            onTouchEnd={handleConfirmMouseUpOrLeave}
                            disabled={loading || !agentPin || !userOtp || confirmHoldTime === CONFIRM_HOLD_DURATION}
                        >
                            {loading ? 'প্রসেসিং...' : `কনফার্ম (${CONFIRM_HOLD_DURATION - confirmHoldTime} সেকেন্ড)`}
                            {(!loading && confirmHoldTime < CONFIRM_HOLD_DURATION) && <span className="button-arrow">{' '}</span>}
                        </button>
                    ) : ( // Standard "Next" button for Step 1 & 2
                        <button
                            onClick={step === 1 ? handleUserMobileSubmit : handleAmountSubmit} // Call specific submit for step 1 and 2
                            className="agent-page-next-button"
                            disabled={loading || uiLoading || (step === 1 && !userMobileNumber) || (step === 2 && !amount)}
                        >
                            {loading || uiLoading ? 'প্রসেসিং...' : 'পরবর্তী'}
                            {(!loading && !uiLoading) && <span className="button-arrow">{' '}</span>}
                        </button>
                    )}
                </div>
            )}

            {step === 4 && ( // "Back to Dashboard" button on Success Screen (Step 4)
                 <div className="agent-page-bottom-section">
                    <button onClick={() => navigate('/agent/dashboard')} className="agent-page-next-button">
                        ড্যাশবোর্ডে ফিরে যান
                        <span className="button-arrow">{' '}</span>
                    </button>
                </div>
            )}
        </div>
    );
}

export default AgentProcessUserCashoutPage;