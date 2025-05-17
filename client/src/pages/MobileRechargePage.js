// client/src/pages/MobileRechargePage.js
import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/api';
import { useAuth } from '../context/AuthContext';
import logoPath from '../assets/CashPayLogo.png';

function MobileRechargePage() {
    const [step, setStep] = useState(1);
    const [searchQuery, setSearchQuery] = useState(''); // For mobile number input or contact search
    const [allUsers, setAllUsers] = useState([]); // For contact list suggestions
    const [filteredUsers, setFilteredUsers] = useState([]);
    const [selectedTarget, setSelectedTarget] = useState(null); // { name (optional), mobileNumber }
    const [amount, setAmount] = useState('');
    const [pin, setPin] = useState('');
    const [operator, setOperator] = useState(''); // Optional operator
    const [reference, setReference] = useState(''); // Optional reference (can double as operator if no dedicated field)

    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [transactionDetails, setTransactionDetails] = useState(null);

    const { user, updateUser } = useAuth();
    const navigate = useNavigate();

    const [confirmHoldTime, setConfirmHoldTime] = useState(0);
    const confirmIntervalRef = useRef(null);
    const CONFIRM_HOLD_DURATION = 3;
    const [isSubmitting, setIsSubmitting] = useState(false);


    // Fetch contacts (all users for prototype)
    useEffect(() => {
        if (step === 1 && allUsers.length === 0) {
            const fetchContacts = async () => {
                setLoading(true);
                try {
                    const { data } = await api.get('/user/all'); // Existing endpoint
                    setAllUsers(data); // Keep self in list, can recharge own number
                    setFilteredUsers(data);
                } catch (err) { setError('Failed to load contacts.'); }
                setLoading(false);
            };
            fetchContacts();
        }
    }, [step, allUsers.length]);

    // Filter contacts/users
    useEffect(() => {
        if (searchQuery === '') {
            setFilteredUsers(allUsers);
        } else {
            const lowerQuery = searchQuery.toLowerCase();
            // Allow direct number input or search by name/number from contacts
            if (/^01[3-9]\d{0,8}$/.test(searchQuery)) { // If typing a number
                setFilteredUsers(allUsers.filter(u => u.mobileNumber.startsWith(searchQuery)));
            } else { // If typing a name
                setFilteredUsers(allUsers.filter(u => u.name && u.name.toLowerCase().includes(lowerQuery)));
            }
        }
    }, [searchQuery, allUsers]);

    // --- Step Navigation ---
    const handleNextStep = () => {
        setError('');
        if (step === 1) {
            let targetToSet = selectedTarget;
            if (!targetToSet && formatMobileNumber(searchQuery)) { // If a valid number is typed but not selected
                targetToSet = { name: 'Entered Number', mobileNumber: formatMobileNumber(searchQuery) };
            } else if (!targetToSet && !formatMobileNumber(searchQuery)) {
                 setError('Please enter a valid mobile number or select from contacts.');
                 return;
            }
            if (!targetToSet) { // Final check if still no target
                setError('Please provide a target mobile number.');
                return;
            }
            setSelectedTarget(targetToSet); // Ensure state is set with the chosen/typed number
            setStep(2);
        } else if (step === 2) {
            const numAmount = parseFloat(amount);
            if (isNaN(numAmount) || numAmount <= 0) { setError('Please enter a valid amount.'); return; }
            if (user && user.balance < numAmount) { setError('Insufficient balance.'); return; }
            setStep(3);
        } else if (step === 3) {
            if (pin.length !== 5 || !/^\d{5}$/.test(pin)) { setError('Please enter a valid 5-digit PIN.'); return; }
            setStep(4);
        }
    };

    const handleGoBack = () => {
        setError('');
        if (step > 1) setStep(step - 1);
        else navigate('/app');
    };

    const handleSelectTarget = (target) => {
        setSelectedTarget(target);
        setSearchQuery(target.mobileNumber); // Pre-fill search with selected number
        // Optionally auto-advance:
        // setError(''); setStep(2);
    };

    // --- Confirmation Button & API Call --- (Similar to SendMoneyPage)
    const handleConfirmMouseDown = () => { 
      if (isSubmitting || loading) { // Prevent starting new hold if already submitting or loading
              
              return;
        }

        
        // Clear any existing interval immediately
        if (confirmIntervalRef.current) {
            clearInterval(confirmIntervalRef.current);
            confirmIntervalRef.current = null; // Explicitly nullify
        }

        setConfirmHoldTime(0); // Reset time
        setError('');
        setMessage('');

          // --- Modified Interval Logic ---
        let currentHoldTime = 0; // Use a local variable for the interval's counter
        confirmIntervalRef.current = setInterval(() => {
        currentHoldTime++;
        setConfirmHoldTime(currentHoldTime); // Update state for UI display

        if (currentHoldTime >= CONFIRM_HOLD_DURATION) {
            // CRITICAL: Clear the interval immediately
            if (confirmIntervalRef.current) {
                clearInterval(confirmIntervalRef.current);
                confirmIntervalRef.current = null; // Mark as cleared
            }
            
            
            
            // Check isSubmitting state here. Since setIsSubmitting(true) is the first sync line in handleSendMoney,
            // if handleSendMoney was already called by a rapid previous tick (which shouldn't happen with this structure),
            // isSubmitting *should* be true.
            // However, the main guard is within handleSendMoney itself.
            // This check here is an additional layer.
            if (!isSubmitting) {
                handleMobileRecharge();
            } else {
                
            }
          }
      }, 1000);
    };
    const handleConfirmMouseUpOrLeave = () => {
      
      if (confirmIntervalRef.current) {
          clearInterval(confirmIntervalRef.current);
          confirmIntervalRef.current = null;
      }
      // Only reset visual hold time if we haven't started submitting
      // If submission started, handleSendMoney will manage confirmHoldTime reset on completion/error
      if (!isSubmitting) {
          setConfirmHoldTime(0);
      }
    }; 
      

    const handleMobileRecharge = async () => {
        if (isSubmitting) return;
        setIsSubmitting(true); setLoading(true); setError(''); setMessage('');

        try {
            const payload = {
                targetMobileNumber: selectedTarget.mobileNumber,
                amount: parseFloat(amount),
                pin: pin,
                operator: operator || undefined, // Send if provided
                reference: reference || undefined // Send if provided
            };
            const { data } = await api.post('/transactions/mobile-recharge', payload);
            setMessage(data.message || 'Mobile Recharge successful!');
            if (data.newBalance !== undefined) {
                updateUser(prevUser => ({ ...prevUser, balance: data.newBalance }));
            }
            setTransactionDetails(data.transaction);
            setStep(5);
            setConfirmHoldTime(0);
        } catch (err) {
            setError(err.response?.data?.message || 'Mobile recharge failed.');
            if (step !== 5) { setStep(3); setPin(''); } // Go back to PIN on error
            setConfirmHoldTime(0);
        } finally {
            setLoading(false); setIsSubmitting(false);
        }
    };

    // Helper, can be moved to utils
    const formatMobileNumber = (numStr) => {
        if (!numStr) return null;
        const digits = numStr.replace(/\D/g, '');
        if (digits.startsWith('8801') && digits.length === 13) return digits.substring(2); // 01...
        if (digits.startsWith('01') && digits.length === 11) return digits;
        return null; // Invalid format
    };


    // --- JSX for each step (adapt from SendMoneyPage) ---
    const renderStepContent = () => {
        switch (step) {
            case 1: // Select/Enter Mobile Number
                return (
                    <>
                        <div className="input-group">
                            <label htmlFor="searchQuery">নাম বা নাম্বার দিন</label>
                            <input
                                type="text" id="searchQuery" className="standard-input"
                                placeholder="মোবাইল নাম্বার লিখুন"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <h3 className="contact-list-header">কন্টাক্ট লিস্ট (বাছাই করুন)</h3>
                        <div className="contact-list">
                            {loading && <p>Loading...</p>}
                            {filteredUsers.map(contact => (
                                <div key={contact._id || contact.mobileNumber}
                                    className={`contact-item ${selectedTarget?.mobileNumber === contact.mobileNumber ? 'selected-in-list' : ''}`}
                                    onClick={() => handleSelectTarget(contact)}>
                                    <span className="contact-avatar"></span>
                                    <div className="contact-details">
                                        <span className="contact-name">{contact.name || 'Saved Number'}</span>
                                        <span className="contact-number">{contact.mobileNumber}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                );
            case 2: // Enter Amount
                return (
                    <>
                        <div className="recipient-display"> {/* Re-purpose for target mobile */}
                            <span className="label">মোবাইল নাম্বার</span>
                            <div className="contact-item selected">
                                <span className="contact-avatar"></span>
                                <div className="contact-details">
                                    {/* Name might not be available if number was typed directly */}
                                    <span className="contact-name">{selectedTarget?.name || selectedTarget?.mobileNumber}</span>
                                    {selectedTarget?.name && <span className="contact-number">{selectedTarget?.mobileNumber}</span>}
                                </div>
                            </div>
                        </div>
                        {/* Operator input (optional) */}
                        <div className="input-group">
                            <label htmlFor="operator">অপারেটর (Optional)</label>
                            <input type="text" id="operator" className="standard-input" value={operator} onChange={e => setOperator(e.target.value)} placeholder="e.g., Grameenphone, Robi"/>
                        </div>
                        <div className="input-group amount-input-group">
                            <label htmlFor="amount" className="visually-hidden">পরিমাণ</label>
                            <span className="taka-symbol">৳</span>
                            <input type="number" id="amount" className="amount-input" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" required min="10"/>
                        </div>
                        <p className="available-balance large">ব্যবহারযোগ্য ব্যালেন্স<br/>৳ {user?.balance?.toFixed(2) || '0.00'}</p>
                    </>
                );
            case 3: // Enter PIN & Optional Reference (Reference can be used for specific pack info if not operator)
                return (
                    <>
                        <div className="recipient-display">
                            <span className="label">মোবাইল নাম্বার</span>
                            <div className="contact-item selected">
                                <span className="contact-avatar"></span>
                                <div className="contact-details">
                                    <span className="contact-name">{selectedTarget?.name || selectedTarget?.mobileNumber}</span>
                                    {selectedTarget?.name && <span className="contact-number">{selectedTarget?.mobileNumber}</span>}
                                </div>
                            </div>
                        </div>
                        <div className="amount-display">
                            <span className="label">পরিমাণ</span>
                            <span className="amount-value">৳{parseFloat(amount)?.toFixed(2) || '0.00'}</span>
                        </div>
                        {operator && <p style={{textAlign: 'center', marginBottom: '15px', fontSize: '14px'}}>অপারেটর: {operator}</p>}
                        <div className="input-group">
                            <label htmlFor="pin" className="visually-hidden">বিকাশ পিন</label>
                            <input type="password" id="pin" className="pin-input large-dots" value={pin} onChange={(e) => setPin(e.target.value)} placeholder="● ● ● ● ●" maxLength="5" required />
                        </div>
                        <div className="input-group">
                            <label htmlFor="reference" className="input-label">রেফারেন্স (Optional)</label>
                            <input type="text" id="reference" className="standard-input" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="e.g., Monthly pack" />
                        </div>
                    </>
                );
            case 4: // Confirmation
                return (
                    <>
                        <h2 className="feature-page-heading centered">মোবাইল রিচার্জ নিশ্চিত করুন</h2>
                        <div className="confirmation-details">
                            <div className="confirmation-row">
                                <span className="label">মোবাইল:</span>
                                <div className="contact-item selected small">
                                    <span className="contact-avatar"></span>
                                    <div className="contact-details">
                                        <span className="contact-name">{selectedTarget?.name || 'Unknown'}</span>
                                        <span className="contact-number">{selectedTarget?.mobileNumber}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="confirmation-grid">
                                <div className="grid-item"><span className="label">পরিমাণ</span><span className="value">৳{parseFloat(amount)?.toFixed(2)}</span></div>
                                <div className="grid-item"><span className="label">অপারেটর</span><span className="value">{operator || '-'}</span></div>
                                <div className="grid-item"><span className="label">নতুন ব্যালেন্স</span><span className="value">৳{(user.balance - parseFloat(amount))?.toFixed(2)}</span></div>
                                <div className="grid-item"><span className="label">রেফারেন্স</span><span className="value">{reference || '-'}</span></div>
                            </div>
                        </div>
                        <p className="confirm-instruction">মোবাইল রিচার্জ করতে নিচের বাটন ৩ সেকেন্ড ধরে রাখুন</p>
                    </>
                );
            case 5: // Success
                return (
                    <>
                        <h2 className="feature-page-heading centered success-heading">মোবাইল রিচার্জ সফল</h2>
                        <div className="confirmation-details">
                            <div className="confirmation-row">
                                <span className="label">মোবাইল:</span>
                                <div className="contact-item selected small">
                                    <span className="contact-avatar"></span>
                                    <div className="contact-details">
                                        <span className="contact-name">{selectedTarget?.name || 'Unknown'}</span>
                                        <span className="contact-number">{selectedTarget?.mobileNumber}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="confirmation-grid">
                                <div className="grid-item"><span className="label">পরিমাণ</span><span className="value">৳{parseFloat(amount)?.toFixed(2)}</span></div>
                                <div className="grid-item"><span className="label">অপারেটর</span><span className="value">{operator || '-'}</span></div>
                                <div className="grid-item"><span className="label">নতুন ব্যালেন্স</span><span className="value">৳{transactionDetails?.balanceAfterTransaction?.toFixed(2) ?? user?.balance?.toFixed(2)}</span></div>
                                <div className="grid-item"><span className="label">ট্রানজেকশন আইডি</span><span className="value">{transactionDetails?._id?.slice(-10) || 'N/A'}</span></div>
                            </div>
                        </div>
                        <p className="success-message-text">মোবাইল রিচার্জ সফল হয়েছে</p>
                    </>
                );
            default: return null;
        }
    };

    const backString = '←'

    // --- Main Return JSX (adapt from SendMoneyPage) ---
    return (
        <div className="feature-page-layout mobile-recharge-layout">
            <div className="feature-page-top-section">
                {step !== 5 && (
                     <button onClick={handleGoBack} className="back-button">{backString}</button>
                 )}
                {(step !== 4 && step !== 5) && <img src={logoPath} alt="C Pay Logo" className="feature-page-logo" />}
                {(step !== 4 && step !== 5) && <h2 className="feature-page-heading">মোবাইল রিচার্জ</h2>}
            </div>
            <div className="feature-page-content">
                {error && <p className="error-message global-error">{error}</p>}
                {renderStepContent()}
            </div>
            {(step !== 5) && (
                <div className="feature-page-bottom-section">
                    {step === 4 ? (
                        <button className={`feature-page-next-button confirm-hold-button ${confirmHoldTime > 0 ? 'holding' : ''}`}
                            onMouseDown={handleConfirmMouseDown} onMouseUp={handleConfirmMouseUpOrLeave}
                            onMouseLeave={handleConfirmMouseUpOrLeave} onTouchStart={handleConfirmMouseDown}
                            onTouchEnd={handleConfirmMouseUpOrLeave}
                            disabled={loading || confirmHoldTime === CONFIRM_HOLD_DURATION}>
                            {loading ? 'প্রসেসিং...' : `কনফার্ম (${CONFIRM_HOLD_DURATION - confirmHoldTime} সেকেন্ড)`}
                            {(!loading && confirmHoldTime < CONFIRM_HOLD_DURATION) && <span className="button-arrow">{' '}</span>}
                        </button>
                    ) : (
                        <button onClick={handleNextStep} className="feature-page-next-button"
                            disabled={loading || (step === 1 && !selectedTarget && !formatMobileNumber(searchQuery)) || (step === 2 && !amount) }>
                            {loading ? 'প্রসেসিং...' : 'পরবর্তী'}
                            {!loading && <span className="button-arrow">{' '}</span>}
                        </button>
                    )}
                </div>
            )}
            {step === 5 && (
                 <div className="feature-page-bottom-section">
                    <button onClick={() => navigate('/app')} className="feature-page-next-button">
                        হোম এ ফিরে যান
                    </button>
                </div>
            )}
        </div>
    );
}

export default MobileRechargePage;