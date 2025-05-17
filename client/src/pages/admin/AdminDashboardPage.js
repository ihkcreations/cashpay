// client/src/pages/admin/AdminDashboardPage.js
import { useEffect} from 'react';
import React from 'react';
import { useAuth } from '../../context/AuthContext'; // To get admin user info & logout
import { useNavigate, Link, Outlet, useLocation } from 'react-router-dom';   // For navigation
// We will import Admin.css here or ensure it's globally imported via App.js or index.js

import dashBoardIcon from '../../assets/icons/admin/dashboard.png'; // Placeholder for dashboard icon
import usersIcon from '../../assets/icons/admin/users.png'; // Placeholder for users icon
import transactionsIcon from '../../assets/icons/admin/money.png'; // Placeholder for transactions icon
import logoutIcon from '../../assets/icons/admin/admin_logout.png'; // Placeholder for logout icon
import loanIcon from '../../assets/icons/admin/admin_loan.png'
import investIcon from '../../assets/icons/admin/admin_invest.png'


function AdminDashboardPage() {
    const { user, logout } = useAuth(); // Assuming admin user details are in 'user' from AuthContext
    const navigate = useNavigate();
    const location = useLocation();

    // Placeholder: A proper AdminProtectedRoute should handle unauthorized access.
    // This is a basic check for demonstration.
    useEffect(() => {
        if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
            console.warn("Attempted to access admin dashboard without admin rights. Redirecting.");
            // In a real setup with separate admin auth, this might clear admin session
            // For now, assuming user from useAuth is the admin if logged in via admin login
            navigate('/admin/login');
        }
    }, [user, navigate]);


    const handleAdminLogout = () => {
        // If using a separate adminToken:
        localStorage.removeItem('adminToken');
        // If using the same AuthContext for user and admin, logout will clear 'user'
        // We might need a more specific logout for admin if state is shared carefully.
        // For now, assume generic logout clears the necessary state.
        // updateUser(null); // Or a specific clearAdminUser() from context
        logout(); // This will navigate to '/' (user welcome) by default
        // We want admin logout to go to admin login
        navigate('/admin/login');
    };



    if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
        return (
            <div className="admin-page-loading"> {/* Basic loading/redirecting message */}
                <p>Loading or unauthorized...</p>
            </div>
        );
    }

    return (
        <div className="admin-dashboard-layout admin-custom-font">
            <div className="admin-sidebar">
                <div className="admin-sidebar-logo">
                    {/* <img src="/logo.png" alt="CashPay Logo" style={{width: '35px', height: 'auto', marginRight: '10px'}} /> */}
                    <h2>CashPay</h2>
                </div>
                <nav className="admin-sidebar-nav">
                    <ul>
                        <li className={location.pathname === "/admin/dashboard" ? "active" : ""}> {/* Index route check */}
                            <Link to="/admin/dashboard">
                                <img src={dashBoardIcon} alt="Dashboard" className="admin-sidebar-icon" />
                                Dashboard
                            </Link> {/* Absolute path to self (index) is fine */}
                        </li>
                        <li className={location.pathname.startsWith("/admin/dashboard/users") ? "active" : ""}>
                            <Link to="users">
                                <img src={usersIcon} alt="Dashboard" className="admin-sidebar-icon" />
                                Users
                            </Link> {/* RELATIVE to /admin/dashboard */}
                        </li>
                        <li className={location.pathname.startsWith("/admin/dashboard/agents") ? "active" : ""}>
                            <Link to="agents">
                                <img src={usersIcon} alt="Dashboard" className="admin-sidebar-icon" />
                                Agents
                            </Link> {/* RELATIVE */}
                        </li>
                        <li className={location.pathname.startsWith("/admin/dashboard/merchants") ? "active" : ""}>
                            <Link to="merchants">
                                <img src={usersIcon} alt="Dashboard" className="admin-sidebar-icon" />
                                Merchants
                            </Link> {/* RELATIVE */}
                        </li>
                        <li className={location.pathname.startsWith("/admin/dashboard/admins") ? "active" : ""}>
                            <Link to="admins">
                                <img src={usersIcon} alt="Dashboard" className="admin-sidebar-icon" />
                                Admins
                            </Link> {/* RELATIVE */}
                        </li>
                        <li className={location.pathname.startsWith("/admin/dashboard/transactions") ? "active" : ""}>
                            <Link to="transactions">
                                <img src={transactionsIcon} alt="Dashboard" className="admin-sidebar-icon" />
                                Transactions History
                            </Link> {/* RELATIVE */}
                        </li>
                        <li className={location.pathname.startsWith("/admin/dashboard/loans") ? "active" : ""}>
                            <Link to="loans">
                                <img src={loanIcon} alt="Dashboard" className="admin-sidebar-icon" />
                                Manage Loans
                            </Link> {/* RELATIVE */}
                        </li>
                        <li className={location.pathname.startsWith("/admin/dashboard/investments") ? "active" : ""}>
                            <Link to="investments">
                                <img src={investIcon} alt="Dashboard" className="admin-sidebar-icon" />
                                Manage Invest
                            </Link> {/* RELATIVE */}
                        </li>
                    </ul>
                </nav>
                <div className="admin-sidebar-logout">
                    <img src={logoutIcon} alt="Dashboard" className="admin-sidebar-icon" />
                    <button onClick={handleAdminLogout}>Logout</button>
                </div>
            </div>

            <div className="admin-main-content">
                <div className="admin-topbar">
                    <div className="admin-topbar-user">
                        <span className="admin-user-avatar">{user.name ? user.name.charAt(0).toUpperCase() : (user.username ? user.username.charAt(0).toUpperCase() : 'A')}</span>
                        <span className="admin-user-name">{user.name || user.username}</span>
                    </div>
                    <div className="admin-topbar-actions">
                        <input type="search" placeholder="Search..." className="admin-search-bar" />
                        <button className="admin-settings-button" title="Settings"></button>
                    </div>
                </div>

                 {/* Content area for child routes (index widgets, user list, etc.) */}
                <div className="admin-page-content-area">
                    <Outlet /> {/* Child routes defined in App.js will render here */}
                </div>
            </div>
        </div>
    );
}

export default AdminDashboardPage;