// client/src/pages/AddMoneyPage.js
import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/api';
import { useAuth } from '../context/AuthContext';
import logoPath from '../assets/CashPayLogo.png';
// Placeholder icons for ATM and Card - replace with actual SVGs or image paths if you have them
// For now, we can use text or simple styled divs.
// const atmIconPath = '/icons/atm.svg';
// const cardIconPath = '/icons/visa.svg';

function AddMoneyPage() {
    const [step, setStep] = useState(1); // Current step
    const [addMoneyMethod, setAddMoneyMethod] = useState(null); // 'atm' or 'card'
    const [otp, setOtp] = useState(''); // For simulated OTP
    const [amount, setAmount] = useState('');
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false); // For API call
    const [transactionDetails, setTransactionDetails] = useState(null); // For success screen

    const { user, updateUser } = useAuth();
    const navigate = useNavigate();

    // Confirmation button hold logic (similar to Send Money)
    const [confirmHoldTime, setConfirmHoldTime] = useState(0);
    const confirmIntervalRef = useRef(null);
    const CONFIRM_HOLD_DURATION = 3; // 3 seconds for Add Money confirm

    // --- Step Navigation ---
    const handleNextStep = () => {
        setError('');
        if (step === 1) {
            if (!addMoneyMethod) {
                setError('যেকোনো একটি মাধ্যম নির্বাচন করুন।'); // Please select a method
                return;
            }
            setStep(2);
        } else if (step === 2) {
            // Simulate OTP validation for prototype
            if (otp.length !== 4 || !/^\d{4}$/.test(otp)) { // Assuming 4-digit dummy OTP
                setError('সঠিক ৪-সংখ্যার OTP দিন।');
                return;
            }
            const numAmount = parseFloat(amount);
            if (isNaN(numAmount) || numAmount <= 0) {
                setError('সঠিক পরিমাণ লিখুন।');
                return;
            }
            // Optional: Add a maximum add money limit for prototype
            if (numAmount > 50000) {
                 setError('সর্বোচ্চ অ্যাড মানি পরিমাণ ৫০,০০০ টাকা।');
                 return;
            }
            setStep(3); // Move to confirmation
        }
        // Step 3 (Confirmation) has its own button logic
    };

    const handleGoBack = () => {
        setError('');
        if (step > 1 && step < 4) { // Don't allow back from success screen
            setStep(step - 1);
            if (step === 2) { setAddMoneyMethod(null); setOtp(''); setAmount(''); } // Reset if going back from OTP/Amount
            if (step === 3) { /* No specific state to clear here */ }
        } else {
            navigate('/app'); // Back to dashboard from step 1 or success screen
        }
    };

    // --- Confirmation Button Hold Logic (Step 3) ---
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
                handleAddMoneyApiCall();
            }
        }, 1000);
    };

    const handleConfirmMouseUpOrLeave = () => {
        if (confirmIntervalRef.current) clearInterval(confirmIntervalRef.current);
        if (confirmHoldTime < CONFIRM_HOLD_DURATION) setConfirmHoldTime(0); // Reset if not held long enough
    };

    // --- Add Money API Call (triggered from Step 3 confirm) ---
    const handleAddMoneyApiCall = async () => {
        setLoading(true);
        setError('');
        setMessage('');
        const numericAmount = parseFloat(amount);

        try {
            const { data } = await api.post('/transactions/add-money', { amount: numericAmount });
            setMessage(data.message || 'অ্যাড মানি সফল হয়েছে!');
            if (data.newBalance !== undefined) {
                updateUser(prevUser => ({ ...prevUser, balance: data.newBalance }));
            } else { // Fallback if newBalance isn't directly in response
                const profileResponse = await api.get('/auth/profile');
                updateUser(profileResponse.data);
            }
            setTransactionDetails(data.transaction); // Save for success screen
            setStep(4); // Move to success screen
            setConfirmHoldTime(0);

        } catch (err) {
            const errorMessage = err.response?.data?.message || 'অ্যাড মানি ব্যর্থ হয়েছে।';
            setError(errorMessage);
            setStep(2); // Go back to OTP/Amount entry on failure
            setConfirmHoldTime(0);
        } finally {
            setLoading(false);
        }
    };


    // --- JSX for each step ---
    const renderStepContent = () => {
        switch (step) {
            case 1: // Select Method (ATM or Card)
                return (
                    <>
                        <h3 className="step-subheading centered-text">যেকোনো একটি নির্বাচন করুন</h3>
                        <div className="add-money-method-selection">
                            <div
                                className={`method-option ${addMoneyMethod === 'atm' ? 'selected' : ''}`}
                                onClick={() => setAddMoneyMethod('atm')}
                            >
                                <div className="method-icon atm-icon">{/* ATM Icon Placeholder */}🏧</div>
                                <span>ATM</span>
                            </div>
                            <div
                                className={`method-option ${addMoneyMethod === 'card' ? 'selected' : ''}`}
                                onClick={() => setAddMoneyMethod('card')}
                            >
                                <div className="method-icon card-icon">{/* Card Icon Placeholder */}💳</div>
                                <span>Card</span>
                            </div>
                        </div>
                    </>
                );
            case 2: // Enter OTP (Simulated) and Amount
                return (
                    <>
                        <div className="add-money-details-grid">
                            <div className="grid-item compact">
                                <span className="label">নির্বাচিত মাধ্যম</span>
                                <div className="method-display-icon">
                                    {addMoneyMethod === 'atm' ? '🏧' : '💳'} {addMoneyMethod?.toUpperCase()}
                                </div>
                            </div>
                            <div className="grid-item compact">
                                <span className="label">ক্যাশেপে ব্যালেন্স</span>
                                <span className="value bold">৳{user?.balance?.toFixed(2) || '0.00'}</span>
                            </div>
                        </div>
                        <div className="input-group">
                            <label htmlFor="otp" className="input-label">OTP প্রদান করুন (যেমন 1234)</label>
                            <input
                                type="password" id="otp" className="pin-input large-dots" // Reuse pin-input style
                                value={otp} onChange={(e) => setOtp(e.target.value)}
                                placeholder="● ● ● ●" maxLength="4" required
                            />
                        </div>
                        <div className="input-group amount-input-group">
                            <label htmlFor="amount" className="visually-hidden">অ্যাড মানি পরিমাণ</label>
                            <span className="taka-symbol">৳</span>
                            <input
                                type="number" id="amount" className="amount-input"
                                value={amount} onChange={(e) => setAmount(e.target.value)}
                                placeholder="0" required min="1"
                            />
                        </div>
                    </>
                );
            case 3: // Confirmation Screen
                return (
                    <>
                        <h2 className="feature-page-heading centered">অ্যাড মানি নিশ্চিত করুন</h2>
                        <div className="confirmation-details">
                             <div className="confirmation-row single-item">
                                <span className="label">নির্বাচিত মাধ্যম:</span>
                                <div className="method-display-icon large">
                                    {addMoneyMethod === 'atm' ? '🏧' : '💳'} {addMoneyMethod?.toUpperCase()}
                                </div>
                            </div>
                            <div className="confirmation-grid">
                                <div className="grid-item"><span className="label">ক্যাশেপে ব্যালেন্স</span><span className="value">৳{user?.balance?.toFixed(2)}</span></div>
                                <div className="grid-item"><span className="label">অ্যাড মানি পরিমাণ</span><span className="value">৳{parseFloat(amount)?.toFixed(2)}</span></div>
                                <div className="grid-item full-width new-balance-item"><span className="label">নতুন ব্যালেন্স হবে</span><span className="value large-value">৳{(user.balance + parseFloat(amount))?.toFixed(2)}</span></div>
                            </div>
                        </div>
                        <p className="confirm-instruction">
                            অ্যাড মানি করতে নিচের বাটন ৩ সেকেন্ড ধরে রাখুন
                        </p>
                    </>
                );
            case 4: // Success Screen
                return (
                    <>
                        <h2 className="feature-page-heading centered success-heading">অ্যাড মানি সফল</h2>
                        <div className="confirmation-details">
                            <div className="confirmation-row single-item">
                                <span className="label">নির্বাচিত মাধ্যম:</span>
                                 <div className="method-display-icon large">
                                    {addMoneyMethod === 'atm' ? '🏧' : '💳'} {addMoneyMethod?.toUpperCase()}
                                </div>
                            </div>
                            <div className="confirmation-grid">
                                <div className="grid-item"><span className="label">নতুন ব্যালেন্স</span><span className="value large-value">৳{transactionDetails?.balanceAfterTransaction?.toFixed(2) ?? user?.balance?.toFixed(2)}</span></div>
                                <div className="grid-item"><span className="label">ট্রানজেকশন আইডি</span><span className="value">{transactionDetails?._id?.slice(-10) || 'N/A'}</span></div>
                            </div>
                        </div>
                        <p className="success-message-text">অ্যাড মানি সফল হয়েছে</p>
                    </>
                );
            default: return null;
        }
    };

    const backString = '←'

    return (
        <div className="feature-page-layout add-money-layout"> {/* Specific class for Add Money */}
            <div className="feature-page-top-section">
                 {/* Show back button on steps 1, 2, 3. Not on success. */}
                {(step === 1 || step === 2 || step === 3) &&
                    <button onClick={handleGoBack} className="back-button">{backString}</button>
                }
                {/* Conditionally show logo and heading */}
                {(step !== 3 && step !== 4) && <img src={logoPath} alt="C Pay Logo" className="feature-page-logo" />}
                {(step !== 3 && step !== 4) && <h2 className="feature-page-heading">অ্যাড মানি</h2>}
                {/* Heading for step 3 & 4 are within renderStepContent */}
            </div>

            <div className="feature-page-content">
                {error && <p className="error-message global-error">{error}</p>}
                {message && !error && <p className="success-message global-success">{message}</p>}
                {renderStepContent()}
            </div>

            {/* Conditional Bottom Button Section */}
            {step !== 4 && ( // Don't show "Next" on success screen
                <div className="feature-page-bottom-section">
                    {step === 3 ? ( // Confirmation hold button
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
                    ) : ( // Standard "Next" button
                        <button
                            onClick={handleNextStep} className="feature-page-next-button"
                            disabled={loading || (step === 1 && !addMoneyMethod) || (step === 2 && (!otp || !amount))}
                        >
                            {loading ? 'প্রসেসিং...' : 'পরবর্তী'}
                            {!loading && <span className="button-arrow">{' '}</span>}
                        </button>
                    )}
                </div>
            )}
            {step === 4 && ( // "Back to Home" button on success screen
                 <div className="feature-page-bottom-section">
                    <button onClick={() => navigate('/app')} className="feature-page-next-button">
                        হোম এ ফিরে যান <span className="button-arrow">{' '}</span>
                    </button>
                </div>
            )}
        </div>
    );
}

export default AddMoneyPage;