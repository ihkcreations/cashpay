// client/src/pages/SendMoneyPage.js
import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/api';
import { useAuth } from '../context/AuthContext';
import logoPath from '../assets/CashPayLogo.png';

function SendMoneyPage() {
    const [step, setStep] = useState(1); // Current step in the send money flow
    const [searchQuery, setSearchQuery] = useState(''); // For searching users
    const [allUsers, setAllUsers] = useState([]); // List of all users (for contact list)
    const [filteredUsers, setFilteredUsers] = useState([]);
    const [selectedRecipient, setSelectedRecipient] = useState(null); // { name, mobileNumber, _id }
    const [amount, setAmount] = useState('');
    const [pin, setPin] = useState('');
    const [reference, setReference] = useState(''); // Optional reference
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [transactionDetails, setTransactionDetails] = useState(null); // For success screen
    const [isSubmitting, setIsSubmitting] = useState(false); 

    const { user, updateUser } = useAuth();
    const navigate = useNavigate();

    // State and ref for the 5-second confirm button
    const [confirmHoldTime, setConfirmHoldTime] = useState(0);
    const confirmIntervalRef = useRef(null);
    const CONFIRM_HOLD_DURATION = 3; // 5 seconds

    const backString = '←'


    // Fetch all users for contact list (Step 1)
    useEffect(() => {
        if (step === 1 && allUsers.length === 0) { // Fetch only if on step 1 and list is empty
            const fetchUsers = async () => {
                setLoading(true);
                try {
                    // Placeholder: In a real app, you'd have an endpoint for "contacts"
                    // For now, we fetch all users - this is NOT scalable for production.
                    // You'll need a proper admin endpoint to fetch users later or a dedicated contact API.
                    // Assuming an admin endpoint '/api/admin/users' exists and is accessible for this prototype
                    // or you create a specific '/api/user/contacts' endpoint.
                    // For now, let's assume we need to create a simple endpoint to list users.
                    // We will add a simple GET /api/user/all to userController.js
                    const { data } = await api.get('/user/all'); // Needs backend endpoint
                    setAllUsers(data.filter(u => u._id !== user._id)); // Exclude self
                    setFilteredUsers(data.filter(u => u._id !== user._id));
                } catch (err) {
                    setError('Failed to load contacts. Please try again.');
                    console.error("Error fetching users:", err);
                }
                setLoading(false);
            };
            fetchUsers();
        }
    }, [step, user, allUsers.length]); // Rerun if step changes or user context changes

    // Filter users based on search query
    useEffect(() => {
        if (searchQuery === '') {
            setFilteredUsers(allUsers);
        } else {
            const lowerQuery = searchQuery.toLowerCase();
            setFilteredUsers(
                allUsers.filter(
                    u =>
                        (u.name && u.name.toLowerCase().includes(lowerQuery)) ||
                        u.mobileNumber.includes(lowerQuery)
                )
            );
        }
    }, [searchQuery, allUsers]);


    // --- Step Navigation ---
    const handleNextStep = () => {
        setError(''); // Clear errors on step change
        if (step === 1) { // From recipient selection to amount input
            if (!selectedRecipient) {
                setError('Please select a recipient or enter a valid number.');
                return;
            }
            setStep(2);
        } else if (step === 2) { // From amount input to PIN input
            const numAmount = parseFloat(amount);
            if (isNaN(numAmount) || numAmount <= 0) {
                setError('Please enter a valid amount.');
                return;
            }
            if (user && user.balance < numAmount) {
                setError('Insufficient balance.');
                return;
            }
            setStep(3);
        } else if (step === 3) { // From PIN input to confirmation screen
            if (pin.length !== 5 || !/^\d{5}$/.test(pin)) {
                setError('Please enter a valid 5-digit PIN.');
                return;
            }
            setStep(4); // Go to confirmation screen
        }
        // Step 4 (Confirmation) has its own button logic
        // Step 5 (Success) has its own navigation
    };

    const handleGoBack = () => {
        setError('');
        if (step > 1) {
            setStep(step - 1);
            // Clear state for the step we are leaving
            if (step === 2) setAmount('');
            if (step === 3) setPin('');
            if (step === 4) { /* No specific state to clear here unless confirm button state */ }
        } else if (step === 1) {
            navigate('/app'); // Back to dashboard from step 1
        }
    };

    // --- Contact Selection ---
    const handleSelectRecipient = (recipient) => {
        setSelectedRecipient(recipient);
        setSearchQuery(''); // Clear search query
        // Optionally, auto-advance to next step
        // setStep(2);
    };

    const handleManualRecipientInput = () => {
        // Logic if user types a number not in the list and hits next
        // For now, we assume they select or search then select.
        // If you want to allow direct number input and validation:
        const foundUser = allUsers.find(u => u.mobileNumber === searchQuery);
        if (foundUser) {
            setSelectedRecipient(foundUser);
            setStep(2);
        } else if (/^(?:\+?88)?01[3-9]\d{8}$/.test(searchQuery)) {
            // A valid number format, but not in known users.
            // For this prototype, let's assume we only send to known users.
            // In a real app, you might allow sending to non-registered numbers with limitations.
            setSelectedRecipient({ name: 'Unknown User', mobileNumber: searchQuery, _id: null }); // Treat as external if backend supports
            // setError('Recipient not registered. For prototype, select from list.');
            setStep(2); // Let backend handle if number exists or not
        } else {
            setError('Please enter a valid mobile number or select from contacts.');
        }
    };


    // --- Confirmation Button Hold Logic (Step 4) ---
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
                handleSendMoney();
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

    // --- Send Money API Call (triggered from Step 4 confirm) ---
    const handleSendMoney = async () => {
      if (isSubmitting) { // If already submitting, do nothing
        
        return;
      }
        
        setIsSubmitting(true); // Set submitting flag
        setLoading(true); // Keep for UI loading state
        setError('');     // Clear previous error before new attempt
        setMessage('');   // Clear previous message

        try {
            const payload = {
                receiverMobile: selectedRecipient.mobileNumber,
                amount: parseFloat(amount),
                pin: pin,
                reference: reference || undefined
            };
            const { data } = await api.post('/transactions/send-money', payload);

            // --- Success Path ---
            setMessage(data.message || 'Send Money successful!');
            if (data.newBalance !== undefined) {
                updateUser(prevUser => ({ ...prevUser, balance: data.newBalance }));
            }
            setTransactionDetails(data.transaction);
            setStep(5); // Move to success screen
            setConfirmHoldTime(0)

        } catch (err) {
            const errorMessage = err.response?.data?.message || 'Send Money failed. Please try again.';
            setError(errorMessage);
            setStep(3); // Go back to PIN entry on failure
            setPin(''); // Clear PIN
            setConfirmHoldTime(0);
        } finally {
            setLoading(false);
            setIsSubmitting(false); // Reset submitting flag
        }
    };

    // --- JSX for each step ---
    const renderStepContent = () => {
        switch (step) {
            case 1: // Select Recipient
                return (
                  <>
                    <div className="input-group">
                        <label htmlFor="searchQuery">নাম বা নাম্বার দিন</label>
                        <input
                            type="text"
                            id="searchQuery"
                            className="standard-input"
                            placeholder="নাম বা মোবাইল নাম্বার"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <h3 className="contact-list-header">কন্টাক্ট লিস্ট</h3>
                    <div className="contact-list">
                        {loading && <p style={{textAlign: 'center', padding: '10px'}}>Loading contacts...</p>}
                        {!loading && filteredUsers.length === 0 && !searchQuery && <p style={{textAlign: 'center', padding: '10px'}}>No contacts available.</p>}
                        {!loading && filteredUsers.length === 0 && searchQuery && <p style={{textAlign: 'center', padding: '10px'}}>No contacts match your search.</p>}

                        {filteredUsers.map(contact => (
                            <div
                                key={contact._id || contact.mobileNumber}
                                // Conditionally add 'selected' class if this contact is the selectedRecipient
                                className={`contact-item ${selectedRecipient?._id === contact._id || selectedRecipient?.mobileNumber === contact.mobileNumber ? 'selected-in-list' : ''}`}
                                onClick={() => handleSelectRecipient(contact)}
                            >
                                <span className="contact-avatar">{/* Avatar */}</span>
                                <div className="contact-details">
                                    <span className="contact-name">{contact.name || 'Unknown'}</span>
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
                        <div className="recipient-display">
                            <span className="label">প্রাপক</span>
                            <div className="contact-item selected">
                                <span className="contact-avatar"></span>
                                <div className="contact-details">
                                    <span className="contact-name">{selectedRecipient?.name || 'Unknown'}</span>
                                    <span className="contact-number">{selectedRecipient?.mobileNumber}</span>
                                </div>
                            </div>
                        </div>
                        <div className="input-group amount-input-group">
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
                                min="1"
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
                            <span className="label">প্রাপক</span>
                            <div className="contact-item selected">
                                <span className="contact-avatar"></span>
                                <div className="contact-details">
                                    <span className="contact-name">{selectedRecipient?.name || 'Unknown'}</span>
                                    <span className="contact-number">{selectedRecipient?.mobileNumber}</span>
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
                                type="password"
                                id="pin"
                                className="pin-input large-dots" // Style for larger dots
                                value={pin}
                                onChange={(e) => setPin(e.target.value)}
                                placeholder="● ● ● ● ●"
                                maxLength="5"
                                required
                            />
                        </div>
                        <div className="input-group">
                            <label htmlFor="reference" className="input-label">রেফারেন্স (Optional)</label>
                            <input
                                type="text"
                                id="reference"
                                className="standard-input"
                                value={reference}
                                onChange={(e) => setReference(e.target.value)}
                                placeholder="e.g., Tuition fee"
                            />
                        </div>
                    </>
                );
            case 4: // Confirmation
                return (
                    <>
                        <h2 className="feature-page-heading centered">সেন্ড মানি নিশ্চিত করুন</h2>
                        <div className="confirmation-details">
                            <div className="confirmation-row">
                                <span className="label">প্রাপক:</span>
                                <div className="contact-item selected small">
                                    <span className="contact-avatar"></span>
                                    <div className="contact-details">
                                        <span className="contact-name">{selectedRecipient?.name || 'Unknown'}</span>
                                        <span className="contact-number">{selectedRecipient?.mobileNumber}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="confirmation-grid">
                                <div className="grid-item">
                                    <span className="label">পরিমাণ</span>
                                    <span className="value">৳{parseFloat(amount)?.toFixed(2)}</span>
                                </div>
                                <div className="grid-item">
                                    <span className="label">রেফারেন্স</span>
                                    <span className="value">{reference || '-'}</span>
                                </div>
                                <div className="grid-item">
                                    <span className="label">নতুন ব্যালেন্স</span>
                                    <span className="value">৳{(user.balance - parseFloat(amount))?.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>
                        <p className="confirm-instruction">
                            সেন্ড মানি করতে নিচের বাটন ৩ সেকেন্ড ধরে রাখুন
                        </p>
                    </>
                );
            case 5: // Success
                return (
                    <>
                        <h2 className="feature-page-heading centered success-heading">সেন্ড মানি সফল</h2>
                        <div className="confirmation-details">
                            <div className="confirmation-row">
                                <span className="label">প্রাপক:</span>
                                <div className="contact-item selected small">
                                    <span className="contact-avatar"></span>
                                    <div className="contact-details">
                                        <span className="contact-name">{selectedRecipient?.name || 'Unknown'}</span>
                                        <span className="contact-number">{selectedRecipient?.mobileNumber}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="confirmation-grid">
                                <div className="grid-item">
                                    <span className="label">পরিমাণ</span>
                                    <span className="value">৳{parseFloat(amount)?.toFixed(2)}</span>
                                </div>
                                <div className="grid-item">
                                    <span className="label">রেফারেন্স</span>
                                    <span className="value">{reference || '-'}</span>
                                </div>
                                <div className="grid-item">
                                    <span className="label">নতুন ব্যালেন্স</span>
                                    <span className="value">৳{transactionDetails?.balanceAfterTransaction?.toFixed(2) ?? user?.balance?.toFixed(2)}</span>
                                </div>
                                <div className="grid-item">
                                    <span className="label">ট্রানজেকশন আইডি</span>
                                    <span className="value">{transactionDetails?._id?.slice(-10) || 'N/A'}</span> {/* Show part of ID */}
                                </div>
                            </div>
                        </div>
                        <p className="success-message-text">
                            সেন্ড মানি সফল হয়েছে
                        </p>
                    </>
                );
            default: return null;
        }
    };

    return (
        <div className="feature-page-layout send-money-layout"> {/* Add specific class */}
            <div className="feature-page-top-section">
                 {step !== 5 && (
                     <button onClick={handleGoBack} className="back-button">{backString}</button>
                 )}
                {step !== 4 && step !== 5 && <img src={logoPath} alt="C Pay Logo" className="feature-page-logo" />}
                {step !== 4 && step !== 5 && <h2 className="feature-page-heading">সেন্ড মানি</h2>}
                {/* Headings for step 4 & 5 are within renderStepContent */}
            </div>

            <div className="feature-page-content">
                {error && <p className="error-message global-error">{error}</p>}
                {renderStepContent()}
            </div>

            {/* Conditionally render bottom button section */}
            {step !== 5 && ( // Don't show "Next" button on success screen
                <div className="feature-page-bottom-section">
                    {step === 4 ? (
                        <button
                            className={`feature-page-next-button confirm-hold-button ${confirmHoldTime > 0 ? 'holding' : ''}`}
                            onMouseDown={handleConfirmMouseDown}
                            onMouseUp={handleConfirmMouseUpOrLeave}
                            onMouseLeave={handleConfirmMouseUpOrLeave} // Also stop if mouse leaves
                            onTouchStart={handleConfirmMouseDown} // For touch devices
                            onTouchEnd={handleConfirmMouseUpOrLeave}
                            disabled={loading || confirmHoldTime === CONFIRM_HOLD_DURATION}
                        >
                            {loading ? 'প্রসেসিং...' : `কনফার্ম (${CONFIRM_HOLD_DURATION - confirmHoldTime} সেকেন্ড)`}
                            {(!loading && confirmHoldTime < CONFIRM_HOLD_DURATION) && <span className="button-arrow">{' '}</span>}
                        </button>
                    ) : (
                        <button
                            onClick={handleNextStep}
                            className="feature-page-next-button"
                            disabled={loading || (step === 1 && !selectedRecipient && !searchQuery) || (step === 2 && !amount)}
                        >
                            {loading ? 'প্রসেসিং...' : 'পরবর্তী'}
                            {!loading && <span className="button-arrow">{' '}</span>}
                        </button>
                    )}
                </div>
            )}

            {step === 5 && ( // "Back to Home" button on success screen
                 <div className="feature-page-bottom-section">
                    <button onClick={() => navigate('/app')} className="feature-page-next-button">
                        হোম এ ফিরে যান
                    </button>
                </div>
            )}
        </div>
    );
}

export default SendMoneyPage;