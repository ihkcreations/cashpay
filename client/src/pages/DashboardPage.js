// client/src/pages/DashboardPage.js
import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext'; // Use auth hook

import homeIcon from '../assets/icons/home.png' // Placeholder for home icon
import inboxIcon from '../assets/icons/Mail.png' // Placeholder for inbox icon
import logoutIcon from '../assets/icons/logout.png' // Placeholder for logout icon

import sendMoneyIcon from '../assets/icons/SendMoney.png'
import addMoneyIcon from '../assets/icons/AddMoney.png'
import cashOutIcon from '../assets/icons/CashOut.png'
import payBillIcon from '../assets/icons/PayBill.png'
import mobileRechargeIcon from '../assets/icons/MobileRecharge.png'
import paymentIcon from '../assets/icons/Payment.png'
import investIcon from '../assets/icons/invest_icon.png'
import loanIcon from '../assets/icons/loan_icon.png'
import statementIcon from '../assets/icons/statement.png'


function DashboardPage() {
  // Get user data and logout function from AuthContext
  const { user, logout } = useAuth();
  const navigate = useNavigate(); // Get navigate function

  // State to toggle balance visibility
  const [showBalance, setShowBalance] = useState(false);

  const handleUserLogout = () => {
    logout('/'); // Redirect to user welcome
  };

  useEffect(() => {
    if (user && (!user.name || !user.dateOfBirth)) { // Check if name or dob is missing
        
        navigate('/app/complete-profile'); // Redirect to the new page
    }
    else if(user){
      navigate('/app'); // Redirect to dashboard if user is logged in and profile is complete
    }
     // Optional: If user is logged in but user object is minimal (e.g., only mobile, balance, verified),
     // you might want to fetch the full profile here to get name/dob if they exist but aren't in context state yet.
     // But AuthContext's initial check should load the full profile.

  }, [user, navigate]); // Re-run if user object changes

  


  // If user data is not available yet (should be handled by ProtectedRoute/AuthProvider loading)
  if (!user) {
       return <div>Loading user data...</div>;
  }

  if (!user.name || !user.dateOfBirth) {
    return <div>Checking profile status...</div>; // Or render a loader
  }

  // --- Render Dashboard Content ---
  return (
    // Remove inner-page-content class from this outer div
    // Apply padding and background via specific section classes
    <div className="dashboard-layout"> {/* Use a class for the overall dashboard layout */}

      {/* Top Profile Section */}
      <div className="dashboard-profile-section">
        <div className="profile-avatar">{/* Placeholder for user icon */}👤</div> {/* Simple user icon */}
        <div className="profile-info">
          <span className="profile-name">{user.name || user.mobileNumber}</span> {/* Display name if available */}
          {/* Balance Display and Toggle */}
          <div className="balance-display-area">
            <span className="balance-label">৳</span> {/* Taka symbol */}
            <button onClick={() => setShowBalance(!showBalance)} className="toggle-balance-button">
                {showBalance ? (user.balance !== undefined ? user.balance.toFixed(2) : 'Loading...') : 'ব্যালেন্স দেখুন'} {/* Show balance or prompt to view */}
             </button>
          </div>
        </div>
        <div className="notification-icon">{/* Placeholder for notification icon */}🔔</div> {/* Simple bell icon */}
      </div>

      {/* Feature Grid Section */}
      <div className="dashboard-features-grid">
        {/* Feature Items - Use Link for navigation */}
        {/* Replace content with Bengali text and placeholders for icons */}

        <Link to="/app/send-money" className="feature-item">
            <div className="feature-icon">
              <img src={sendMoneyIcon} alt="C Pay Logo" className='feature-icon-size'/>
            </div>
            <span className="feature-text">সেন্ড মানি</span>
        </Link>

        <Link to="/app/mobile-recharge" className="feature-item">
            <div className="feature-icon">
              <img src={mobileRechargeIcon} alt="C Pay Logo" className='feature-icon-size'/>
            </div>
            <span className="feature-text">মোবাইল রিচার্জ</span>
        </Link>

        <Link to="/app/cashout" className="feature-item">
            <div className="feature-icon">
              <img src={cashOutIcon} alt="C Pay Logo" className='feature-icon-size'/>
            </div>
            <span className="feature-text">ক্যাশ আউট</span>
        </Link>

         <Link to="/app/pay-bill" className="feature-item">
            <div className="feature-icon">
              <img src={payBillIcon} alt="C Pay Logo" className='feature-icon-size'/>
            </div>
            <span className="feature-text">পে বিল</span>
        </Link>

         <Link to="/app/payment" className="feature-item">
            <div className="feature-icon">
              <img src={paymentIcon} alt="C Pay Logo" className='feature-icon-size'/>
            </div>
            <span className="feature-text">পেমেন্ট</span>
        </Link>

         <Link to="/app/add-money" className="feature-item">
            <div className="feature-icon">
              <img src={addMoneyIcon} alt="C Pay Logo" className='feature-icon-size'/>
            </div>
            <span className="feature-text">অ্যাড মানি</span>
        </Link>
        <Link to="/app/make-investment" className="feature-item">
            <div className="feature-icon">
              <img src={investIcon} alt="C Pay Logo" className='feature-icon-size'/>
            </div>
            <span className="feature-text">ইনভেস্ট ক্যাশপে</span>
        </Link>
        <Link to="/app/request-loan" className="feature-item"> {/* Changed to request-loan which links to form */}
            <div className="feature-icon">
              <img src={loanIcon} alt="C Pay Logo" className='feature-icon-size'/>
            </div>
            <span className="feature-text">লোন ক্যাশপে</span>
        </Link>
        {/* Placeholder for other/statement */}
        <Link to="/app/statement" className="feature-item">
            <div className="feature-icon">
              <img src={statementIcon} alt="C Pay Logo" className='feature-icon-size'/>
            </div>
            <span className="feature-text">স্টেটমেন্ট</span>
        </Link>

         


      </div> {/* End dashboard-features-grid */}

      {/* Promotional Messages Section */}
      <div className="dashboard-promo-section">
         <div className="promo-content">
             Promotional Messages {/* Or images/carousel */}
         </div>
          {/* Placeholder for carousel dots */}
         <div className="promo-dots">
             <span className="dot active"></span>
             <span className="dot"></span>
             <span className="dot"></span>
         </div>
      </div> {/* End dashboard-promo-section */}


      {/* Bottom Navigation Bar Section (Will be fixed position, outside main scroll area usually) */}
       {/* For this prototype, we'll put it at the bottom of the content div */}
       {/* In a real app, this navigation bar is usually a separate component rendered by App.js */}
       {/* and positioned fixed at the bottom of the viewport. */}
       {/* For simplicity here, we'll place it at the end of the dashboard-layout div */}
       <div className="dashboard-bottom-nav">
            <Link to="/app" className="nav-item active"> {/* Active Home icon */}
                <div className="nav-icon">
                  <img src={homeIcon} alt="C Pay Logo"/>
                </div>
                <span className="nav-text">হোম</span>
            </Link>
            
             <Link to="/app/statement" className="nav-item"> {/* Inbox */}
                <div className="nav-icon">
                  <img src={inboxIcon} alt="C Pay Logo"/>
                </div>
                <span className="nav-text">ইনবক্স</span>
            </Link>
            {/* Logout button here for easy access during prototype testing */}
            <button onClick={handleUserLogout} className="nav-item logout-button" style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0, color: 'inherit', fontFamily: 'inherit', fontSize: 'inherit' }}>
                 <div className="nav-icon">
                  <img src={logoutIcon} alt="C Pay Logo"/></div>
                 <span className="nav-text">Logout</span>
             </button>
       </div> {/* End dashboard-bottom-nav */}


    </div> // End dashboard-layout
  );
}

export default DashboardPage;