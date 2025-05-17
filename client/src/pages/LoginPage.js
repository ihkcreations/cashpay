// client/src/pages/LoginPage.js
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext'; // Use the auth hook
// Assuming your logo is in the public directory, e.g., public/logo.png
import logoPath from '../assets/CashPayLogo.png';
import api from '../api/api';


function LoginPage() {
  // State to manage the login step (1 or 2)
  const [step, setStep] = useState(1);
  const [mobileNumber, setMobileNumber] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false); // Loading state for API call

  // Get login function and overall auth loading state from context
  const { generalLogin, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  // Handle submission for Step 1 (Mobile Number)
  const handleStep1Submit = (e) => {
    e.preventDefault();
    setError('');

    // Basic mobile number validation (can be more robust)
    if (!mobileNumber || !/^(?:\+?88)?01[3-9]\d{8}$/.test(mobileNumber)) {
         setError('Please enter a valid Bangladeshi mobile number.');
         return;
     }

    // If validation passes, move to step 2
    setStep(2);
  };

  // Handle submission for Step 2 (PIN)
  const handleStep2Submit = async (e) => {
    e.preventDefault();
    setError('');

    // Basic PIN validation (assuming 5 digits)
     if (!pin || pin.length !== 5 || !/^\d{5}$/.test(pin)) {
        setError('Please enter a valid 5-digit PIN.');
        return;
     }

    setLoading(true); // Start loading for the API call

    try {
      /// Define a function that makes the specific API call for user login
        const callUserLoginApi = (credentials) => api.post('/auth/login', credentials);
        await generalLogin(callUserLoginApi, 'token', { mobileNumber, pin });
        navigate('/app');

    } catch (err) {
        // Handle errors (e.g., invalid mobile/PIN, account not verified)
        const errorMessage = err.response && err.response.data && err.response.data.message
                           ? err.response.data.message
                           : 'Login failed. Please try again.';
        setError(errorMessage);
         setPin(''); // Clear PIN on failure
    } finally {
        setLoading(false); // End loading
    }
  };

  // Handle going back from Step 2 to Step 1
  const handleGoBack = () => {
    setStep(1);
    setError(''); // Clear errors when going back
    setPin(''); // Clear PIN when going back
  };


   // While AuthContext is checking initial auth status
  if (authLoading) {
       // Use the loader from AuthContext provider wrapping the App
       return null; // Don't render anything here, provider handles it
  }

  const backString = '←'; // Back arrow string (or use an icon)


  return (
    // The main-app-frame is handled in index.js
    // This component will render directly inside it.
    // We'll add specific classes for the login page layout.
    <div className="login-page-layout"> {/* Use a specific class for this layout */}
        {/* Top section with logo, heading, input */}
        <div className="login-top-section">
            {/* Back button (only visible in step 2) */}
             {step === 2 && (
                 <button onClick={handleGoBack} className="back-button">
                      <span className="back-button">{backString}</span> 
                 </button>
             )}


             <img src={logoPath} alt="C Pay Logo" className="login-logo" /> {/* Logo */}

             {/* Conditional Heading */}
            {step === 1 ? (
                <h2 className="login-heading">মোবাইল নাম্বার দিয়ে<br/>লগইন করুন</h2>
            ) : (
                 <>
                    <h2 className="login-heading">বিকাশ পিন</h2> {/* PIN heading for step 2 */}
                    <p className="logged-in-number">{mobileNumber}</p> {/* Display entered number */}
                 </>
             )}


            {/* Conditional Form/Input */}
            {step === 1 ? (
                // Step 1 Form: Mobile Number
                 <form onSubmit={handleStep1Submit}>
                    <div className="mobile-input-group">
                         <span className="country-code">+88</span>
                         <input
                            type="text"
                            className="mobile-field"
                            value={mobileNumber}
                            onChange={(e) => setMobileNumber(e.target.value)}
                            placeholder="01XXXXXXXXX"
                            required
                            // Basic pattern for 01x 8 digits
                            pattern="01[3-9]\d{8}"
                            title="Enter a valid Bangladeshi mobile number (e.g., 01XXXXXXXXX)"
                            maxLength="11"
                         />
                     </div>
                     {error && <p className="error-message">{error}</p>}
                     {/* Button is in the bottom section */}
                 </form>
            ) : (
                // Step 2 Form: PIN
                <form onSubmit={handleStep2Submit}>
                    <div>
                        <label htmlFor="pin" className="visually-hidden">PIN</label> 
                         <input
                            type="password"
                            id="pin"
                            className="pin-input" 
                            value={pin}
                            onChange={(e) => setPin(e.target.value)}
                            placeholder="Enter PIN"
                            maxLength="5" // Assuming 5-digit PIN
                            required
                         />
                     </div>
                     {error && <p className="error-message">{error}</p>}
                     {/* Button is in the bottom section */}
                </form>
            )}
        </div> {/* End login-top-section */}


        {/* Bottom section with navigation button */}
        <div className="login-bottom-section">
             {/* The button handles submission for the current step's form */}
             {/* Link/button structure from WelcomePage */}
             <button
                 onClick={step === 1 ? handleStep1Submit : handleStep2Submit}
                 className="login-next-button" // Use a specific class for this button style
                 disabled={loading} // Disable while API call is loading
             >
                {loading ? 'Processing...' : 'পরবর্তী'} {/* Next / Processing */}
                {/* Right arrow icon */}
                <span className="button-arrow"></span> {/* Simple right arrow character */}
             </button>

            {/* Link to registration below the button (adjust styling) */}
             {step === 1 && ( // Show link to register only on step 1
                <p style={{textAlign: 'center', marginTop: '20px'}}>
                   Don't have an account? <Link to="/register">Register</Link>
                </p>
             )}
        </div> {/* End login-bottom-section */}


        {/* No admin link needed here based on image */}
        {/* <p><Link to="/admin/login">Admin Login</Link></p> */}

    </div> // End login-page-layout
  );
}

// Helper for visually hidden elements (optional utility class)
// function VisuallyHidden({ children }) { return <span style={{ position: 'absolute', width: '1px', height: '1px', margin: '-1px', padding: '0', overflow: 'hidden', clip: 'rect(0, 0, 0, 0)', border: '0' }}>{children}</span>; }


export default LoginPage;