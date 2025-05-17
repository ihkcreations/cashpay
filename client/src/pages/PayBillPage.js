// client/src/pages/PayBillPage.js
import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/api';
import { useAuth } from '../context/AuthContext';
import logoPath from '../assets/CashPayLogo.png';

// --- Mock Biller Data for Prototype UI ---
const BILLER_CATEGORIES = {
    electricity: { name: 'বিদ্যুৎ', icon: '💡', billers: [
        { id: 'palli_prepaid', name: 'Palli Bidyut (Prepaid)', details: 'বিদ্যুৎ', requiresAccountNumber: true, requiresMeterNumber: false },
        { id: 'palli_postpaid', name: 'Palli Bidyut (Postpaid)', details: 'বিদ্যুৎ', requiresAccountNumber: true, requiresMeterNumber: false  },
        { id: 'desco_prepaid', name: 'DESCO (Prepaid)', details: 'বিদ্যুৎ', requiresAccountNumber: false, requiresMeterNumber: true  },
        { id: 'desco_postpaid', name: 'DESCO (Postpaid)', details: 'বিদ্যুৎ', requiresAccountNumber: true, requiresMeterNumber: false  },
    ]},
    gas: { name: 'গ্যাস', icon: '🔥', billers: [
        { id: 'titas_postpaid', name: 'Titas Gas Postpaid (Metered)', details: 'গ্যাস', requiresAccountNumber: true },
        { id: 'jalalabad_gas', name: 'Jalalabad Gas', details: 'গ্যাস', requiresAccountNumber: true },
    ]},
    water: { name: 'পানি', icon: '💧', billers: [
        { id: 'dhaka_wasa', name: 'Dhaka WASA', details: 'পানি', requiresAccountNumber: true },
        { id: 'chattogram_wasa', name: 'Chattogram WASA', details: 'পানি', requiresAccountNumber: true },
    ]},
    internet: { name: 'ইন্টারনেট', icon: '🌐', billers: [
        { id: 'samonline', name: 'Samonline ISP', details: 'ইন্টারনেট', requiresAccountNumber: true, customerIdLabel: 'Username/Customer ID' },
        { id: 'link3', name: 'Link3 Technologies', details: 'ইন্টারনেট', requiresAccountNumber: true, customerIdLabel: 'Client ID' },
        { id: 'amberit', name: 'AmberIT', details: 'ইন্টারনেট', requiresAccountNumber: true, customerIdLabel: 'User ID' },
    ]},
};
// --- End Mock Biller Data ---

