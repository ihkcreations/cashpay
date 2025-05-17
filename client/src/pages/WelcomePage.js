// client/src/pages/WelcomePage.js
import React from 'react';
import { Link } from 'react-router-dom';
import logoPath from '../assets/CashPayLogo.png';

function WelcomePage() {
  return (
    // Use a class for the overall container to apply outer styling (dark green border/bg)
    <div className="welcome-container">
      {/* Top section with light green background */}
      <div className="welcome-top">

        {/* Logo */}
        <img src={logoPath} alt="C Pay Logo" className="welcome-logo" /> {/* Add a class for styling */}

        {/* Welcome text */}
        <h1 className="welcome-heading">স্বাগতম</h1> {/* Welcome in Bengali */}
        <p className="welcome-subheading">
          ক্যাশপে একাউন্ট খুলুন ঘরে <br/>বসে মূহুর্তেই
        </p> {/* Placeholder Bengali text */}
      </div>

      {/* Bottom section with white background */}
      <div className="welcome-bottom">
        <p className="welcome-cta">
          আপনার Phone No. দিয়ে <br/>ক্যাশপে একাউন্ট খুলুন মিনিটে
        </p> {/* Call to action in Bengali */}

        {/* Login Button */}
        <Link to="/login" className="welcome-button primary-button">
          লগইন {/* Login in Bengali */}
        </Link>

        {/* Registration Button */}
        <Link to="/register" className="welcome-button secondary-button">
          রেজিস্ট্রেশন {/* Registration in Bengali */}
        </Link>
      </div>
    </div>
  );
}

export default WelcomePage;