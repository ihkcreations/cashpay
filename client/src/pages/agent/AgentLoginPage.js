// client/src/pages/agent/AgentLoginPage.js
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext'; // Correct path
import api from '../../api/api'; // Correct path
import '../../styles/Agent.css'
import logoPath from '../../assets/CashPayLogo.png';

function AgentLoginPage() {
    const [step, setStep] = useState(1); // 1 for mobile, 2 for PIN
    const [mobileNumber, setMobileNumber] = useState('');
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { generalLogin, loading: authLoading } = useAuth();
    const navigate = useNavigate();

    const handleNextOrLogin = async (e) => {
        if (e) e.preventDefault();
        setError('');
        setLoading(true);

        if (step === 1) { // Mobile number submitted
            if (!mobileNumber || !/^(?:\+?88)?01[3-9]\d{8}$/.test(mobileNumber)) {
                 setError('সঠিক মোবাইল নাম্বার দিন।');
                 setLoading(false);
                 return;
            }
            // Here, we don't call an API yet. We just move to PIN step on frontend.
            // The actual check for agent status happens when both mobile & PIN are submitted.
            setStep(2);
            setLoading(false);
        } else if (step === 2) { // PIN submitted, attempt login
            if (!pin || pin.length !== 5 || !/^\d{5}$/.test(pin)) {
                setError('সঠিক ৫-সংখ্যার পিন দিন।');
                setLoading(false);
                return;
            }
            try {
                const callAgentLoginApi = (credentials) => api.post('/auth/agent/login', credentials);
                const data = await generalLogin(callAgentLoginApi, 'token', { mobileNumber, pin });

                if (data.role === 'agent' && data.applicationStatus === 'approved' && data.isActive) {
                     // If login successful AND it's an agent, update context and navigate
                     navigate('/agent/dashboard');
                } else if (data.actionRequired === 'SET_PIN') {
                    // Backend indicates agent is approved but needs to set PIN
                    localStorage.setItem('agentMobileForPinSetup', mobileNumber); // Store for PIN setup page
                    navigate('/agent/set-pin');
                } else if (data.role === 'agent' && data.applicationStatus !== 'approved') {
                    // This case might be caught by the catch block if backend returns error status
                    setError(data.message || 'Agent account not fully active or approved.');
                } else {
                    // Logged in but not an agent, or some other user state
                    setError('এটি একটি এজেন্ট একাউন্ট নয়।');
                    // Optionally, navigate them to user login or show error
                }
            } catch (err) {
                // This catch block will receive errors thrown by generalLogin or the API call
                const errorMessage = err.response?.data?.message || err.message || 'লগইন ব্যর্থ হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।';
                setError(errorMessage); // <<<< THIS SETS THE ERROR MESSAGE TO BE DISPLAYED

                // If backend specifically signals AGENT_SET_PIN in an error response
                if (err.response?.data?.actionRequired === 'AGENT_SET_PIN') {
                    localStorage.setItem('agentMobileForPinSetup', mobileNumber);
                    navigate('/agent/set-pin');
                }
                setPin(''); // Clear PIN on any error
            }
            setLoading(false);
        }
    };

    const handleGoBack = () => {
        setError('');
        if (step === 2) {
            setStep(1);
            setPin('');
        } else {
            navigate('/agent'); // Back to Agent Welcome
        }
    };

    const backString = '←';

    if (authLoading) return null; // AuthProvider handles global loading

    return (
        <div className="agent-page-layout">
            <div className="agent-page-top-section">
                <button onClick={handleGoBack} className="agent-back-button">
                      <span className="agent-back-button">{backString}</span> 
                 </button>
                <img src={logoPath} alt="C Pay Logo" className="feature-page-logo" />
                {/* Heading changes based on step */}
            </div>
            <div className="agent-page-content">
                {error && <p className="error-message global-error">{error}</p>}
                {step === 1 && (
                    <form onSubmit={handleNextOrLogin}>
                        <h3 className="agent-step-heading centered">মোবাইল নাম্বার দিয়ে<br/>লগইন করুন</h3>
                        <div className="input-group mobile-input-group agent-mobile-input">
                             <span className="country-code">+88</span>
                             <input type="text" className="mobile-field" placeholder="01XXXXXXXXX" value={mobileNumber} onChange={(e) => setMobileNumber(e.target.value)} required pattern="01[3-9]\d{8}" />
                        </div>
                    </form>
                )}
                {step === 2 && (
                    <form onSubmit={handleNextOrLogin}>
                        <h3 className="agent-step-heading centered">এজেন্ট পিন</h3>
                        <p className="logged-in-number centered-text">{mobileNumber}</p>
                        <div className="input-group">
                            <label htmlFor="pin" className="visually-hidden">এজেন্ট পিন</label>
                            <input type="password" id="pin" className="agent-pin-input large-dots" value={pin} onChange={(e) => setPin(e.target.value)} placeholder="● ● ● ● ●" maxLength="5" required />
                        </div>
                    </form>
                )}
            </div>
            <div className="agent-page-bottom-section">
                <button onClick={handleNextOrLogin} className="agent-page-next-button" disabled={loading}>
                    {loading ? 'প্রসেসিং...' : 'পরবর্তী'}
                    {!loading && <span className="button-arrow"></span>}
                </button>
            </div>
        </div>
    );
}

export default AgentLoginPage;