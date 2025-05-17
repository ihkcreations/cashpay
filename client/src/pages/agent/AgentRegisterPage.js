// client/src/pages/agent/AgentRegisterPage.js
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../api/api'; // Correct path for api
import '../../styles/Agent.css'
import logoPath from '../../assets/CashPayLogo.png';
import { useOtpDisplay } from '../../context/OtpDisplayContext';

function AgentRegisterPage() {
    const { showOtpOnScreen } = useOtpDisplay();
    const [step, setStep] = useState(1);
    // Step 1: Application Details
    const [shopName, setShopName] = useState('');
    const [district, setDistrict] = useState(''); // Could be dropdowns later
    const [area, setArea] = useState('');     // Could be dropdowns later
    const [contactPersonName, setContactPersonName] = useState(''); // This is 'name' in backend
    const [nidNumber, setNidNumber] = useState('');
    const [mobileNumber, setMobileNumber] = useState('');

    // Step 2: OTP
    const [otp, setOtp] = useState('');

    // General
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);

    const navigate = useNavigate();

    const handleNextStep = async (e) => {
        if (e) e.preventDefault(); // Prevent form submission if called from button directly
        setError('');
        setMessage('');
        setLoading(true);

        if (step === 1) {
            // --- Validate Step 1 ---
            if (!shopName || !district || !area || !contactPersonName || !nidNumber || !mobileNumber) {
                setError('সকল তথ্য পূরণ করুন।');
                setLoading(false);
                return;
            }
            if (!/^(?:\+?88)?01[3-9]\d{8}$/.test(mobileNumber)) {
                 setError('সঠিক মোবাইল নাম্বার দিন।');
                 setLoading(false);
                 return;
            }

            try {
                const payload = { shopName, district, area, name: contactPersonName, nidNumber, mobileNumber };
                const { data } = await api.post('/agent/apply', payload);
                setMessage(data.message + " (Check server console for OTP)"); // OTP sent message
                setMobileNumber(data.mobileNumber || mobileNumber); // Use formatted number from backend if available
                if (data.prototypeOtp) { // Check if backend sent it
                    showOtpOnScreen(data.prototypeOtp, `Agent App for ${data.mobileNumber || mobileNumber}`);
                }
                setStep(2); // Move to OTP verification
            } catch (err) {
                setError(err.response?.data?.message || 'আবেদন জমা দিতে সমস্যা হয়েছে।');
            }

        } else if (step === 2) {
            // --- Validate Step 2 (OTP) ---
             if (!otp || otp.length !== 6 || !/^\d{6}$/.test(otp)) { // Assuming 6-digit OTP
                 setError('সঠিক ৬-সংখ্যার OTP দিন।');
                 setLoading(false);
                 return;
             }
            try {
                const { data } = await api.post('/agent/verify-otp', { mobileNumber, otpCode: otp });
                setMessage(data.message);
                setStep(3); // Move to "Pending Approval" screen
            } catch (err) {
                setError(err.response?.data?.message || 'OTP যাচাইকরণ ব্যর্থ হয়েছে।');
                setOtp(''); // Clear OTP on failure
            }
        }
        setLoading(false);
    };

    const handleGoBack = () => {
        setError('');
        setMessage('');
        if (step > 1) {
            setStep(step - 1);
            if (step === 2) setOtp('');
        } else {
            navigate('/agent'); // Back to Agent Welcome
        }
    };

     const handleResendOtp = async () => {
        if (!mobileNumber) {
            setError("মোবাইল নাম্বার পাওয়া যায়নি।");
            return;
        }
        setLoading(true);
        setError('');
        setMessage('');
        try {
            // Re-use the /api/auth/send-otp endpoint, or create a specific agent one if needed
            // Assuming auth/send-otp can handle agent numbers not fully verified
            const { data } = await api.post('/agent/send-otp', { mobileNumber });
            setMessage(data.message);
             if (data.prototypeOtp) { // Check if backend sent it
                showOtpOnScreen(data.prototypeOtp, mobileNumber);
            }
        } catch (err) {
            setError(err.response?.data?.message || 'OTP পুনরায় পাঠাতে সমস্যা হয়েছে।');
        }
        setLoading(false);
    };

    const backString = '←';


    const renderStepContent = () => {
        switch (step) {
            case 1: // Application Details
                return (
                    <form onSubmit={handleNextStep}>
                        <h3 className="agent-step-heading">নিচের তথ্যগুলো দিয়ে এজেন্ট একাউন্টের জন্য আবেদন করুন</h3>
                        <div className="input-group">
                            <label htmlFor="shopName">দোকানের নাম</label>
                            <input type="text" id="shopName" className="standard-input" value={shopName} onChange={(e) => setShopName(e.target.value)} required />
                        </div>
                        <div style={{ display: 'flex', gap: '10px' }}> {/* For District and Area side-by-side */}
                            <div className="input-group" style={{flex: 1}}>
                                <label htmlFor="district">জেলা</label>
                                <input type="text" id="district" className="standard-input" placeholder="ঢাকা" value={district} onChange={(e) => setDistrict(e.target.value)} required />
                                {/* TODO: Replace with dropdown */}
                            </div>
                            <div className="input-group" style={{flex: 1}}>
                                <label htmlFor="area">এলাকা</label>
                                <input type="text" id="area" className="standard-input" placeholder="গুলশান" value={area} onChange={(e) => setArea(e.target.value)} required />
                                {/* TODO: Replace with dropdown */}
                            </div>
                        </div>
                        <div className="input-group">
                            <label htmlFor="contactPersonName">যোগাযোগ করবেন যার সাথে (নাম লিখুন)</label>
                            <input type="text" id="contactPersonName" className="standard-input" value={contactPersonName} onChange={(e) => setContactPersonName(e.target.value)} required />
                        </div>
                        <div className="input-group">
                            <label htmlFor="nidNumber">NID নাম্বার</label>
                            <input type="text" id="nidNumber" className="standard-input" value={nidNumber} onChange={(e) => setNidNumber(e.target.value)} required />
                        </div>
                        <div className="input-group mobile-input-group agent-mobile-input"> {/* Specific style if needed */}
                             <span className="country-code">+88</span>
                             <input type="text" className="mobile-field" placeholder="01XXXXXXXXX" value={mobileNumber} onChange={(e) => setMobileNumber(e.target.value)} required pattern="01[3-9]\d{8}" />
                        </div>
                        {/* Button is in bottom section */}
                    </form>
                );
            case 2: // OTP Verification
                return (
                    <form onSubmit={handleNextStep}>
                        <h3 className="agent-step-heading centered">আপনার মোবাইল নাম্বার<br/>যাচাই করুন</h3>
                        <div className="otp-input-group agent-otp-input"> {/* Specific style if needed */}
                          <label htmlFor="otp" className="visually-hidden">Enter OTP</label>
                          <input type="text" id="otp" className="otp-input" value={otp} onChange={(e) => setOtp(e.target.value)} placeholder=" _ _ _ _ _ _" maxLength="6" required />
                          <button type="button" onClick={handleResendOtp} className="resend-otp-button" disabled={loading}>↻</button>
                        </div>
                        <p className="otp-instruction centered-text">আপনার বিকাশ পিন ও ভেরিফিকেশন কোড<br/>কাউকে দেবেন না</p>
                         {/* Button is in bottom section */}
                    </form>
                );
            case 3: // Application Submitted, Pending Approval
                return (
                    <div className="pending-approval-screen">
                        <h3 className="agent-step-heading centered">আপনার আবেদনটি সফল হয়েছে</h3>
                        <p className="pending-approval-message">
                            ২-৩ কার্যদিবসের মধ্যে আপনার আবেদনটি যাচাই করে সম্পন্ন করা হবে।
                        </p>
                        {/* Button to go to login is in bottom section */}
                    </div>
                );
            default: return null;
        }
    };

    return (
        <div className="agent-page-layout">
            <div className="agent-page-top-section">
                <button onClick={handleGoBack} className="agent-back-button">
                      <span className="agent-back-button">{backString}</span> 
                 </button>
                <img src={logoPath} alt="C Pay Logo" className="feature-page-logo" />
                {/* Heading could be dynamic based on step, or general */}
            </div>
            <div className="agent-page-content">
                {error && <p className="error-message global-error">{error}</p>}
                {message && !error && <p className="success-message global-success">{message}</p>}
                {renderStepContent()}
            </div>
            <div className="agent-page-bottom-section">
                {step === 3 ? (
                     <button onClick={() => navigate('/agent/login')} className="agent-page-next-button">
                        লগইন এ ফিরে যান <span className="button-arrow">{' '}</span>
                    </button>
                ) : (
                    <button onClick={handleNextStep} className="agent-page-next-button" disabled={loading}>
                        {loading ? 'প্রসেসিং...' : 'পরবর্তী'}
                        {!loading && <span className="button-arrow">{' '}</span>}
                    </button>
                )}
            </div>
        </div>
    );
}

export default AgentRegisterPage;