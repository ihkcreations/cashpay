// client/src/pages/agent/AgentPayBillPage.js
import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../api/api';
import { useAuth } from '../../context/AuthContext';
import logoPath from '../../assets/CashPayLogo.png';

// Reusing BILLER_CATEGORIES mock from user's PayBillPage or define/import here
// Ensure this matches the one in user's PayBillPage.js for consistency
const BILLER_CATEGORIES = {
    electricity: { name: 'বিদ্যুৎ', icon: '💡', billers: [
        { id: 'palli_prepaid', name: 'Palli Bidyut (Prepaid)', details: 'বিদ্যুৎ', customerIdLabel: 'মিটার নাম্বার' },
        { id: 'palli_postpaid', name: 'Palli Bidyut (Postpaid)', details: 'বিদ্যুৎ', customerIdLabel: 'একাউন্ট নাম্বার'  },
        { id: 'desco_prepaid', name: 'DESCO (Prepaid)', details: 'বিদ্যুৎ', customerIdLabel: 'একাউন্ট/মিটার নাম্বার'  },
        { id: 'desco_postpaid', name: 'DESCO (Postpaid)', details: 'বিদ্যুৎ', customerIdLabel: 'একাউন্ট নাম্বার'  },
    ]},
    gas: { name: 'গ্যাস', icon: '🔥', billers: [
        { id: 'titas_postpaid', name: 'Titas Gas Postpaid (Metered)', details: 'গ্যাস', customerIdLabel: 'কাস্টমার কোড' },
        { id: 'jalalabad_gas', name: 'Jalalabad Gas', details: 'গ্যাস', customerIdLabel: 'গ্রাহক নাম্বার' },
    ]},
    water: { name: 'পানি', icon: '💧', billers: [
        { id: 'dhaka_wasa', name: 'Dhaka WASA', details: 'পানি', customerIdLabel: 'বিল নাম্বার' },
        { id: 'chattogram_wasa', name: 'Chattogram WASA', details: 'পানি', customerIdLabel: 'কনজিউমার নাম্বার' },
    ]},
    internet: { name: 'ইন্টারনেট', icon: '🌐', billers: [
        { id: 'samonline', name: 'Samonline ISP', details: 'ইন্টারনেট', customerIdLabel: 'ইউজারনেম/কাস্টমার আইডি' },
        { id: 'link3', name: 'Link3 Technologies', details: 'ইন্টারনেট', customerIdLabel: 'ক্লায়েন্ট আইডি' },
        { id: 'amberit', name: 'AmberIT', details: 'ইন্টারনেট', customerIdLabel: 'ইউজার আইডি' },
    ]},
};


