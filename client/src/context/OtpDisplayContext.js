// client/src/context/OtpDisplayContext.js
import React, { createContext, useState, useContext, useCallback } from 'react';

const OtpDisplayContext = createContext();

export const OtpDisplayProvider = ({ children }) => {
    const [otpMessage, setOtpMessage] = useState(null); // Will store { text: 'Your OTP: 1234', type: 'success'/'info' }

    const showOtpOnScreen = useCallback((otp, forWhom = '') => {
        const message = `OTP ${forWhom ? `for ${forWhom}` : ''}: ${otp}`;
        console.log(`[OTP Display] Showing: ${message}`); // Keep console log for dev sanity check
        setOtpMessage({ text: message, id: Date.now() }); // Use Date.now() for unique key if auto-dismissing

        // Auto-dismiss after some time (e.g., 10-15 seconds)
        setTimeout(() => {
            setOtpMessage(current => (current?.id === Date.now() ? null : current));
        }, 15000); // 15 seconds
    }, []);

    const clearOtpMessage = useCallback(() => {
        setOtpMessage(null);
    }, []);

    return (
        <OtpDisplayContext.Provider value={{ showOtpOnScreen, clearOtpMessage }}>
            {children}
            {otpMessage && (
                <div className="otp-toast-notification slide-in-right">
                    <p>{otpMessage.text}</p>
                    <button onClick={clearOtpMessage} className="otp-toast-close">×</button>
                </div>
            )}
        </OtpDisplayContext.Provider>
    );
};

export const useOtpDisplay = () => {
    const context = useContext(OtpDisplayContext);
    if (!context) {
        throw new Error('useOtpDisplay must be used within an OtpDisplayProvider');
    }
    return context;
};