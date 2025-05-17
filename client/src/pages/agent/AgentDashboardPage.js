// client/src/pages/agent/AgentDashboardPage.js
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom'; // Assuming Link will be used for features
import { useAuth } from '../../context/AuthContext'; // Correct path
import '../../styles/Agent.css'

function AgentDashboardPage() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    // State for balance visibility (if agents have a toggleable balance display)
    const [showBalance, setShowBalance] = useState(false);
    const handleAgentLogout = () => {
        logout('/agent/'); // Redirect to agent login
    };

    // If user data isn't loaded or not an agent, ideally an AgentProtectedRoute would handle this.
    // For now, we do a basic check.
    useEffect(() => {
        if (!user || user.role !== 'agent') {
            // If not an agent, or user is null, redirect to agent login or welcome.
            // This logic is better suited for a dedicated AgentProtectedRoute.
            console.warn("Accessing agent dashboard without agent role or user data, redirecting.");
            // logout(); // Clear any potentially wrong session
            navigate('/agent/login');
        }
    }, [user, navigate, logout]);

    if (!user || user.role !== 'agent') {
        return (
            <div className="agent-page-layout">
                <div className="agent-page-content" style={{ textAlign: 'center', paddingTop: '50px' }}>
                    <p>Loading agent data or unauthorized access...</p>
                </div>
            </div>
        );
    }

    // --- Agent Dashboard Content ---
    return (
        <div className="agent-dashboard-layout"> {/* Specific layout class for agent dashboard */}

            {/* Top Profile Section - Agent Themed */}
            <div className="agent-dashboard-profile-section">
                <div className="profile-avatar agent-avatar">{/* Agent Icon */}👤</div>
                <div className="profile-info">
                    <span className="profile-name agent-name">{user.shopName || user.name || user.mobileNumber}</span>
                    <div className="balance-display-area agent-balance-area">
                        <span className="balance-label agent-balance-label">৳</span>
                        <button onClick={() => setShowBalance(!showBalance)} className="toggle-balance-button agent-toggle-balance">
                            {showBalance ? (user.balance?.toFixed(2) ?? '0.00') : 'ব্যালেন্স দেখুন'}
                        </button>
                    </div>
                </div>
                <div className="notification-icon agent-notification">{/* Notif Icon */}🔔</div>
            </div>

            {/* Feature Grid Section - Agent Features */}
            <div className="agent-dashboard-features-grid">
                {/* Example Agent Features - Replace with actual agent functionalities */}
                {/* These would link to different parts of the agent's operational UI */}
                <Link to="/agent/dashboard/cash-in" className="agent-feature-item">
                    <div className="agent-feature-icon">{/* Cash In Icon */}📥</div>
                    <span className="agent-feature-text">ক্যাশ ইন</span>
                </Link>
                <Link to="/agent/dashboard/user-cash-out" className="agent-feature-item">
                    <div className="agent-feature-icon">{/* User Cash Out Icon */}📤</div>
                    <span className="agent-feature-text">ক্যাশ আউট (গ্রাহক)</span>
                </Link>
                <Link to="/agent/dashboard/bill-payment" className="agent-feature-item"> {/* Placeholder */}
                    <div className="agent-feature-icon">{/* Bill Payment Icon */}💡</div>
                    <span className="agent-feature-text">বিল পেমেন্ট</span>
                </Link>
                <Link to="/agent/dashboard/statement" className="agent-feature-item">
                    <div className="agent-feature-icon">{/* Statement Icon */}📜</div>
                    <span className="agent-feature-text">এজেন্ট স্টেটমেন্ট</span>
                </Link>
                <Link to="/agent/dashboard/send-money" className="agent-feature-item"> {/* Agent to Agent/User? */}
                    <div className="agent-feature-icon">{/* Send Money Icon */}💸</div>
                    <span className="agent-feature-text">সেন্ড মানি</span>
                </Link>
                
            </div>

            {/* Promotional Messages Section - Agent Themed */}
            <div className="agent-dashboard-promo-section">
                <div className="promo-content">
                    এজেন্টদের জন্য বিশেষ অফার {/* Agent specific promo */}
                </div>
                <div className="promo-dots">
                    <span className="dot active agent-dot"></span>
                    <span className="dot agent-dot"></span>
                    <span className="dot agent-dot"></span>
                </div>
            </div>

            {/* Bottom Navigation Bar - Agent Themed */}
            <div className="agent-dashboard-bottom-nav">
                <div className="nav-item active agent-nav-item">
                    <div className="nav-icon agent-nav-icon">🏠</div>
                    <span className="nav-text">হোম</span>
                </div>
                <div className="nav-item agent-nav-item">
                    <div className="nav-icon agent-nav-icon">🔍</div>
                    <span className="nav-text">লেনদেন</span> {/* Transactions instead of Search? */}
                </div>
                <button onClick={handleAgentLogout} className="nav-item agent-nav-item logout-button" style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0, color: 'inherit', fontFamily: 'inherit', fontSize: 'inherit' }}>
                     <div className="nav-icon agent-nav-icon">➡️</div>
                     <span className="nav-text">Logout</span>
                 </button>
            </div>
        </div>
    );
}

export default AgentDashboardPage;