function PayBillPage() {
    const [step, setStep] = useState(1);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategoryKey, setSelectedCategoryKey] = useState(null);
    const [availableBillers, setAvailableBillers] = useState([]);
    const [selectedBiller, setSelectedBiller] = useState(null); // { id, name, details, customerIdLabel }
    const [accountNumber, setAccountNumber] = useState('');
    const [amount, setAmount] = useState('');
    const [pin, setPin] = useState('');
    const [reference, setReference] = useState(''); // Optional

    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [transactionDetails, setTransactionDetails] = useState(null);

    const { user, updateUser } = useAuth();
    const navigate = useNavigate();

    const [confirmHoldTime, setConfirmHoldTime] = useState(0);
    const confirmIntervalRef = useRef(null);
    const CONFIRM_HOLD_DURATION = 3;

    useEffect(() => {
        if (step === 1) {
            let billersToShow = [];
            if (selectedCategoryKey && BILLER_CATEGORIES[selectedCategoryKey]) {
                billersToShow = BILLER_CATEGORIES[selectedCategoryKey].billers;
            } else {
                Object.values(BILLER_CATEGORIES).forEach(cat => billersToShow.push(...cat.billers));
            }
            if (searchQuery) {
                const lowerQuery = searchQuery.toLowerCase();
                billersToShow = billersToShow.filter(b =>
                    b.name.toLowerCase().includes(lowerQuery) ||
                    b.details.toLowerCase().includes(lowerQuery)
                );
            }
            setAvailableBillers(billersToShow.slice(0, 15)); // Limit initial display
        }
    }, [step, selectedCategoryKey, searchQuery]);

    const handleNextStep = () => {
        setError('');
        if (step === 1) {
            if (!selectedBiller) { setError('অনুগ্রহ করে একটি প্রতিষ্ঠান নির্বাচন করুন।'); return; }
            setStep(2);
        } else if (step === 2) {
            if (!accountNumber) { setError(`অনুগ্রহ করে ${selectedBiller?.customerIdLabel || 'কাস্টমার নাম্বার'} দিন।`); return; }
            const numAmount = parseFloat(amount);
            if (isNaN(numAmount) || numAmount <= 0) { setError('অনুগ্রহ করে সঠিক পরিমাণ লিখুন।'); return; }
            if (user && user.balance < numAmount) { setError('অপর্যাপ্ত ব্যালেন্স।'); return; }
            setStep(3);
        } else if (step === 3) {
            if (pin.length !== 5 || !/^\d{5}$/.test(pin)) { setError('অনুগ্রহ করে সঠিক ৫-সংখ্যার পিন দিন।'); return; }
            setStep(4);
        }
    };

    const handleGoBack = () => {
        setError(''); setMessage('');
        if (step > 1 && step < 5) {
            setStep(prevStep => prevStep - 1);
            if (step === 2) { setAccountNumber(''); setAmount(''); /* Keep selectedBiller */ }
            if (step === 3) setPin('');
            if (step === 4) { /* No specific state to clear from confirm data */ }
        } else {
            navigate('/app');
        }
    };

    const handleSelectCategory = (categoryKey) => {
        setSelectedCategoryKey(categoryKey);
        setSelectedBiller(null); // Reset selected biller when category changes
        setSearchQuery(''); // Clear search
    };

    const handleSelectBiller = (biller) => {
        setSelectedBiller(biller);
        setSearchQuery(''); // Clear search
    };

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
                  handlePayBillApiCall();
              }
          }, 1000);
     };
    const handleConfirmMouseUpOrLeave = () => { 
        if (confirmIntervalRef.current) clearInterval(confirmIntervalRef.current);
        if (confirmHoldTime < CONFIRM_HOLD_DURATION) setConfirmHoldTime(0);
     };

    const handlePayBillApiCall = async () => {
        setLoading(true); setError(''); setMessage('');
        try {
            const payload = {
                billerName: selectedBiller.name,
                billerCategory: BILLER_CATEGORIES[selectedCategoryKey]?.name || selectedBiller.details,
                accountNumber,
                amount: parseFloat(amount),
                pin,
                reference: reference || undefined
            };
            const { data } = await api.post('/transactions/pay-bill', payload);
            setMessage(data.message || 'বিল পেমেন্ট সফল হয়েছে!');
            if (data.newBalance !== undefined) updateUser({ balance: data.newBalance });
            setTransactionDetails(data.transaction);
            setStep(5);
        } catch (err) {
            setError(err.response?.data?.message || 'বিল পেমেন্ট ব্যর্থ হয়েছে।');
            setStep(3); // Go back to PIN entry on failure
        } finally { setLoading(false); setConfirmHoldTime(0); }
    };

    const renderStepContent = () => {
        switch (step) {
            case 1: // Select Biller Category & Biller
                return (
                    <>
                        <div className="input-group">
                            <label htmlFor="searchQuery" className="input-label">প্রতিষ্ঠানের নাম</label>
                            <input type="text" id="searchQuery" className="standard-input" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="সার্চ করুন..."/>
                        </div>
                        <div className="biller-category-selector">
                            {Object.keys(BILLER_CATEGORIES).map(key => (
                                <button key={key} onClick={() => handleSelectCategory(key)} className={`category-btn ${selectedCategoryKey === key ? 'active' : ''}`}>
                                    <span className="cat-icon">{BILLER_CATEGORIES[key].icon}</span>
                                    {BILLER_CATEGORIES[key].name}
                                </button>
                            ))}
                             <button onClick={() => handleSelectCategory(null)} className={`category-btn ${!selectedCategoryKey ? 'active' : ''}`}>
                                <span className="cat-icon">সব</span> {/* All */}
                            </button>
                        </div>
                        <h3 className="contact-list-header user-theme-text">সব প্রতিষ্ঠান</h3>
                        <div className="contact-list biller-list">
                            {availableBillers.length === 0 && !searchQuery && <p style={{textAlign:'center'}}>অনুগ্রহ করে একটি ক্যাটাগরি নির্বাচন করুন অথবা সার্চ করুন।</p>}
                            {availableBillers.length === 0 && searchQuery && <p style={{textAlign:'center'}}>এই নামে কোনো প্রতিষ্ঠান খুঁজে পাওয়া যায়নি।</p>}
                            {availableBillers.map(biller => (
                                <div key={biller.id} className={`contact-item ${selectedBiller?.id === biller.id ? 'selected-in-list' : ''}`} onClick={() => handleSelectBiller(biller)}>
                                    <span className="contact-avatar">{/* Icon based on biller.details or category */}</span>
                                    <div className="contact-details">
                                        <span className="contact-name">{biller.name}</span>
                                        <span className="contact-number">{biller.details}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                );
            case 2: // Enter Biller Account Number & Amount
                return (
                    <>
                        <div className="recipient-display static user-theme-display">
                            <span className="label">প্রাপক</span>
                            <div className="contact-item selected no-hover">
                                <span className="contact-avatar">{BILLER_CATEGORIES[selectedCategoryKey]?.icon || '🏢'}</span>
                                <div className="contact-details">
                                    <span className="contact-name">{selectedBiller?.name}</span>
                                    <span className="contact-number">{selectedBiller?.details}</span>
                                </div>
                            </div>
                        </div>
                        <div className="input-group">
                            <label htmlFor="accountNumber" className="input-label">{selectedBiller?.customerIdLabel || 'কাস্টমার নং / একাউন্ট নাম্বার'}</label>
                            <input type="text" id="accountNumber" className="standard-input" value={accountNumber} onChange={e => setAccountNumber(e.target.value)} required />
                        </div>
                        <div className="input-group amount-input-group user-amount-input">
                            <label htmlFor="amount" className="visually-hidden">পরিমাণ</label>
                            <span className="taka-symbol">৳</span>
                            <input type="number" id="amount" className="amount-input" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" required min="1"/>
                        </div>
                        {user && (
                            <p className="available-balance large">ব্যবহারযোগ্য ব্যালেন্স<br/>৳ {user.balance?.toFixed(2) || '0.00'}</p>
                        )}
                    </>
                );
            case 3: // Enter PIN & Reference
                return (
                    <>
                        <div className="recipient-display static user-theme-display">
                             <span className="label">প্রাপক</span>
                            <div className="contact-item selected no-hover">
                                 <span className="contact-avatar">{BILLER_CATEGORIES[selectedCategoryKey]?.icon || '🏢'}</span>
                                <div className="contact-details">
                                    <span className="contact-name">{selectedBiller?.name}</span>
                                    <span className="contact-number">{selectedBiller?.details}</span>
                                </div>
                            </div>
                        </div>
                        <div className="amount-display user-theme-amount">
                            <span className="label">পরিমাণ</span>
                            <span className="amount-value">৳{parseFloat(amount)?.toFixed(2) || '0.00'}</span>
                        </div>
                        <p className="step-instruction centered-text">কাস্টমার নং: {accountNumber}</p>
                        <div className="input-group">
                            <label htmlFor="pin" className="input-label centered-text">আপনার পিন দিন</label>
                            <input type="password" id="pin" className="pin-input large-dots user-pin-input" value={pin} onChange={(e) => setPin(e.target.value)} placeholder="● ● ● ● ●" maxLength="5" required />
                        </div>
                        <div className="input-group">
                            <label htmlFor="reference" className="input-label">রেফারেন্স (ঐচ্ছিক)</label>
                            <input type="text" id="reference" className="standard-input" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="যেমন: জানুয়ারি মাসের বিল" />
                        </div>
                    </>
                );
            case 4: // Confirmation Screen
                return (
                    <>
                        <h2 className="feature-page-heading centered user-theme-heading">পে বিল নিশ্চিত করুন</h2>
                        <div className="confirmation-details user-theme-confirm">
                            <div className="confirmation-row">
                                <span className="label">প্রাপক:</span>
                                <div className="contact-item selected small no-hover">
                                    <span className="contact-avatar">{BILLER_CATEGORIES[selectedCategoryKey]?.icon || '🏢'}</span>
                                    <div className="contact-details">
                                        <span className="contact-name">{selectedBiller?.name}</span>
                                        <span className="contact-number">{selectedBiller?.details}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="confirmation-grid">
                                <div className="grid-item"><span className="label">পরিমাণ</span><span className="value">৳{parseFloat(amount)?.toFixed(2)}</span></div>
                                <div className="grid-item"><span className="label">কাস্টমার নং</span><span className="value">{accountNumber}</span></div>
                                <div className="grid-item"><span className="label">রেফারেন্স</span><span className="value">{reference || '-'}</span></div>
                                <div className="grid-item new-balance-item full-width"><span className="label">নতুন ব্যালেন্স হবে</span><span className="value large-value">৳{(user.balance - parseFloat(amount))?.toFixed(2)}</span></div>
                            </div>
                        </div>
                        <p className="confirm-instruction">পে বিল করতে নিচের বাটন ৩ সেকেন্ড ধরে রাখুন</p>
                    </>
                );
            case 5: // Success Screen
                return (
                    <>
                        <h2 className="feature-page-heading centered success-heading user-success-heading">পে বিল সফল</h2>
                        <div className="confirmation-details user-theme-confirm">
                            <div className="confirmation-row">
                                <span className="label">প্রাপক:</span>
                                <div className="contact-item selected small no-hover">
                                    <span className="contact-avatar">{BILLER_CATEGORIES[selectedCategoryKey]?.icon || '🏢'}</span>
                                    <div className="contact-details">
                                        <span className="contact-name">{selectedBiller?.name}</span>
                                        <span className="contact-number">{selectedBiller?.details}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="confirmation-grid">
                                <div className="grid-item"><span className="label">পরিমাণ</span><span className="value">৳{transactionDetails?.amount?.toFixed(2)}</span></div>
                                <div className="grid-item"><span className="label">কাস্টমার নং</span><span className="value">{accountNumber}</span></div>
                                <div className="grid-item"><span className="label">রেফারেন্স</span><span className="value">{reference || (transactionDetails?.description?.includes('Ref:') ? transactionDetails.description.split('Ref: ')[1]?.replace(')','') : '-')}</span></div>
                                <div className="grid-item"><span className="label">নতুন ব্যালেন্স</span><span className="value bold">৳{user?.balance?.toFixed(2)}</span></div>
                                <div className="grid-item full-width"><span className="label">ট্রানজেকশন আইডি</span><span className="value">{transactionDetails?._id?.slice(-10) || 'N/A'}</span></div>
                            </div>
                        </div>
                        <p className="success-message-text user-success-text">পে বিল সফল হয়েছে</p>
                    </>
                );
            default: return null;
        }
    };

    const backString = '←'

    return (
        <div className="feature-page-layout pay-bill-page user-theme-bg">
            <div className="feature-page-top-section user-theme-header">
                {(step === 1 || (step > 1 && step !== 5)) && <button onClick={handleGoBack} className="back-button user-theme-back">{backString}</button>}
                {(step !== 4 && step !== 5) && <img src={logoPath} alt="CashPay Logo" className="feature-page-logo" />}
                {(step !== 4 && step !== 5) && <h2 className="feature-page-heading user-theme-heading">পে বিল {selectedCategoryKey && BILLER_CATEGORIES[selectedCategoryKey] ? `(${BILLER_CATEGORIES[selectedCategoryKey].name})` : ''}</h2>}
            </div>

            <div className="feature-page-content">
                {error && <p className="error-message global-error">{error}</p>}
                {message && !error && <p className="success-message global-success">{message}</p>}
                {renderStepContent()}
            </div>

            {step < 4 && (
                <div className="feature-page-bottom-section user-theme-footer">
                    <button onClick={handleNextStep} className="feature-page-next-button user-theme-button"
                        disabled={loading || (step === 1 && !selectedBiller) || (step === 2 && (!accountNumber || !amount))}
                    >
                        {loading ? 'প্রসেসিং...' : 'পরবর্তী'}
                        {!loading && <span className="button-arrow user-theme-arrow">{' '}</span>}
                    </button>
                </div>
            )}
            {step === 4 && (
                <div className="feature-page-bottom-section user-theme-footer">
                    <button
                        className={`feature-page-next-button confirm-hold-button user-theme-confirm-btn ${confirmHoldTime > 0 ? 'holding' : ''}`}
                        onMouseDown={handleConfirmMouseDown} onMouseUp={handleConfirmMouseUpOrLeave}
                        onMouseLeave={handleConfirmMouseUpOrLeave} onTouchStart={handleConfirmMouseDown}
                        onTouchEnd={handleConfirmMouseUpOrLeave}
                        disabled={loading || confirmHoldTime === CONFIRM_HOLD_DURATION}
                    >
                        {loading ? 'প্রসেসিং...' : `কনফার্ম (${CONFIRM_HOLD_DURATION - confirmHoldTime} সেকেন্ড)`}
                        {(!loading && confirmHoldTime < CONFIRM_HOLD_DURATION) && <span className="button-arrow user-theme-arrow">{' '}</span>}
                    </button>
                </div>
            )}
            {step === 5 && (
                 <div className="feature-page-bottom-section user-theme-footer">
                    <button onClick={() => navigate('/app')} className="feature-page-next-button user-theme-button">
                        হোম এ ফিরে যান <span className="button-arrow user-theme-arrow">{' '}</span>
                    </button>
                </div>
            )}
        </div>
    );
}

export default PayBillPage;