function AgentPayBillPage() {
    const [step, setStep] = useState(1);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategoryKey, setSelectedCategoryKey] = useState(null);
    const [availableBillers, setAvailableBillers] = useState([]);
    const [selectedBiller, setSelectedBiller] = useState(null);
    const [userMobileNumber, setUserMobileNumber] = useState(''); // Optional: User's mobile for whom bill is paid
    const [accountNumber, setAccountNumber] = useState(''); // Bill account/customer number
    const [amount, setAmount] = useState('');
    const [agentPin, setAgentPin] = useState(''); // Agent's PIN
    const [reference, setReference] = useState('');

    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false); // For API call processing
    const [uiLoading, setUiLoading] = useState(false); // For initial UI elements like fetching billers (if API based)
    const [transactionDetails, setTransactionDetails] = useState(null);

    const {user: currentAgent, updateUser: updateCurrentAgent } = useAuth();
    const navigate = useNavigate();

    const [confirmHoldTime, setConfirmHoldTime] = useState(0);
    const confirmIntervalRef = useRef(null);
    const CONFIRM_HOLD_DURATION = 3;

    useEffect(() => {
        if (step === 1) {
            setUiLoading(true); // Simulate loading if billers were fetched
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
            setAvailableBillers(billersToShow.slice(0, 15));
            setUiLoading(false);
        }
    }, [step, selectedCategoryKey, searchQuery]);

    const handleNextStep = () => {
        setError('');
        if (step === 1) {
            if (!selectedBiller) { setError('অনুগ্রহ করে একটি প্রতিষ্ঠান নির্বাচন করুন।'); return; }
            setStep(2);
        } else if (step === 2) {
            if (!accountNumber) { setError(`অনুগ্রহ করে ${selectedBiller?.customerIdLabel || 'বিল একাউন্ট নাম্বার'} দিন।`); return; }
            const numAmount = parseFloat(amount);
            if (isNaN(numAmount) || numAmount <= 0) { setError('অনুগ্রহ করে সঠিক পরিমাণ লিখুন।'); return; }
            if (currentAgent && currentAgent.balance < numAmount) { setError('আপনার এজেন্ট একাউন্টে অপর্যাপ্ত ব্যালেন্স।'); return; }
            setStep(3);
        } else if (step === 3) {
            if (agentPin.length !== 5 || !/^\d{5}$/.test(agentPin)) { setError('আপনার সঠিক ৫-সংখ্যার পিন দিন।'); return; }
            setStep(4);
        }
    };

    const handleGoBack = () => {
        setError(''); setMessage('');
        if (step > 1 && step < 5) {
            setStep(prevStep => prevStep - 1);
            if (step === 2) { setAccountNumber(''); setAmount(''); setUserMobileNumber(''); }
            if (step === 3) setAgentPin('');
        } else {
            navigate('/agent/dashboard');
        }
    };

    const handleSelectCategory = (categoryKey) => {
        setSelectedCategoryKey(categoryKey);
        setSelectedBiller(null);
        setSearchQuery('');
    };
    const handleSelectBiller = (biller) => {
        setSelectedBiller(biller);
        setSearchQuery('');
    };

    const handleConfirmMouseDown = () => {
        if (loading) return;
        if (confirmIntervalRef.current) clearInterval(confirmIntervalRef.current);
        setConfirmHoldTime(0); let chTime = 0;
        confirmIntervalRef.current = setInterval(() => {
            chTime++; setConfirmHoldTime(chTime);
            if (chTime >= CONFIRM_HOLD_DURATION) {
                if(confirmIntervalRef.current) clearInterval(confirmIntervalRef.current);
                handleAgentPayBillApiCall();
            }
        }, 1000);
    };
    const handleConfirmMouseUpOrLeave = () => {
        if (confirmIntervalRef.current) clearInterval(confirmIntervalRef.current);
        if (confirmHoldTime < CONFIRM_HOLD_DURATION && !loading) setConfirmHoldTime(0);
    };

    const handleAgentPayBillApiCall = async () => {
        setLoading(true); setError(''); setMessage('');
        try {
            const payload = {
                billerName: selectedBiller.name,
                billerCategory: BILLER_CATEGORIES[selectedCategoryKey]?.name || selectedBiller.details,
                accountNumber,
                amount: parseFloat(amount),
                agentPin,
                userMobileNumber: userMobileNumber || undefined,
                reference: reference || undefined
            };
            const { data } = await api.post('/agent/pay-bill', payload);
            setMessage(data.message || 'বিল পেমেন্ট সফল হয়েছে!');
            if (data.agentNewBalance !== undefined) updateCurrentAgent({ balance: data.agentNewBalance });
            setTransactionDetails(data.transaction);
            setStep(5);
        } catch (err) {
            setError(err.response?.data?.message || 'বিল পেমেন্ট ব্যর্থ হয়েছে।');
            // setStep(3); // Stay on PIN step to show error
            setConfirmHoldTime(0);
        } finally {
            setLoading(false);
        }
    };


    const renderStepContent = () => {
        switch (step) {
            case 1: // Select Biller Category & Biller
                return (
                    <>
                        <div className="input-group">
                            <label htmlFor="searchQuery" className="input-label">প্রতিষ্ঠানের নাম</label>
                            <input type="text" id="searchQuery" className="standard-input agent-input" value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} placeholder="সার্চ করুন..."/>
                        </div>
                        <div className="biller-category-selector agent-biller-categories">
                            {Object.keys(BILLER_CATEGORIES).map(key => (
                                <button key={key} onClick={() => handleSelectCategory(key)} className={`category-btn agent-cat-btn ${selectedCategoryKey === key ? 'active' : ''}`}>
                                    <span className="cat-icon">{BILLER_CATEGORIES[key].icon}</span>
                                    {BILLER_CATEGORIES[key].name}
                                </button>
                            ))}
                            <button onClick={() => handleSelectCategory(null)} className={`category-btn agent-cat-btn ${!selectedCategoryKey ? 'active' : ''}`}>
                                <span className="cat-icon">🌐</span> {/* Generic icon for "All" or "Other" */}
                                সব
                            </button>
                        </div>
                        <h3 className="contact-list-header agent-text">সব প্রতিষ্ঠান</h3>
                        <div className="contact-list biller-list">
                            {uiLoading && <p>লোড হচ্ছে...</p>}
                            {!uiLoading && availableBillers.length === 0 && <p style={{textAlign:'center'}}>এই ক্যাটাগরিতে কোনো বিলার নেই অথবা আপনার সার্চের সাথে মেলেনি।</p>}
                            {availableBillers.map(biller => (
                                <div key={biller.id} className={`contact-item ${selectedBiller?.id === biller.id ? 'selected-in-list' : ''}`} onClick={() => handleSelectBiller(biller)}>
                                    <span className="contact-avatar">{BILLER_CATEGORIES[Object.keys(BILLER_CATEGORIES).find(key => BILLER_CATEGORIES[key].billers.some(b=>b.id===biller.id))]?.icon || '🏢'}</span>
                                    <div className="contact-details">
                                        <span className="contact-name">{biller.name}</span>
                                        <span className="contact-number">{biller.details}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                );
            case 2: // Enter Bill Details & Amount
                return (
                    <>
                        <div className="recipient-display static agent-theme-display">
                            <span className="label">নির্বাচিত বিলার</span>
                            <div className="contact-item selected no-hover">
                                <span className="contact-avatar">{BILLER_CATEGORIES[selectedCategoryKey]?.icon || '🏢'}</span>
                                <div className="contact-details">
                                    <span className="contact-name">{selectedBiller?.name}</span>
                                    <span className="contact-number">{selectedBiller?.details}</span>
                                </div>
                            </div>
                        </div>
                        <div className="input-group">
                            <label htmlFor="userMobileNumber" className="input-label">গ্রাহকের মোবাইল নাম্বার (ঐচ্ছিক)</label>
                            <input type="tel" id="userMobileNumber" className="standard-input agent-input" value={userMobileNumber} onChange={e => setUserMobileNumber(e.target.value)} placeholder="01XXXXXXXXX (যদি থাকে)"/>
                        </div>
                        <div className="input-group">
                            <label htmlFor="accountNumber" className="input-label">{selectedBiller?.customerIdLabel || 'বিল একাউন্ট / কাস্টমার নং'}</label>
                            <input type="text" id="accountNumber" className="standard-input agent-input" value={accountNumber} onChange={e => setAccountNumber(e.target.value)} required />
                        </div>
                        <div className="input-group amount-input-group agent-amount-input">
                            <label htmlFor="amount" className="visually-hidden">পরিমাণ</label>
                            <span className="taka-symbol">৳</span>
                            <input type="number" id="amount" className="amount-input" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" required min="1"/>
                        </div>
                        {currentAgent && (<p className="available-balance large">আপনার ব্যবহারযোগ্য ব্যালেন্স<br/>৳ {currentAgent.balance?.toFixed(2) || '0.00'}</p>)}
                    </>
                );
            case 3: // Enter Agent PIN & Reference
                return (
                    <>
                        <div className="recipient-display static agent-theme-display">
                            <span className="label">বিলার</span>
                            <div className="contact-item selected no-hover"><span className="contact-avatar">{BILLER_CATEGORIES[selectedCategoryKey]?.icon || '🏢'}</span><div className="contact-details"><span className="contact-name">{selectedBiller?.name}</span></div></div>
                        </div>
                        <div className="amount-display agent-theme-amount">
                            <span className="label">পরিমাণ</span>
                            <span className="amount-value">৳{parseFloat(amount)?.toFixed(2) || '0.00'}</span>
                        </div>
                        <p className="step-instruction centered-text">কাস্টমার নং: {accountNumber}</p>
                        <div className="input-group">
                            <label htmlFor="agentPin" className="input-label centered-text">আপনার এজেন্ট পিন দিন</label>
                            <input type="password" id="agentPin" className="pin-input large-dots agent-pin-input" value={agentPin} onChange={(e) => setAgentPin(e.target.value)} placeholder="● ● ● ● ●" maxLength="5" required />
                        </div>
                        <div className="input-group">
                            <label htmlFor="reference" className="input-label">রেফারেন্স (ঐচ্ছিক)</label>
                            <input type="text" id="reference" className="standard-input agent-input" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="যেমন: জানুয়ারি মাসের বিল" />
                        </div>
                    </>
                );
            case 4: // Confirmation Screen
                return (
                    <>
                        <h2 className="feature-page-heading centered agent-theme-heading">পে বিল নিশ্চিত করুন</h2>
                        <div className="confirmation-details agent-theme-confirm">
                            <div className="confirmation-row">
                                <span className="label">বিলার:</span>
                                <div className="contact-item selected small no-hover"><span className="contact-avatar">{BILLER_CATEGORIES[selectedCategoryKey]?.icon || '🏢'}</span><div className="contact-details"><span className="contact-name">{selectedBiller?.name}</span></div></div>
                            </div>
                            <div className="confirmation-grid">
                                <div className="grid-item"><span className="label">পরিমাণ</span><span className="value">৳{parseFloat(amount)?.toFixed(2)}</span></div>
                                <div className="grid-item"><span className="label">একাউন্ট/কাস্টমার নং</span><span className="value">{accountNumber}</span></div>
                                <div className="grid-item"><span className="label">রেফারেন্স</span><span className="value">{reference || '-'}</span></div>
                                <div className="grid-item new-balance-item full-width"><span className="label">আপনার নতুন ব্যালেন্স হবে</span><span className="value large-value">৳{(currentAgent.balance - parseFloat(amount))?.toFixed(2)}</span></div>
                            </div>
                        </div>
                        <p className="confirm-instruction">পে বিল করতে নিচের বাটন ৩ সেকেন্ড ধরে রাখুন</p>
                    </>
                );
            case 5: // Success Screen
                return (
                    <>
                        <h2 className="feature-page-heading centered success-heading agent-success-heading">পে বিল সফল</h2>
                        <div className="confirmation-details agent-theme-confirm">
                            <div className="confirmation-row">
                                <span className="label">বিলার:</span>
                                 <div className="contact-item selected small no-hover"><span className="contact-avatar">{BILLER_CATEGORIES[selectedCategoryKey]?.icon || '🏢'}</span><div className="contact-details"><span className="contact-name">{selectedBiller?.name}</span></div></div>
                            </div>
                            <div className="confirmation-grid">
                                <div className="grid-item"><span className="label">পরিশোধিত পরিমাণ</span><span className="value">৳{transactionDetails?.amount?.toFixed(2)}</span></div>
                                <div className="grid-item"><span className="label">একাউন্ট/কাস্টমার নং</span><span className="value">{accountNumber}</span></div>
                                <div className="grid-item"><span className="label">রেফারেন্স</span><span className="value">{reference || (transactionDetails?.description?.includes('Ref:') ? transactionDetails.description.split('Ref: ')[1]?.replace(')','') : '-')}</span></div>
                                <div className="grid-item"><span className="label">আপনার নতুন ব্যালেন্স</span><span className="value bold">৳{currentAgent?.balance?.toFixed(2)}</span></div>
                                <div className="grid-item full-width"><span className="label">ট্রানজেকশন আইডি</span><span className="value">{transactionDetails?._id?.slice(-10) || 'N/A'}</span></div>
                            </div>
                        </div>
                        <p className="success-message-text agent-success-text">পে বিল সফল হয়েছে</p>
                    </>
                );
            default: return <p>একটি সমস্যা হয়েছে, অনুগ্রহ করে আবার চেষ্টা করুন।</p>;
        }
    };

    const backString = '←'

    return (
        <div className="agent-page-layout pay-bill-agent-page">
            <div className="agent-page-top-section">
                {(step === 1 || (step > 1 && step !== 5)) && (
                    <button onClick={handleGoBack} className="agent-back-button">
                      <span className="agent-back-button">{backString}</span> 
                    </button>
                )}
                {(step !== 4 && step !== 5) && <img src={logoPath} alt="CashPay Logo" className="feature-page-logo" />}
                {(step !== 4 && step !== 5) && <h2 className="feature-page-heading agent-theme-heading">পে বিল {selectedCategoryKey && step > 1 && BILLER_CATEGORIES[selectedCategoryKey] ? `(${BILLER_CATEGORIES[selectedCategoryKey].name})` : ''}</h2>}
            </div>

            <div className="agent-page-content">
                {error && <p className="error-message global-error">{error}</p>}
                {message && !error && <p className="success-message global-success">{message}</p>}
                {renderStepContent()}
            </div>

            {step < 4 && (
                <div className="agent-page-bottom-section">
                    <button onClick={handleNextStep} className="agent-page-next-button"
                        disabled={loading || uiLoading || (step === 1 && !selectedBiller) || (step === 2 && (!accountNumber || !amount))}
                    >
                        {loading || uiLoading ? 'প্রসেসিং...' : 'পরবর্তী'}
                        {(!loading && !uiLoading) && <span className="button-arrow">{' '}</span>}
                    </button>
                </div>
            )}
            {step === 4 && (
                <div className="agent-page-bottom-section">
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

export default AgentPayBillPage;