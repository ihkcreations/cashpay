// client/src/pages/CompleteProfilePage.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/api';
import { useAuth } from '../context/AuthContext';
// Assuming your logo is in the public directory
import logoPath from '../assets/CashPayLogo.png';

function CompleteProfilePage() {
    const [name, setName] = useState('');
    const navigate = useNavigate();
    // Initialize dateOfBirth state to a valid date string format expected by the input type="date"
    // If updating an existing user's profile, you might fetch their current data here
    const [dateOfBirth, setDateOfBirth] = useState('');
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);

    const { user, updateUser, logout } = useAuth(); // Need user, updateUser, maybe logout

    // Redirect if user is already logged in AND has name/dob set (already completed profile)
    useEffect(() => {
        if (user && user.name && user.dateOfBirth) {
            navigate('/app'); // Redirect to dashboard
        }
    }, [user, navigate]);

     // If user is NOT logged in, redirect to login
     // ProtectedRoute should handle this, but double-check
    // if (!user) {
    //     return <Navigate to="/login" replace />; // This logic better in ProtectedRoute
    // }


    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');

         // Frontend validation
         if (!name || !dateOfBirth) {
             setError('Name and Date of Birth are required.');
             return;
         }

        setLoading(true);

        try {
            // Call backend PUT /api/user/profile (requires token)
            // The `api` instance automatically includes the token from localStorage
            const { data } = await api.put('/user/profile', { name, dateOfBirth });

            setMessage(data.message);
            // Update the user state in AuthContext with the new profile data
            updateUser(data);

            // Profile completion successful, redirect to the main dashboard
            navigate('/app');

        } catch (err) {
            const errorMessage = err.response && err.response.data && err.response.data.message
                              ? err.response.data.message
                              : 'Failed to update profile. Please try again.';
            setError(errorMessage);
             // Optionally log out if there's a 401 error during update
            if (err.response && err.response.status === 401) {
                console.error('Token expired during profile update.');
                // logout(); // Auto logout
            }
        } finally {
            setLoading(false);
        }
    };


    return (
         // Use a specific class for the profile completion page layout
         // Similar structure to login/register steps
        <div className="complete-profile-layout">
             {/* Top section with logo, heading, input */}
             <div className="complete-profile-top-section">
                  {/* No back button typically needed here */}

                  <img src={logoPath} alt="C Pay Logo" className="profile-logo" /> {/* Logo */}

                  <h2 className="profile-heading">আপনার প্রোফাইল<br/>সম্পন্ন করুন</h2>

                  <form onSubmit={handleSubmit}>
                      <div className="input-group"> {/* Generic input group styling */}
                         <label htmlFor="name" className="input-label">আপনার নাম</label> {/* Label text */}
                         <input
                            type="text"
                            id="name"
                            className="standard-input" // Add a standard input style
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                         />
                     </div>
                      <div className="input-group">
                         <label htmlFor="dateOfBirth" className="input-label">জন্ম তারিখ</label> {/* Label text */}
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
                     {/* Button is rendered in the bottom section */}
                  </form>
             </div> {/* End complete-profile-top-section */}


             {/* Bottom section with submit button */}
             <div className="complete-profile-bottom-section">
                  <button
                      type="submit" // This button is inside the form now, simpler
                      form="" // Associate button with form ID if needed, or rely on nesting
                      onClick={(e) => { // Manual click handler to trigger form submit if button outside form
                          // Find the form and trigger its submit
                          const form = document.querySelector('.complete-profile-top-section form');
                          if (form) {
                              form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
                          } else {
                              // If button is inside form, standard submit works
                          }
                      }}
                       className="profile-submit-button" // Specific class
                       disabled={loading}
                  >
                     {loading ? 'Saving...' : 'সম্পন্ন করুন'}
                     {!loading && <span className="button-arrow">{''}</span>}
                  </button>
             </div> {/* End complete-profile-bottom-section */}

        </div> // End complete-profile-layout
    );
}

export default CompleteProfilePage;