// client/src/pages/agent/AgentSetPinPage.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext'; // Correct path
import api from '../../api/api'; // Correct path
import '../../styles/Agent.css'
import logoPath from '../../assets/CashPayLogo.png';

function AgentSetPinPage() {
    const [mobileNumber, setMobileNumber] = useState('');
    const [pin, setPin] = useState('');
    const [confirmPin, setConfirmPin] = useState('');
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const { updateUser } = useAuth(); // To log in user after PIN set
    const navigate = useNavigate();

    useEffect(() => {
        const agentMobile = localStorage.getItem('agentMobileForPinSetup');
        if (agentMobile) {
            setMobileNumber(agentMobile);
        } else {
            // If no mobile number, redirect to agent login (shouldn't happen in normal flow)
            navigate('/agent/login');
        }
        // Optional: Clear the item after retrieving
        // localStorage.removeItem('agentMobileForPinSetup');
    }, [navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');

        if (pin !== confirmPin) {
            setError('PINs do not match.');
            return;
        }
        if (pin.length !== 5 || !/^\d{5}$/.test(pin)) {
            setError('PIN must be exactly 5 digits.');
            return;
        }
        setLoading(true);
        try {
            const { data } = await api.post('/agent/set-pin', { mobileNumber, pin });
            setMessage(data.message);

            // Login the agent
            localStorage.setItem('token', data.token);
            updateUser(data); // data should be the full agent user object from backend

            localStorage.removeItem('agentMobileForPinSetup'); // Clean up
            navigate('/agent/dashboard'); // Redirect to agent dashboard

        } catch (err) {
            setError(err.response?.data?.message || 'Failed to set PIN. Please try again.');
        }
        setLoading(false);
    };

    if (!mobileNumber) return <p>Loading...</p>; // Or redirect

    return (
        <div className="agent-page-layout">
            <div className="agent-page-top-section">
                {/* No back button needed here as it's a specific step */}
                <img src={logoPath} alt="C Pay Logo" className="feature-page-logo" />
            </div>
            <div className="agent-page-content">
                {error && <p className="error-message global-error">{error}</p>}
                {message && !error && <p className="success-message global-success">{message}</p>}
                <form onSubmit={handleSubmit}>
                    <h3 className="agent-step-heading centered">মোবাইল নাম্বার<br/>{mobileNumber}</h3>
                    <p className="step-instruction centered-text">৫ সংখ্যার নতুন পিন সেট করুন</p>
                    <div className="input-group">
                        <label htmlFor="pin" className="visually-hidden">নতুন পিন</label>
                        <input type="password" id="pin" className="agent-pin-input large-dots" value={pin} onChange={(e) => setPin(e.target.value)} placeholder="নতুন পিন" maxLength="5" required />
                    </div>
                    <div className="input-group">
                        <label htmlFor="confirmPin" className="visually-hidden">পিন নিশ্চিত করুন</label>
                        <input type="password" id="confirmPin" className="agent-pin-input large-dots" value={confirmPin} onChange={(e) => setConfirmPin(e.target.value)} placeholder="পিন নিশ্চিত করুন" maxLength="5" required />
                    </div>
                     {/* Button is in bottom section */}
                </form>
            </div>
            <div className="agent-page-bottom-section">
                <button type="submit" form="" onClick={(e) => { // Manual click trigger if button outside form
                        const form = document.querySelector('.agent-page-content form');
                        if (form) form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
                    }}
                    className="agent-page-next-button" disabled={loading}>
                    {loading ? 'প্রসেসিং...' : 'পরবর্তী'}
                    {!loading && <span className="button-arrow">{' '}</span>}
                </button>
            </div>
        </div>
    );
}

export default AgentSetPinPage;