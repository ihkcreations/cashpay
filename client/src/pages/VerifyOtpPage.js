// client/src/pages/VerifyOtpPage.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/api'; // Use our configured axios instance
import { useAuth } from '../context/AuthContext'; // Use auth hook to update state after verification
import { useOtpDisplay } from '../context/OtpDisplayContext';

function VerifyOtpPage() {
  const [otpCode, setOtpCode] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();
  const { updateUser } = useAuth(); // Use updateUser from AuthContext
  const { showOtpOnScreen } = useOtpDisplay();

  // Fetch mobile number from local storage when the component mounts
  useEffect(() => {
    const storedMobile = localStorage.getItem('registeringMobile');
    if (storedMobile) {
      setMobileNumber(storedMobile);
       // Optionally, trigger send OTP automatically here
       // handleSendOtp(storedMobile); // Call the send OTP function
    } else {
      // If no mobile number is found (user came directly), redirect to register
      navigate('/register');
    }

     // Clean up the temporary mobile number on component unmount
     // Or, you could clean it up only after successful verification
     return () => {
         // localStorage.removeItem('registeringMobile'); // Decide when to remove
     };

  }, [navigate]); // Effect depends on navigate

   // Function to resend OTP
   const handleSendOtp = async () => {
       setError('');
       setMessage('');
       if (!mobileNumber) {
           setError("Mobile number not found. Please go back to registration.");
           return;
       }
       try {
           const { data } = await api.post('/auth/send-otp', { mobileNumber });
           setMessage(data.message);
           // Note: For prototype, check server console for the new OTP
           if (data.prototypeOtp) { // Check if backend sent it
                showOtpOnScreen(data.prototypeOtp, mobileNumber);
            }
       } catch (err) {
           const errorMessage = err.response && err.response.data && err.response.data.message
                           ? err.response.data.message
                           : 'Failed to send OTP. Please try again.';
           setError(errorMessage);
       }
   };


  // Function to verify the entered OTP
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

     if (!otpCode) {
         setError('Please enter the OTP.');
         return;
     }
    if (otpCode.length !== 4 || !/^\d{4}$/.test(otpCode)) {
         setError('OTP must be a 4-digit number.');
         return;
    }


    try {
      // Make API call to backend verification endpoint
      const { data } = await api.post('/auth/verify-otp', { mobileNumber, otpCode });

      // If verification is successful
      setMessage(data.message); // Display success message
      localStorage.setItem('token', data.token); // Store the token received on verification

      // Update the user state in AuthContext with the verified user data
      updateUser(data);

      // Clean up the temporary mobile number storage
      localStorage.removeItem('registeringMobile');

      // Redirect to the dashboard
      navigate('/app');

    } catch (err) {
       // Handle errors (e.g., display backend error message - invalid OTP, expired OTP)
       const errorMessage = err.response && err.response.data && err.response.data.message
                          ? err.response.data.message
                          : 'OTP verification failed. Please try again.';
       setError(errorMessage);
    }
  };

  // Show loading or message while mobile number is being retrieved or absent
  if (!mobileNumber) {
      return <div>Loading mobile number...</div>; // Should ideally redirect if not found
  }


  return (
    <div>
      <h2>Verify Your Account</h2>
      <p>An OTP has been sent to <strong>{mobileNumber}</strong>. (Check your server console)</p>
      <form onSubmit={handleVerifyOtp}>
        <div>
          <label htmlFor="otp">Enter OTP:</label>
          <input
            type="text"
            id="otp"
            maxLength="4" // Assuming 4-digit OTP
            value={otpCode}
            onChange={(e) => setOtpCode(e.target.value)}
            required
          />
        </div>
        {error && <p style={{ color: 'red' }}>{error}</p>} {/* Display error message */}
        {message && <p style={{ color: 'green' }}>{message}</p>} {/* Display success message */}
        <button type="submit">Verify</button>
      </form>
      <p style={{textAlign: 'center', marginTop: '20px'}}>
           Didn't receive OTP? <button onClick={handleSendOtp} style={{width: 'auto', padding: '5px 10px', backgroundColor: '#f15a24'}}>Resend OTP</button> {/* Use orange for resend? */}
      </p>
    </div>
  );
}

export default VerifyOtpPage;