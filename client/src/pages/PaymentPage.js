// client/src/pages/PaymentPage.js
import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/api';
import { useAuth } from '../context/AuthContext';
import logoPath from '../assets/CashPayLogo.png';

function PaymentPage() {
    const [step, setStep] = useState(1);
    const [searchQuery, setSearchQuery] = useState('');
    const [allMerchants, setAllMerchants] = useState([]);
    const [filteredMerchants, setFilteredMerchants] = useState([]);
    const [selectedMerchant, setSelectedMerchant] = useState(null); // { merchantName, merchantId, mobileNumber, _id }
    const [amount, setAmount] = useState('');
    const [pin, setPin] = useState('');
    const [reference, setReference] = useState('');
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false); // For API calls
    const [uiLoading, setUiLoading] = useState(false); // For fetching merchants
    const [transactionDetails, setTransactionDetails] = useState(null);

    const { user, updateUser } = useAuth();
    const navigate = useNavigate();

    const [confirmHoldTime, setConfirmHoldTime] = useState(0);
    const confirmIntervalRef = useRef(null);
    const CONFIRM_HOLD_DURATION = 3; // 3 seconds for Payment confirm

    // Fetch all merchants for list (Step 1)
    useEffect(() => {
        if (step === 1 && allMerchants.length === 0) {
            const fetchMerchants = async () => {
                setUiLoading(true);
                try {
                    const { data } = await api.get('/merchants'); // API endpoint to get merchants
                    setAllMerchants(data);
                    setFilteredMerchants(data);
                } catch (err) {
                    setError('মার্চেন্ট তালিকা লোড করতে সমস্যা হয়েছে।');
                    console.error("Error fetching merchants:", err);
                }
                setUiLoading(false);
            };
            fetchMerchants();
        }
    }, [step, allMerchants.length]);

    // Filter merchants based on search query
    useEffect(() => {
        if (step === 1) { // Only filter if on step 1
            if (searchQuery === '') {
                setFilteredMerchants(allMerchants);
            } else {
                const lowerQuery = searchQuery.toLowerCase();
                setFilteredMerchants(
                    allMerchants.filter(
                        merchant =>
                            (merchant.merchantName && merchant.merchantName.toLowerCase().includes(lowerQuery)) ||
                            (merchant.merchantId && merchant.merchantId.toLowerCase().includes(lowerQuery)) ||
                            merchant.mobileNumber.includes(searchQuery) // Assuming searchQuery could be a number
                    )
                );
            }
        }
    }, [searchQuery, allMerchants, step]);


    const handleNextStep = () => {
        setError('');
        if (step === 1) {
            if (!selectedMerchant && !searchQuery) { // Simplified: must select or have a valid search intended for direct use
                setError('অনুগ্রহ করে মার্চেন্ট নির্বাচন করুন বা মার্চেন্ট আইডি/নাম্বার দিন।');
                return;
            }
            // If searchQuery is used directly, try to find a match or prepare for direct ID usage
            if (!selectedMerchant && searchQuery) {
                const directMatch = allMerchants.find(m => m.merchantId === searchQuery || m.mobileNumber === searchQuery || m.merchantName.toLowerCase() === searchQuery.toLowerCase());
                if (directMatch) {
                    setSelectedMerchant(directMatch);
                } else {
                    // For prototype, assume merchantId from input field will be used if no direct match from list
                    // This requires backend to handle lookup by merchantId string
                    setSelectedMerchant({ merchantName: `Merchant (${searchQuery})`, merchantId: searchQuery, mobileNumber: '' });
                }
            } else if (!selectedMerchant) {
                setError('অনুগ্রহ করে মার্চেন্ট নির্বাচন করুন।');
                return;
            }
            setStep(2);
        } else if (step === 2) {
            const numAmount = parseFloat(amount);
            if (isNaN(numAmount) || numAmount <= 0) {
                setError('অনুগ্রহ করে সঠিক পরিমাণ লিখুন।');
                return;
            }
            if (user && user.balance < numAmount) {
                setError('অপর্যাপ্ত ব্যালেন্স।');
                return;
            }
            setStep(3);
        } else if (step === 3) {
            if (pin.length !== 5 || !/^\d{5}$/.test(pin)) {
                setError('অনুগ্রহ করে সঠিক ৫-সংখ্যার পিন দিন।');
                return;
            }
            setStep(4);
        }
    };

    const handleGoBack = () => {
        setError('');
        if (step > 1 && step < 5) {
            setStep(step - 1);
            if (step === 2) setAmount('');
            if (step === 3) setPin('');
        } else if (step === 1) {
            navigate('/app');
        }
    };

    const handleSelectMerchant = (merchant) => {
        setSelectedMerchant(merchant);
        setSearchQuery(''); // Clear search after selection
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
                handleMakePayment();
            }
        }, 1000);
    };
    const handleConfirmMouseUpOrLeave = () => {
        if (confirmIntervalRef.current) clearInterval(confirmIntervalRef.current);
        if (confirmHoldTime < CONFIRM_HOLD_DURATION) setConfirmHoldTime(0);
    };

    const handleMakePayment = async () => {
        setLoading(true);
        setError('');
        setMessage('');
        try {
            const payload = {
                // Backend expects merchantId. This can be the custom merchantId or MongoDB _id
                merchantId: selectedMerchant._id || selectedMerchant.merchantId,
                amount: parseFloat(amount),
                pin: pin,
                reference: reference || undefined
            };
            const { data } = await api.post('/transactions/payment', payload);

            setMessage(data.message || 'পেমেন্ট সফল হয়েছে!');
            if (data.newBalance !== undefined) {
                updateUser(prevUser => ({ ...prevUser, balance: data.newBalance }));
            }
            setTransactionDetails(data.transaction);
            setStep(5);
            setConfirmHoldTime(0);

        } catch (err) {
            const errorMessage = err.response?.data?.message || 'পেমেন্ট ব্যর্থ হয়েছে।';
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
            case 1: // Select Merchant
                return (
                    <>
                        <div className="input-group">
                            <label htmlFor="searchQuery">মার্চেন্ট এর নাম বা নাম্বার দিন</label>
                            <input
                                type="text" id="searchQuery" className="standard-input"
                                placeholder="মার্চেন্ট এর নাম, আইডি বা মোবাইল"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <h3 className="contact-list-header">মার্চেন্ট লিস্ট</h3>
                        <div className="contact-list"> {/* Reuse contact-list style */}
                            {uiLoading && <p style={{textAlign: 'center', padding: '10px'}}>মার্চেন্ট লোড হচ্ছে...</p>}
                            {!uiLoading && filteredMerchants.length === 0 && <p style={{textAlign: 'center', padding: '10px'}}>কোনো মার্চেন্ট খুঁজে পাওয়া যায়নি।</p>}
                            {filteredMerchants.map(merchant => (
                                <div key={merchant._id || merchant.merchantId}
                                     className={`contact-item ${selectedMerchant?._id === merchant._id || selectedMerchant?.merchantId === merchant.merchantId ? 'selected-in-list' : ''}`}
                                     onClick={() => handleSelectMerchant(merchant)}>
                                    <span className="contact-avatar merchant-avatar">{/* Merch Icon */}🛍️</span>
                                    <div className="contact-details">
                                        <span className="contact-name">{merchant.merchantName}</span>
                                        <span className="contact-number">{merchant.merchantId} ({merchant.mobileNumber})</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                );
            case 2: // Enter Amount
                return (
                    <>
                        <div className="recipient-display"> {/* Reusing class */}
                            <span className="label">মার্চেন্ট</span>
                            <div className="contact-item selected">
                                <span className="contact-avatar merchant-avatar">🛍️</span>
                                <div className="contact-details">
                                    <span className="contact-name">{selectedMerchant?.merchantName}</span>
                                    <span className="contact-number">{selectedMerchant?.merchantId}</span>
                                </div>
                            </div>
                        </div>
                        <div className="input-group amount-input-group">
                            <label htmlFor="amount" className="visually-hidden">পরিমাণ</label>
                            <span className="taka-symbol">৳</span>
                            <input type="number" id="amount" className="amount-input" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" required min="1"/>
                        </div>
                        <p className="available-balance large">ব্যবহারযোগ্য ব্যালেন্স<br/>৳ {user?.balance?.toFixed(2) || '0.00'}</p>
                    </>
                );
            case 3: // Enter PIN & Reference
                return (
                    <>
                        <div className="recipient-display">
                            <span className="label">মার্চেন্ট</span>
                            <div className="contact-item selected">
                                 <span className="contact-avatar merchant-avatar">🛍️</span>
                                 <div className="contact-details">
                                    <span className="contact-name">{selectedMerchant?.merchantName}</span>
                                    <span className="contact-number">{selectedMerchant?.merchantId}</span>
                                </div>
                            </div>
                        </div>
                        <div className="amount-display">
                            <span className="label">পরিমাণ</span>
                            <span className="amount-value">৳{parseFloat(amount)?.toFixed(2) || '0.00'}</span>
                        </div>
                        <div className="input-group">
                            <label htmlFor="pin" className="visually-hidden">বিকাশ পিন</label>
                            <input type="password" id="pin" className="pin-input large-dots" value={pin} onChange={(e) => setPin(e.target.value)} placeholder="● ● ● ● ●" maxLength="5" required />
                        </div>
                        <div className="input-group">
                            <label htmlFor="reference" className="input-label">রেফারেন্স (Optional)</label>
                            <input type="text" id="reference" className="standard-input" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="e.g., Order #123" />
                        </div>
                    </>
                );
            case 4: // Confirmation
                return (
                    <>
                        <h2 className="feature-page-heading centered">পেমেন্ট নিশ্চিত করুন</h2>
                        <div className="confirmation-details">
                            <div className="confirmation-row">
                                <span className="label">মার্চেন্ট:</span>
                                <div className="contact-item selected small">
                                    <span className="contact-avatar merchant-avatar">🛍️</span>
                                    <div className="contact-details">
                                        <span className="contact-name">{selectedMerchant?.merchantName}</span>
                                        <span className="contact-number">{selectedMerchant?.merchantId}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="confirmation-grid">
                                <div className="grid-item"><span className="label">পরিমাণ</span><span className="value">৳{parseFloat(amount)?.toFixed(2)}</span></div>
                                <div className="grid-item"><span className="label">রেফারেন্স</span><span className="value">{reference || '-'}</span></div>
                                <div className="grid-item full-width new-balance-item"><span className="label">নতুন ব্যালেন্স হবে</span><span className="value large-value">৳{(user.balance - parseFloat(amount))?.toFixed(2)}</span></div>
                            </div>
                        </div>
                        <p className="confirm-instruction">পেমেন্ট করতে নিচের বাটন ৩ সেকেন্ড ধরে রাখুন</p>
                    </>
                );
            case 5: // Success
                return (
                    <>
                        <h2 className="feature-page-heading centered success-heading">পেমেন্ট সফল</h2>
                        <div className="confirmation-details">
                            <div className="confirmation-row">
                                <span className="label">মার্চেন্ট:</span>
                                <div className="contact-item selected small">
                                     <span className="contact-avatar merchant-avatar">🛍️</span>
                                     <div className="contact-details">
                                        <span className="contact-name">{selectedMerchant?.merchantName}</span>
                                        <span className="contact-number">{selectedMerchant?.merchantId}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="confirmation-grid">
                                <div className="grid-item"><span className="label">পরিমাণ</span><span className="value">৳{transactionDetails?.amount?.toFixed(2)}</span></div>
                                <div className="grid-item"><span className="label">রেফারেন্স</span><span className="value">{transactionDetails?.description?.includes('Ref:') ? transactionDetails.description.split('Ref: ')[1]?.replace(')','') : (reference || '-')}</span></div>
                                <div className="grid-item"><span className="label">নতুন ব্যালেন্স</span><span className="value">৳{transactionDetails?.balanceAfterTransaction?.toFixed(2) ?? user?.balance?.toFixed(2)}</span></div>
                                <div className="grid-item"><span className="label">ট্রানজেকশন আইডি</span><span className="value">{transactionDetails?._id?.slice(-10) || 'N/A'}</span></div>
                            </div>
                        </div>
                        <p className="success-message-text">পেমেন্ট সফল হয়েছে</p>
                    </>
                );
            default: return null;
        }
    };

    const backString = '←'

    return (
        <div className="feature-page-layout payment-layout"> {/* Specific class for Payment */}
            <div className="feature-page-top-section">
                {(step > 1 && step !== 5) && <button onClick={handleGoBack} className="back-button">{backString}</button>}
                {step === 1 && <button onClick={handleGoBack} className="back-button">{backString}</button>}
                {(step !== 4 && step !== 5) && <img src={logoPath} alt="C Pay Logo" className="feature-page-logo" />}
                {(step !== 4 && step !== 5) && <h2 className="feature-page-heading">পেমেন্ট</h2>}
            </div>

            <div className="feature-page-content">
                {error && <p className="error-message global-error">{error}</p>}
                {message && !error && <p className="success-message global-success">{message}</p>}
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
                            disabled={loading || (step === 1 && !selectedMerchant && !searchQuery) || (step === 2 && !amount)}
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

export default PaymentPage;