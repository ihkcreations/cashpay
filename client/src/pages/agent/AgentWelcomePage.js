// client/src/pages/agent/AgentWelcomePage.js
import React from 'react';
import { Link } from 'react-router-dom';
import '../../styles/Agent.css'
import logoPath from '../../assets/CashPayLogo.png';

function AgentWelcomePage() {
  return (
    <div className="agent-welcome-container"> {/* Specific container for agent welcome */}
      <div className="agent-welcome-top">
        <img src={logoPath} alt="C Pay Logo" className="welcome-logo" /> {/* Reuse .welcome-logo style */}
        <h1 className="agent-welcome-heading">স্বাগতম</h1>
        <p className="agent-welcome-subheading">
          ক্যাশপে এজেন্ট একাউন্ট
        </p>
      </div>

      <div className="agent-welcome-bottom">
        <p className="agent-welcome-cta">
          আপনার Phone No. দিয়ে ক্যাশপে <br/>এজেন্ট একাউন্টে লগইন করুন
        </p>
        <Link to="/agent/login" className="agent-button primary-button">
          লগইন
        </Link>
        <Link to="/agent/register" className="agent-button secondary-button">
          রেজিস্ট্রেশন
        </Link>
        <Link to="/" className="back-to-user-link">Go to User App</Link> {/* Link back to user app */}
      </div>
    </div>
  );
}

export default AgentWelcomePage;