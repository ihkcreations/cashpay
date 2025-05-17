// client/src/pages/RegisterPage.js
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/api'; // Use our configured axios instance
import { useAuth } from '../context/AuthContext'; // Use auth hook to update state after login
// Assuming your logo is in the public directory
import logoPath from '../assets/CashPayLogo.png';



function RegisterPage() {
  // State to manage the registration step (1, 2, 3, 4)
  const [step, setStep] = useState(1);
  // State for form inputs across steps
  const [mobileNumber, setMobileNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [name, setName] = useState(''); // For step 4
  const [dateOfBirth, setDateOfBirth] = useState(''); // For step 4

  // State for UI feedback
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false); // Loading state for API calls

  // Get login function and overall auth loading state from context
  const { updateUser } = useAuth(); // Need updateUser after final step logs in

  const navigate = useNavigate();

  // Optional: Load mobile number if user was sent here from an unverified login attempt
  useEffect(() => {
      const storedMobile = localStorage.getItem('registeringMobile');
      if (storedMobile) {
          setMobileNumber(storedMobile);
          // Maybe auto-advance if mobile is stored? Or leave them at step 1?
          // Let's leave at step 1, user clicks next.
      }
       // Clean up registration mobile storage later (e.g., after step 3 success)
      return () => {
          // localStorage.removeItem('registeringMobile'); // Decide when to remove
      };
  }, []);


   // --- Handlers for each step's progression ---

  // Handle submission for Step 1 (Mobile Number Input)
  const handleStep1Submit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    // Basic mobile number validation (client-side)
    if (!mobileNumber || !/^(?:\+?88)?01[3-9]\d{8}$/.test(mobileNumber)) {
         setError('Please enter a valid Bangladeshi mobile number.');
         return;
     }

    setLoading(true); // Start loading for backend call

    try {
       // Call backend to initiate registration (creates unverified user if new)
      const { data } = await api.post('/auth/register', { mobileNumber });
      setMessage(data.message);

      // Store mobile number (formatted by backend or client) for subsequent steps
       // Assuming backend returns the formatted number, use that. Otherwise, use client formatted.
       const formattedMobile = data.mobileNumber || mobileNumber; // Get formatted number from response if available
      localStorage.setItem('registeringMobile', formattedMobile); // Store temporarily for next steps
       setMobileNumber(formattedMobile); // Update state with formatted number

      // After successful initiation, automatically request OTP (Step 2 part 1 backend)
      await handleSendOtp(formattedMobile); // Call the send OTP function directly

      setStep(2); // Move to Step 2 (OTP verification)

    } catch (err) {
       const errorMessage = err.response && err.response.data && err.response.data.message
                          ? err.response.data.message
                          : 'Registration initiation failed. Please try again.';
       setError(errorMessage);
       // If user exists and is verified, maybe redirect to login?
       if (err.response && err.response.status === 400 && errorMessage.includes('already exists and is verified')) {
           setTimeout(() => navigate('/login'), 3000); // Redirect after 3 seconds
       }

    } finally {
        setLoading(false); // End loading
    }
  };

  // Handle sending OTP (called automatically after step 1 submit, or by resend button)
   const handleSendOtp = async (mobile) => {
       setError('');
       setMessage('');
        const targetMobile = mobile || mobileNumber; // Use provided mobile or state mobile
       if (!targetMobile) {
           setError("Mobile number is missing for sending OTP. Please go back to step 1.");
           return;
       }
       setLoading(true); // Loading for OTP send

       try {
           const { data } = await api.post('/auth/send-otp', { mobileNumber: targetMobile });
           setMessage(data.message);
           

       } catch (err) {
           const errorMessage = err.response && err.response.data && err.response.data.message
                           ? err.response.data.message
                           : 'Failed to send OTP.';
           setError(errorMessage);
       } finally {
           setLoading(false); // End loading for OTP send
       }
   };


  // Handle submission for Step 2 (OTP Input)
  const handleStep2Submit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

     if (!otp || otp.length !== 4 || !/^\d{4}$/.test(otp)) {
         setError('Please enter the 4-digit OTP.');
         return;
     }

    setLoading(true); // Start loading for verification

    try {
      // Call backend to verify OTP
      const { data } = await api.post('/auth/verify-otp', { mobileNumber, otpCode: otp });
      setMessage(data.message);

       // OTP verified successfully, move to Step 3 (Set PIN)
      setStep(3);

    } catch (err) {
       const errorMessage = err.response && err.response.data && err.response.data.message
                          ? err.response.data.message
                          : 'OTP verification failed.';
       setError(errorMessage);
       setOtp(''); // Clear OTP on failure
    } finally {
        setLoading(false); // End loading
    }
  };

  // Handle submission for Step 3 (Set PIN)
  const handleStep3Submit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    // PIN validation
    if (!pin || !confirmPin || pin !== confirmPin) {
         setError('PINs do not match.');
         return;
    }
    if (pin.length !== 5 || !/^\d{5}$/.test(pin)) {
         setError('PIN must be exactly 5 digits.');
         return;
    }

    setLoading(true); // Start loading for set PIN

    try {
      // Call backend to set PIN and finalize verification/login
      const { data } = await api.post('/auth/set-pin', { mobileNumber, pin });

      setMessage(data.message); // Success message (e.g., "PIN set successfully!")

       // --- Login User Automatically ---
       localStorage.setItem('token', data.token); // Store the token
       updateUser(data); // Update AuthContext state with user data (includes token)

       // Clean up temporary storage as registration is complete
       localStorage.removeItem('registeringMobile');

       // Registration flow complete, redirect to Dashboard or Profile Completion
       // We'll redirect to dashboard, and Dashboard/ProtectedRoute will check for Name/DOB
       navigate('/app');


    } catch (err) {
       const errorMessage = err.response && err.response.data && err.response.data.message
                          ? err.response.data.message
                          : 'Failed to set PIN. Please try again.';
       setError(errorMessage);
       setPin(''); // Clear PINs on failure
       setConfirmPin('');
    } finally {
        setLoading(false); // End loading
    }
  };

   // Handle submission for Step 4 (Name & DOB) - This step will be on a *different page* after login
   // We will implement a new page '/app/complete-profile' for this.
   // The logic below is commented out as it won't be part of RegisterPage.js

   /*
  const handleStep4Submit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

     // Basic validation for name/dob
     if (!name || !dateOfBirth) {
         setError('Name and Date of Birth are required.');
         return;
     }

    setLoading(true); // Start loading for profile update

    try {
        // Call backend PUT /api/user/profile (requires token, user must be logged in)
        const { data } = await api.put('/user/profile', { name, dateOfBirth });

        setMessage(data.message);
        updateUser(data); // Update user state in AuthContext with name/dob

        // Profile completion successful, redirect to the main dashboard
        navigate('/app');

    } catch (err) {
       const errorMessage = err.response && err.response.data && err.response.data.message
                          ? err.response.data.message
                          : 'Failed to update profile. Please try again.';
       setError(errorMessage);
    } finally {
        setLoading(false); // End loading
    }
  };
  */


  // Handle Back Button
  const handleGoBack = () => {
    if (step > 1) {
      setStep(step - 1);
      setError(''); // Clear errors on back
      setMessage(''); // Clear messages on back
       // Clear state specific to the step you are leaving if needed
       if (step === 2) setOtp('');
       if (step === 3) { setPin(''); setConfirmPin(''); }
       // Note: Mobile number persists across steps
    } else {
        // On step 1, going back should go to Welcome page
        navigate('/');
    }
  };
  const backString = '←';


   // --- Conditional Rendering for UI based on step ---

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
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
                    pattern="01[3-9]\d{8}"
                    title="Enter a valid Bangladeshi mobile number (e.g., 01XXXXXXXXX)"
                 />
             </div>
             {error && <p className="error-message">{error}</p>}
             {message && <p className="success-message">{message}</p>}
             {/* Button is rendered in the bottom section */}
          </form>
        );
      case 2:
        return (
          <form onSubmit={handleStep2Submit}>
            <h3 className="step-subheading">আপনার মোবাইল নাম্বার<br/>যাচাই করুন</h3>
             {/* OTP input fields - could use multiple inputs for each digit */}
             {/* For simplicity, using a single input with maxLength */}
            <div className="otp-input-group">
              <label htmlFor="otp" className="visually-hidden">Enter OTP</label>
              <input
                 type="text"
                 id="otp"
                 className="otp-input"
                 value={otp}
                 onChange={(e) => setOtp(e.target.value)}
                 placeholder=" _ _ _ _" // Placeholder with underscores
                 maxLength="4"
                 required
              />
               {/* Resend OTP Icon/Button */}
              <button type="button" onClick={() => handleSendOtp()} className="resend-otp-button" disabled={loading}>
                 ↻ {/* Unicode refresh icon */}
              </button>
            </div>
             <p className="otp-instruction">
                 আপনার বিকাশ পিন ও ভেরিফিকেশন কোড<br/>কাউকে দেবেন না
             </p> {/* Instruction text */}
            {error && <p className="error-message">{error}</p>}
            {message && <p className="success-message">{message}</p>}
             {/* Button is rendered in the bottom section */}
          </form>
        );
      case 3:
        return (
          <form onSubmit={handleStep3Submit}>
             <h3 className="step-subheading">
                 আপনার মোবাইল নাম্বার<br/>{mobileNumber}
             </h3> {/* Display the mobile number */}
             <p className="step-instruction">
                 ৫ সংখ্যার নতুন পিন সেট করুন
             </p>
             {/* PIN input fields - could use multiple inputs */}
             <div className="pin-set-input-group">
                <label htmlFor="pin" className="visually-hidden">New PIN</label>
                 <input
                    type="password"
                    id="pin"
                     className="pin-input" // Reuse PIN input style
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder="Enter PIN"
                    maxLength="5"
                    required
                 />
             </div>
              <div className="pin-set-input-group">
                <label htmlFor="confirmPin" className="visually-hidden">Confirm New PIN</label>
                 <input
                    type="password"
                    id="confirmPin"
                     className="pin-input" // Reuse PIN input style
                    value={confirmPin}
                    onChange={(e) => setConfirmPin(e.target.value)}
                    placeholder="Confirm PIN"
                    maxLength="5"
                    required
                 />
             </div>
            {error && <p className="error-message">{error}</p>}
            {message && <p className="success-message">{message}</p>}
             {/* Button is rendered in the bottom section */}
          </form>
        );
       // Step 4 (Name & DOB) will be on a separate page '/app/complete-profile'
       /*
      case 4:
          return (
              <form onSubmit={handleStep4Submit}>
                  <h3 className="step-subheading">আপনার নাম ও<br/>জন্ম তারিখ</h3>
                   <div>
                      <label htmlFor="name" className="input-label">আপনার নাম</label>
                       <input
                          type="text"
                          id="name"
                          className="standard-input" // Add a standard input style
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          required
                       />
                   </div>
                    <div>
                      <label htmlFor="dateOfBirth" className="input-label">জন্ম তারিখ</label>
                       <input
                          type="date" // Use date type input
                          id="dateOfBirth"
                           className="standard-input" // Add a standard input style
                          value={dateOfBirth}
                          onChange={(e) => setDateOfBirth(e.target.value)}
                          required
                       />
                   </div>
                   {error && <p className="error-message">{error}</p>}
                   {message && <p className="success-message">{message}</p>}
                   // Button is rendered in the bottom section
              </form>
          );
       */
      default:
        return <div>Invalid step</div>; // Should not happen
    }
  };

   // Determine button text based on step
   const getButtonText = () => {
       if (loading) return 'Processing...';
       // if (step === 4) return 'সম্পন্ন করুন'; // Complete button text
       return 'পরবর্তী'; // Next button text
   };

  return (
    
    // Use a specific class for the registration page layout
    <div className="register-page-layout"> {/* Similar structure to login */}
         {/* Top section with logo, heading, input */}
        <div className="register-top-section">
             {/* Back button (visible on steps > 1) */}
             {step > 1 && (
                 <button onClick={handleGoBack} className="back-button">
                     
                 </button>
             )}

             <img src={logoPath} alt="C Pay Logo" className="register-logo" /> {/* Logo */}

             {/* Main Heading */}
             {/* Adjust heading based on step if needed, or keep general */}
             <h2 className="register-heading">রেজিস্ট্রেশন করুন</h2>
             {/* The subheading in renderStepContent is more specific */}

             {/* Render the content specific to the current step */}
             {renderStepContent()}

        </div> {/* End register-top-section */}


        {/* Bottom section with navigation button */}
        <div className="register-bottom-section">
             {/* The button handles submission for the current step's form */}
             {/* We need to manually trigger the correct submit handler */}
            <button
                onClick={() => {
                    // Find the form and trigger its submit
                    const form = document.querySelector('.register-top-section form');
                    if (form) {
                        form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
                    }
                }}
                className="register-next-button" // Use a specific class
                disabled={loading} // Disable while API call is loading
            >
               {getButtonText()} {/* Dynamic button text */}
               {!loading && <span className="button-arrow"></span>} {/* Arrow when not loading */}
            </button>

            {/* Link to login below the button (only visible on step 1, or maybe on step 4/complete?) */}
             {step === 1 && (
                <p style={{textAlign: 'center', marginTop: '20px'}}>
                   Already have an account? <Link to="/login">Login</Link>
                </p>
             )}
        </div> {/* End register-bottom-section */}

    </div> // End register-page-layout
  );
}

export default RegisterPage;