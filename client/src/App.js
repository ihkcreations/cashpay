// client/src/App.js (or App.jsx)
import {React, Link, useEffect, useState} from 'react';
import {  Route, Routes, useLocation } from 'react-router-dom';
import './styles/Agent.css';
import './styles/Admin.css';

// Import page components
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import VerifyOtpPage from './pages/VerifyOtpPage';
import DashboardPage from './pages/DashboardPage';
import SendMoneyPage from './pages/SendMoneyPage';
import PaymentPage from './pages/PaymentPage';
import CashoutPage from './pages/CashoutPage';
import AddMoneyPage from './pages/AddMoneyPage';
import MobileRechargePage from './pages/MobileRechargePage';
import PayBillPage from './pages/PayBillPage';
import StatementPage from './pages/StatementPage';
import CompleteProfilePage from './pages/CompleteProfilePage';

// Agent Pages (New - create these files next)
import AgentWelcomePage from './pages/agent/AgentWelcomePage';
import AgentRegisterPage from './pages/agent/AgentRegisterPage';
import AgentLoginPage from './pages/agent/AgentLoginPage';
import AgentSetPinPage from './pages/agent/AgentSetPinPage'; // For PIN setup after approval
import AgentDashboardPage from './pages/agent/AgentDashboardPage'; // Placeholder
import AgentProtectedRoute from './components/agent/AgentProtectedRoute'; 
import AgentCashInPage from './pages/agent/AgentCashInPage';
import AgentProcessUserCashoutPage from './pages/agent/AgentProcessUserCashoutPage';
import AgentStatementPage from './pages/agent/AgentStatementPage'; // Placeholder
import AgentSendMoneyPage from './pages/agent/AgentSendMoneyPage';
import AgentPayBillPage from './pages/agent/AgentPayBillPage';

import AdminWelcomeLoginPage from './pages/admin/AdminWelcomeLoginPage';
import AdminApplyPage from './pages/admin/AdminApplyPage';
import AdminPasswordResetPage from './pages/admin/AdminPasswordResetPage';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import AdminProtectedRoute from './components/admin/AdminProtectedRoute';

import AdminManageUsersPage from './pages/admin/AdminManageUsersPage';
import AdminAddUserPage from './pages/admin/AdminAddUserPage';
import AdminDashboardWidgetsPlaceholder from './pages/admin/AdminDashboardWidgetsPlaceholder';
import AdminManageAgentsPage from './pages/admin/AdminManageAgentsPage'; // Import
import AdminAddAgentPage from './pages/admin/AdminAddAgentPage';     // Import
import AdminManageMerchantsPage from './pages/admin/AdminManageMerchantsPage'; // Import
import AdminAddMerchantPage from './pages/admin/AdminAddMerchantPage';     // Import
import AdminManageAdminsPage from './pages/admin/AdminManageAdminsPage'; // Import
import AdminAddAdminPage from './pages/admin/AdminAddAdminPage';     // Import
import AdminTransactionsHistoryPage from './pages/admin/AdminTransactionsHistoryPage';

import RequestLoanPage from './pages/RequestLoanPage';
import MyLoansPage from './pages/MyLoansPage';
import MakeInvestmentPage from './pages/MakeInvestmentPage';
import MyInvestmentsPage from './pages/MyInvestmentsPage';

import AdminManageLoansPage from './pages/admin/AdminManageLoansPage';
import AdminManageInvestmentsPage from './pages/admin/AdminManageInvestmentsPage';

// Import ProtectedRoute component
import ProtectedRoute from './components/ProtectedRoute';
// Import the new HomeRedirect component
import HomeRedirect from './components/HomeRedirect';

const USER_BODY_BACKGROUND = '#2E3D24'; // User section page background (outside frame)
const AGENT_BODY_BACKGROUND = '#171F3A'; // Agent section page background (outside frame)
const ADMIN_BODY_BACKGROUND = '#404740'; // Admin section page background (outside frame)
const ADMIN_DASHBOARD_BODY_BACKGROUND = '#404740'


