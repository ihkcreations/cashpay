// client/src/components/HomeRedirect.js
import React from 'react';
import { Navigate } from 'react-router-dom'; // For redirection
import { useAuth } from '../context/AuthContext'; // To check auth status
import WelcomePage from '../pages/WelcomePage'; // The component to render if not logged in

function HomeRedirect() {
  // Get the user object and the loading state from the authentication context
  const { user, loading } = useAuth();

  // While the authentication status is being checked (e.g., checking token in localStorage)
  if (loading) {
      // You can render a simple loading spinner or message here
      // This will prevent showing the WelcomePage briefly before redirecting
       return (
           <div style={{
               minHeight: '100vh', // Ensure it covers the screen while loading
               display: 'flex',
               justifyContent: 'center',
               alignItems: 'center',
               backgroundColor: '#f0f0f0', // Background outside the app frame
               color: '#333',
               fontSize: '20px'
            }}>
               Loading Application...
           </div>
       );
  }

  // If the user object exists (meaning they are logged in)
  if (user) {
    // Redirect them to the '/app' route (Dashboard)
    // 'replace' prevents adding the current path to the history stack
    return <Navigate to="/app" replace />;
  }

  // If the user object is null (meaning they are not logged in)
  // Render the WelcomePage component
  return <WelcomePage />;
}

export default HomeRedirect;