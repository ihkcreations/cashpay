// client/src/pages/admin/AdminDashboardWidgetsPlaceholder.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/api'; // Ensure correct path
// import { useAuth } from '../../context/AuthContext'; // Not strictly needed if just displaying

function AdminDashboardWidgetsPlaceholder() {
    // const { user: adminUser } = useAuth();
    const [stats, setStats] = useState({ users: 0, agents: 0, merchants: 0, admins: 0, pendingAgentApplications: 0 });
    const [transactionsSummary, setTransactionsSummary] = useState({
        sendMoney: 0, mobileRecharge: 0, payment: 0, addMoney: 0, cashOut: 0, payBill: 0
    });
    const [recentActivities, setRecentActivities] = useState([]);
    const [investLoanSummary, setInvestLoanSummary] = useState({ totalInvested: 0, totalLoanProvided: 0 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchDashboardData = async () => {
            setLoading(true);
            try {
                const { data } = await api.get('/admin/data/stats');
                setStats(data.counts || { users: 0, agents: 0, merchants: 0, admins: 0 });
                setTransactionsSummary(data.transactionSummary || { sendMoney: 0, mobileRecharge: 0, payment: 0, addMoney: 0, cashOut: 0, payBill: 0});
                setRecentActivities(data.recentActivities || []);
                setInvestLoanSummary(data.investLoanSummary || { totalInvested: 0, totalLoanProvided: 0}); // Keep dummy if backend not ready
            } catch (err) {
                setError('Failed to load dashboard data.');
                console.error("Fetch dashboard data error:", err);
            }
            setLoading(false);
        };
        fetchDashboardData();
    }, []);

    const formatCurrency = (value) => {
        if (value >= 10000000) { // Crores (10M)
            return `৳${(value / 10000000).toFixed(1)}Cr`;
        } else if (value >= 100000) { // Lakhs (0.1M)
            return `৳${(value / 100000).toFixed(1)}L`;
        } else if (value >= 1000) {
            return `৳${(value / 1000).toFixed(1)}k`;
        }
        return `৳${value.toFixed(0)}`;
    };


    if (loading) {
        return <div style={{ padding: '30px', textAlign: 'center' }}>Loading dashboard data...</div>;
    }
    if (error) {
        return <div className="admin-error-message main-error" style={{padding: '30px', textAlign: 'center'}}>{error}</div>;
    }

    return (
        <div className="admin-dashboard-widgets admin-custom-font">
            {/* Summary Cards */}
            <div className="summary-card users">
                <div className="count">{stats.users}</div>
                <div className="title">Users</div>
                <Link to="users" className="manage-link">Manage Users</Link>
            </div>
            <div className="summary-card agents">
                <div className="count">{stats.agents}</div>
                <div className="title">Agents</div>
                {stats.pendingAgentApplications > 0 && <span className="pending-badge">{stats.pendingAgentApplications} Pending</span>}
                <Link to="agents" className="manage-link">Manage Agents</Link>
            </div>
            <div className="summary-card merchants">
                <div className="count">{stats.merchants}</div>
                <div className="title">Merchants</div>
                <Link to="merchants" className="manage-link">Manage Merchants</Link>
            </div>
            <div className="summary-card admins">
                <div className="count">{stats.admins}</div>
                <div className="title">Admins</div>
                <Link to="admins" className="manage-link">Manage Admins</Link>
            </div>

            {/* Transactions (All) Card */}
            <div className="data-card transactions-summary-card">
                <h3 className="data-card-title">Transactions (All)</h3>
                <div className="data-grid">
                    <div className="data-item"><span className="label">Send Money</span><span className="value">{formatCurrency(transactionsSummary.sendMoney)}</span></div>
                    <div className="data-item"><span className="label">Mobile Recharge</span><span className="value">{formatCurrency(transactionsSummary.mobileRecharge)}</span></div>
                    <div className="data-item"><span className="label">Payment</span><span className="value">{formatCurrency(transactionsSummary.payment)}</span></div>
                    <div className="data-item"><span className="label">Add Money</span><span className="value">{formatCurrency(transactionsSummary.addMoney)}</span></div>
                    <div className="data-item"><span className="label">Cash Out</span><span className="value">{formatCurrency(transactionsSummary.cashOut)}</span></div>
                    <div className="data-item"><span className="label">Pay Bill</span><span className="value">{formatCurrency(transactionsSummary.payBill)}</span></div>
                </div>
            </div>

            {/* Recent Activity Card */}
            <div className="data-card recent-activity-card">
                <h3 className="data-card-title">Recent Activity</h3>
                {recentActivities.length > 0 ? (
                    <ul className="recent-activity-list">
                        {recentActivities.map((activity) => (
                            <li key={activity.id}>
                                <span className="activity-text">{activity.text}</span>
                                <span className="activity-time">{activity.time}</span>
                            </li>
                        ))}
                    </ul>
                ) : (<p>No recent activities.</p>)}
            </div>

            {/* Invest/Loan Card (Still uses dummy data from backend) */}
            <div className="data-card invest-loan-card">
                <h3 className="data-card-title">Invest/Loan</h3>
                <div className="invest-loan-grid">
                    <div className="data-item">
                        <span className="label">Total Invested</span>
                        <span className="value">{formatCurrency(investLoanSummary.totalInvested)}</span>
                    </div>
                    <div className="data-item">
                        <span className="label">Total Loan Provided</span>
                        <span className="value">{formatCurrency(investLoanSummary.totalLoanProvided)}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default AdminDashboardWidgetsPlaceholder;