function App() {
  const location = useLocation();
  const [appLayoutType, setAppLayoutType] = useState('mobile-view'); // 'mobile-view' or 'admin-view'
  const [appFrameTheme, setAppFrameTheme] = useState('user-theme');  // For the border of mobile-view

  useEffect(() => {
    let bodyBgColor;
    let layoutType = 'mobile-view'; // Default to mobile-view
    let frameTheme = 'user-theme';    // Default to user-theme

     if (location.pathname.startsWith('/admin/dashboard')) { // Specific for dashboard
      bodyBgColor = ADMIN_DASHBOARD_BODY_BACKGROUND; // Use dashboard bg for body
      layoutType = 'admin-view-fullscreen'; // New layout type for fullscreen
      frameTheme = 'admin-frame-theme';
      document.body.classList.add('admin-active'); // Add class to body
    }else if (location.pathname.startsWith('/admin')) {
      bodyBgColor = ADMIN_BODY_BACKGROUND;
      layoutType = 'admin-view';       // Switch to admin layout
      frameTheme = 'admin-frame-theme'; // Specific frame theme for admin (can be same as mobile or different)
    } else if (location.pathname.startsWith('/agent')) {
      bodyBgColor = AGENT_BODY_BACKGROUND;
      // Agents still use the mobile-view layout, just a different theme for the frame
      frameTheme = 'agent-theme';
    } else {
      bodyBgColor = USER_BODY_BACKGROUND;
      frameTheme = 'user-theme';
    }

    document.body.style.backgroundColor = bodyBgColor;
    setAppLayoutType(layoutType);
    setAppFrameTheme(frameTheme); // This will theme the border of .app-root-container.mobile-view

  }, [location.pathname]);

  return (
    // This single root div will adapt its class for layout type
    <div className={`app-root-container ${appLayoutType} ${appFrameTheme}`}>
      {/* For mobile-view, this inner div helps manage content flow within the fixed frame.
          For admin-view, this div might just be 100% height/width of its parent. */}
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', width: '100%', flexGrow: 1 }}>
        <Routes>
          {/* --- User Routes --- */}
          <Route path="/" element={<HomeRedirect />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/verify-otp" element={<VerifyOtpPage />} />
          <Route path="/app" element={<ProtectedRoute />}>
            <Route index element={<DashboardPage />} />
            <Route path="send-money" element={<SendMoneyPage />} />
            <Route path="payment" element={<PaymentPage />} />
            <Route path="cashout" element={<CashoutPage />} />
            <Route path="add-money" element={<AddMoneyPage />} />
            <Route path="mobile-recharge" element={<MobileRechargePage />} />
            <Route path="pay-bill" element={<PayBillPage />} />
            <Route path="statement" element={<StatementPage />} />
            <Route path="complete-profile" element={<CompleteProfilePage />} />
            <Route path="request-loan" element={<RequestLoanPage />} />
            <Route path="my-loans" element={<MyLoansPage />} />
            <Route path="make-investment" element={<MakeInvestmentPage />} />
            <Route path="my-investments" element={<MyInvestmentsPage />} />
          </Route>

          {/* --- Agent Routes --- */}
          <Route path="/agent" element={<AgentWelcomePage />} />
          <Route path="/agent/register" element={<AgentRegisterPage />} />
          <Route path="/agent/login" element={<AgentLoginPage />} />
          <Route path="/agent/set-pin" element={<AgentSetPinPage />} />
          <Route path="/agent/dashboard" element={<AgentProtectedRoute />}>
            <Route index element={<AgentDashboardPage />} />
            <Route path="cash-in" element={<AgentCashInPage />} />
            <Route path="user-cash-out" element={<AgentProcessUserCashoutPage />} />
            <Route path="statement" element={<AgentStatementPage />} />
            <Route path="send-money" element={<AgentSendMoneyPage />} />
            <Route path="bill-payment" element={<AgentPayBillPage />} />
          </Route>

          {/* --- Admin Routes --- */}
          <Route path="/admin/login" element={<AdminWelcomeLoginPage />} />
          <Route path="/admin/apply" element={<AdminApplyPage />} />
          <Route path="/admin/forgot-password" element={<AdminPasswordResetPage />} />
          
          <Route path="/admin/dashboard" element={<AdminProtectedRoute><AdminDashboardPage /></AdminProtectedRoute>
            }
          >
            {/* Child routes: These elements render where <Outlet/> is in AdminDashboardPage */}
            <Route index element={<AdminDashboardWidgetsPlaceholder />} /> 
            <Route path="users" element={<AdminManageUsersPage />} />
            <Route path="users/add" element={<AdminAddUserPage />} />
            <Route path="agents" element={<AdminManageAgentsPage />} /> 
            <Route path="agents/add" element={<AdminAddAgentPage />} />
            <Route path="merchants" element={<AdminManageMerchantsPage />} /> 
            <Route path="merchants/add" element={<AdminAddMerchantPage />} />
            <Route path="admins" element={<AdminManageAdminsPage />} /> {/* New Route */}
            <Route path="admins/add" element={<AdminAddAdminPage />} />   {/* New Route */}
            <Route path="transactions" element={<AdminTransactionsHistoryPage />} />
            <Route path="transactions" element={<AdminTransactionsHistoryPage />} />
            <Route path="loans" element={<AdminManageLoansPage />} /> {/* New Route */}
            <Route path="investments" element={<AdminManageInvestmentsPage />} /> {/* New Route */}
          </Route>

          {/* Fallback Route */}
          <Route path="*" element={
            <div className="inner-page-content" style={{ textAlign: 'center', paddingTop: '50px', background: appLayoutType === 'admin-view' ? 'transparent' : 'white' }}>
              <h2>404 - Page Not Found</h2>
              <p>The page you are looking for does not exist.</p>
              <Link to="/">Go to User Welcome</Link> | <Link to="/agent">Go to Agent Welcome</Link> | <Link to="/admin/login">Go to Admin Login</Link>
            </div>
          } />
        </Routes>
      </div>
    </div>
  );
}

export default App;