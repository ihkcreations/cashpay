// client/src/pages/admin/AdminManageAgentsPage.js
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../api/api';
// Ensure Admin.css is imported, e.g., in App.js or directly here
import '../../styles/Admin.css';
import { useAuth } from '../../context/AuthContext';

function AdminManageAgentsPage() {
    const [agents, setAgents] = useState([]);
    const [selectedAgent, setSelectedAgent] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState(''); // For filtering by applicationStatus
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const { user: adminUser } = useAuth(); // Get the logged-in admin
    const navigate = useNavigate();

    const fetchAgents = async () => {
        setLoading(true);
        try {
            let url = '/admin/data/agents';
            if (filterStatus) {
                url += `?status=${filterStatus}`;
            }
            const { data } = await api.get(url);
            setAgents(data);
            setSelectedAgent(null); // Clear selection when list reloads/filters
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to fetch agents.');
            console.error("Fetch agents error:", err);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchAgents();
    }, [filterStatus]); // Refetch when filterStatus changes

    const handleAgentSelect = (agent) => {
        // In a real app, you might fetch more details if list is summarized
        setSelectedAgent(agent);
    };

    const handleApproveAgent = async (agentId) => {
        if (!window.confirm("Are you sure you want to approve this agent application?")) return;
        try {
            setLoading(true);
            await api.put(`/admin/data/agents/${agentId}/approve`);
            alert('Agent application approved. Agent needs to set PIN.');
            fetchAgents(); // Refresh the list
            setSelectedAgent(prev => prev?._id === agentId ? { ...prev, applicationStatus: 'approved' } : prev);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to approve agent.');
        }
        setLoading(false);
    };

    const handleRejectAgent = async (agentId) => {
        if (!window.confirm("Are you sure you want to reject this agent application?")) return;
        try {
            setLoading(true);
            await api.put(`/admin/data/agents/${agentId}/reject`);
            alert('Agent application rejected.');
            fetchAgents(); // Refresh
            setSelectedAgent(prev => prev?._id === agentId ? { ...prev, applicationStatus: 'rejected' } : prev);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to reject agent.');
        }
        setLoading(false);
    };

    const handleToggleActive = async (agentId, currentIsActive) => {
        const action = currentIsActive ? "deactivate" : "activate";
        if (!window.confirm(`Are you sure you want to ${action} this agent?`)) return;
        try {
            setLoading(true);
            const {data} = await api.put(`/admin/data/agents/${agentId}/toggle-active`);
            alert(data.message || `Agent status updated.`);
            fetchAgents(); // Refresh
            setSelectedAgent(prev => prev?._id === agentId ? data.agent : prev);
        } catch (err) {
            setError(err.response?.data?.message || `Failed to ${action} agent.`);
        }
        setLoading(false);
    };

    const handleDeleteAgent = async (agentIdToDelete) => {
        const agentToDelete = agents.find(a => a._id === agentIdToDelete) || selectedAgent;
        if (window.confirm(`Are you sure you want to delete agent "${agentToDelete?.shopName || agentIdToDelete}"? This action cannot be undone.`)) {
            try {
                setLoading(true);
                await api.delete(`/admin/data/agents/${agentIdToDelete}`);
                alert('Agent deleted successfully.');
                fetchAgents(); // Refresh list
                if (selectedAgent?._id === agentIdToDelete) {
                    setSelectedAgent(null);
                }
            } catch (err) {
                setError(err.response?.data?.message || 'Failed to delete agent.');
            }
            setLoading(false);
        }
    };


    const filteredAndSearchedAgents = agents.filter(agent =>
        (agent.shopName && agent.shopName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (agent.name && agent.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        agent.mobileNumber.includes(searchTerm) ||
        (agent.nidNumber && agent.nidNumber.includes(searchTerm))
    );

    if (loading && agents.length === 0) {
        return <div className="admin-content-area"><p>Loading agents...</p></div>;
    }

    return (
        <div className="admin-manage-entities-page">
            <div className="admin-page-header">
                <h1>Manage Agents</h1>
                <div className="admin-page-actions">
                    <select className="admin-filter-select" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                        <option value="">All Statuses</option>
                        <option value="pending_admin_approval">Pending Approval</option>
                        <option value="approved">Approved</option>
                        <option value="rejected">Rejected</option>
                        <option value="pending_otp_verification">Pending OTP</option>
                    </select>
                    <input type="search" placeholder="Search Agents..." className="admin-search-bar page-search" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    {adminUser?.role === 'super_admin' && ( // Only super_admin can add directly
                        <Link to="/admin/dashboard/agents/add" className="admin-add-button">
                            <span>+</span> Add New Agent
                        </Link>
                    )}
                </div>
            </div>

            {error && <p className="admin-error-message main-error">{error}</p>}

            <div className="admin-entities-layout-grid">
                <div className="admin-list-container">
                    <div className="admin-table-wrapper">
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>Shop Name</th>
                                    <th>Contact Person</th>
                                    <th>Phone</th>
                                    <th>Status</th>
                                    <th>Active</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredAndSearchedAgents.length > 0 ? (
                                    filteredAndSearchedAgents.map(agent => (
                                        <tr key={agent._id} onClick={() => handleAgentSelect(agent)} className={selectedAgent?._id === agent._id ? 'selected-row' : ''}>
                                            <td>{agent.shopName}</td>
                                            <td>{agent.name}</td>
                                            <td>{agent.mobileNumber}</td>
                                            <td><span className={`status-badge status-${agent.applicationStatus?.toLowerCase().replace(/_/g, '-')}`}>{agent.applicationStatus?.replace(/_/g, ' ').toUpperCase()}</span></td>
                                            <td><span className={`status-badge ${agent.isActive ? 'status-active' : 'status-inactive'}`}>{agent.isActive ? 'Active' : 'Inactive'}</span></td>
                                            <td className="action-buttons">
                                                {agent.applicationStatus === 'pending_admin_approval' && adminUser?.role === 'super_admin' && (
                                                    <>
                                                        <button onClick={(e) => {e.stopPropagation(); handleApproveAgent(agent._id);}} className="action-btn approve-btn" title="Approve">✔️</button>
                                                        <button onClick={(e) => {e.stopPropagation(); handleRejectAgent(agent._id);}} className="action-btn reject-btn" title="Reject">❌</button>
                                                    </>
                                                )}
                                                {(agent.applicationStatus === 'approved' && agent.pin) && adminUser?.role === 'super_admin' && (
                                                      <button onClick={(e) => {e.stopPropagation(); handleToggleActive(agent._id, agent.isActive);}} className={`action-btn ${agent.isActive ? 'deactivate-btn' : 'activate-btn'}`} title={agent.isActive ? "Deactivate" : "Activate"}>
                                                        {agent.isActive ? '🛑' : '🟢'}
                                                    </button>
                                                )}
                                                {/* Add Delete Button for super_admin */}
                                                {adminUser?.role === 'super_admin' && (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleDeleteAgent(agent._id); }}
                                                        className="action-btn delete-btn"
                                                        title="Delete Agent"
                                                    >
                                                        🗑️
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr><td colSpan="6" style={{ textAlign: 'center' }}>No agents found matching criteria.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="admin-entity-details-panel">
                    {selectedAgent ? (
                        <>
                            <div className="details-header">
                                <h3>{selectedAgent.shopName}</h3>
                                <span className={`status-badge status-${selectedAgent.applicationStatus?.toLowerCase().replace(/_/g, '-')}`}>{selectedAgent.applicationStatus?.replace(/_/g, ' ').toUpperCase()}</span>
                            </div>
                            <div className="details-body">
                                <p><strong>Agent ID:</strong> {selectedAgent._id}</p>
                                <p><strong>Contact Person:</strong> {selectedAgent.name}</p>
                                <p><strong>Mobile:</strong> {selectedAgent.mobileNumber}</p>
                                <p><strong>NID:</strong> {selectedAgent.nidNumber}</p>
                                <p><strong>District:</strong> {selectedAgent.district}</p>
                                <p><strong>Area:</strong> {selectedAgent.area}</p>
                                <p><strong>Balance:</strong> ৳{selectedAgent.balance?.toFixed(2)}</p>
                                <p><strong>Active:</strong> {selectedAgent.isActive ? 'Yes' : 'No'}</p>
                                <p>
                                    <strong>PIN Set: </strong>
                                    {selectedAgent.pin ? 'Yes' : 'No (Needs to set on first login after approval)'}
                                </p>
                                <p><strong>Applied:</strong> {new Date(selectedAgent.createdAt).toLocaleString()}</p>
                            </div>
                            <div className="details-actions">
                                {selectedAgent.applicationStatus === 'pending_admin_approval' && adminUser?.role === 'super_admin' && (
                                    <>
                                        <button onClick={() => handleApproveAgent(selectedAgent._id)} className="admin-action-button approve">Approve</button>
                                        <button onClick={() => handleRejectAgent(selectedAgent._id)} className="admin-action-button reject">Reject</button>
                                    </>
                                )}
                                 {(selectedAgent.applicationStatus === 'approved' && selectedAgent.pin) && adminUser?.role === 'super_admin' && (
                                    <button onClick={() => handleToggleActive(selectedAgent._id, selectedAgent.isActive)} className={`admin-action-button ${selectedAgent.isActive ? 'deactivate' : 'activate'}`}>
                                        {selectedAgent.isActive ? 'Deactivate Account' : 'Activate Account'}
                                    </button>
                                )}
                                {/* Add Delete Button in details panel for super_admin */}
                                {adminUser?.role === 'super_admin' && (
                                    <button
                                        onClick={() => handleDeleteAgent(selectedAgent._id)}
                                        className="admin-action-button delete" /* Add a 'delete' class for styling */
                                        style={{backgroundColor: '#ef4444', marginTop: '10px'}}
                                    >
                                        Delete This Agent
                                    </button>
                                )}
                            </div>
                        </>
                    ) : (
                        <p className="no-selection-message">Select an agent from the list to view details and manage.</p>
                    )}
                </div>
            </div>
        </div>
    );
}
export default AdminManageAgentsPage;