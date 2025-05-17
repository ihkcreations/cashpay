// client/src/pages/admin/AdminManageAdminsPage.js
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom'; // useNavigate for potential redirects
import api from '../../api/api';
import { useAuth } from '../../context/AuthContext';

// --- Modal Component for Resetting Password ---
const ResetPasswordModal = ({ adminToReset, onClose, onPasswordReset }) => {
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');
    const [modalError, setModalError] = useState('');
    const [modalLoading, setModalLoading] = useState(false);

    if (!adminToReset) return null;

    const handlePasswordSubmit = async (e) => {
        e.preventDefault();
        if (newPassword !== confirmNewPassword) {
            setModalError("Passwords do not match.");
            return;
        }
        if (newPassword.length < 6) {
            setModalError("Password must be at least 6 characters.");
            return;
        }
        setModalLoading(true);
        setModalError('');
        try {
            await api.put(`/admin/data/admins/${adminToReset._id}/reset-password`, { newPassword });
            onPasswordReset(adminToReset.username); // Pass username for success message
            onClose(); // Close modal
        } catch (err) {
            setModalError(err.response?.data?.message || "Failed to reset password.");
        }
        setModalLoading(false);
    };

    return (
        <div className="admin-modal-overlay">
            <div className="admin-modal-content">
                <h3>Reset Password for {adminToReset.username}</h3>
                <form onSubmit={handlePasswordSubmit}>
                    <div className="admin-input-group">
                        <label htmlFor="newPassword">New Password</label>
                        <input type="password" id="newPassword" className="admin-input" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
                    </div>
                    <div className="admin-input-group">
                        <label htmlFor="confirmNewPassword">Confirm New Password</label>
                        <input type="password" id="confirmNewPassword" className="admin-input" value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)} required />
                    </div>
                    {modalError && <p className="admin-error-message">{modalError}</p>}
                    <div className="admin-modal-actions">
                        <button type="submit" className="admin-submit-button" disabled={modalLoading}>{modalLoading ? 'Resetting...' : 'Reset Password'}</button>
                        <button type="button" className="admin-cancel-button" onClick={onClose} disabled={modalLoading}>Cancel</button>
                    </div>
                </form>
            </div>
        </div>
    );
};


function AdminManageAdminsPage() {
    const [admins, setAdmins] = useState([]);
    const [selectedAdmin, setSelectedAdmin] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState(''); // e.g., 'pending_super_admin_approval', 'approved'
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
    const [adminToResetPassword, setAdminToResetPassword] = useState(null);

    const { user: loggedInSuperAdmin } = useAuth(); // Logged in user (should be super_admin)
    // const navigate = useNavigate(); // If needed for other actions

    const fetchAdmins = async () => {
        setLoading(true);
        setError('');
        try {
            let url = '/admin/data/admins';
            if (filterStatus) {
                url += `?applicationStatus=${filterStatus}`; // Assuming backend filters by this query param
            }
            const { data } = await api.get(url);
            setAdmins(data);
            // If selectedAdmin is no longer in the list (e.g., after delete or filter change), clear it
            if (selectedAdmin && !data.find(a => a._id === selectedAdmin._id)) {
                setSelectedAdmin(null);
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to fetch admin accounts.');
        }
        setLoading(false);
    };

    useEffect(() => {
        if (loggedInSuperAdmin?.role === 'super_admin') { // Only fetch if super_admin
            fetchAdmins();
        } else {
            setError("Unauthorized to manage admin accounts.");
            setLoading(false);
        }
    }, [filterStatus, loggedInSuperAdmin]);

    const handleAdminSelect = (admin) => setSelectedAdmin(admin);

    const handleApprove = async (adminId) => {
        if (!window.confirm("Approve this admin application?")) return;
        setLoading(true); setError(''); setSuccessMessage('');
        try {
            const {data} = await api.put(`/admin/data/admins/${adminId}/approve-application`);
            setSuccessMessage(data.message || 'Admin application approved.');
            fetchAdmins();
            // Optionally update selectedAdmin if it was the one approved
            if (selectedAdmin?._id === adminId) {
                 setSelectedAdmin(prev => ({...prev, applicationStatus: 'approved', isActive: true}));
            }
        } catch (err) { setError(err.response?.data?.message || 'Failed to approve admin.'); }
        setLoading(false);
    };
    const handleReject = async (adminId) => {
        if (!window.confirm("Reject this admin application?")) return;
        setLoading(true); setError(''); setSuccessMessage('');
        try {
            const {data} = await api.put(`/admin/data/admins/${adminId}/reject-application`);
            setSuccessMessage(data.message || 'Admin application rejected.');
            fetchAdmins();
             if (selectedAdmin?._id === adminId) {
                 setSelectedAdmin(prev => ({...prev, applicationStatus: 'rejected', isActive: false}));
            }
        } catch (err) { setError(err.response?.data?.message || 'Failed to reject admin.'); }
        setLoading(false);
    };
    const handleToggleActive = async (adminId, currentIsActive) => {
        const action = currentIsActive ? "deactivate" : "activate";
        if (!window.confirm(`Are you sure you want to ${action} admin "${selectedAdmin?.username || adminId}"?`)) return;
        setLoading(true); setError(''); setSuccessMessage('');
        try {
            const { data } = await api.put(`/admin/data/admins/${adminId}/toggle-active`);
            setSuccessMessage(data.message || `Admin ${action}d successfully.`);
            fetchAdmins();
            if (selectedAdmin?._id === adminId) {
                 setSelectedAdmin(data.admin); // Update with full object from response
            }
        } catch (err) { setError(err.response?.data?.message || `Failed to ${action} admin.`); }
        setLoading(false);
    };
    const handleDelete = async (adminId) => {
        const adminToDelete = admins.find(a => a._id === adminId) || selectedAdmin;
        if (!window.confirm(`Delete admin "${adminToDelete?.username || adminId}"? This cannot be undone.`)) return;
        setLoading(true); setError(''); setSuccessMessage('');
        try {
            await api.delete(`/admin/data/admins/${adminId}`);
            setSuccessMessage('Admin account deleted successfully.');
            fetchAdmins();
            if (selectedAdmin?._id === adminId) setSelectedAdmin(null);
        } catch (err) { setError(err.response?.data?.message || 'Failed to delete admin.'); }
        setLoading(false);
    };

    const openResetPasswordModal = (admin) => {
        setAdminToResetPassword(admin);
        setShowResetPasswordModal(true);
    };
    const handlePasswordResetSuccess = (adminUsername) => {
        setSuccessMessage(`Password for ${adminUsername} has been reset successfully.`);
        // Optionally refetch admins or update selected admin if needed, though password isn't shown
    };


    const filteredAndSearchedAdmins = admins.filter(admin =>
        admin.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (admin.name && admin.name.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    if (loggedInSuperAdmin?.role !== 'super_admin' && !loading) {
        return <div className="admin-content-area"><p className="admin-error-message">You are not authorized to manage admin accounts.</p></div>;
    }
    if (loading && admins.length === 0) return <div className="admin-content-area"><p>Loading admin accounts...</p></div>;


    return (
        <div className="admin-manage-entities-page">
            <div className="admin-page-header">
                <h1>Manage Admin Accounts</h1>
                <div className="admin-page-actions">
                     <select className="admin-filter-select" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                        <option value="">All Admins</option>
                        <option value="pending_super_admin_approval">Pending Approval</option>
                        <option value="approved">Approved</option>
                        <option value="rejected">Rejected</option>
                    </select>
                    <input type="search" placeholder="Search Admins (Username, Name)..." className="admin-search-bar page-search" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    <Link to="/admin/dashboard/admins/add" className="admin-add-button">
                        <span>+</span> Add New Admin
                    </Link>
                </div>
            </div>

            {error && <p className="admin-error-message main-error">{error}</p>}
            {successMessage && <p className="admin-success-message main-success">{successMessage}</p>}


            <div className="admin-entities-layout-grid">
                <div className="admin-list-container">
                    <div className="admin-table-wrapper">
                        <table className="admin-table">
                            <thead><tr><th>Username</th><th>Name</th><th>Role</th><th>Status</th><th>Active</th><th>Actions</th></tr></thead>
                            <tbody>
                                {filteredAndSearchedAdmins.map(admin => (
                                    <tr key={admin._id} onClick={() => handleAdminSelect(admin)} className={selectedAdmin?._id === admin._id ? 'selected-row' : ''}>
                                        <td>{admin.username} {admin.role === 'super_admin' ? '(Owner)' : ''}</td>
                                        <td>{admin.name}</td>
                                        <td>{admin.role}</td>
                                        <td><span className={`status-badge status-${admin.applicationStatus?.toLowerCase().replace(/_/g, '-')}`}>{admin.applicationStatus?.replace(/_/g, ' ').toUpperCase() || 'N/A'}</span></td>
                                        <td><span className={`status-badge ${admin.isActive ? 'status-active' : 'status-inactive'}`}>{admin.isActive ? 'Active' : 'Inactive'}</span></td>
                                        <td className="action-buttons">
                                            {admin.applicationStatus === 'pending_super_admin_approval' && (
                                                <>
                                                    <button onClick={(e) => {e.stopPropagation(); handleApprove(admin._id);}} className="action-btn approve-btn" title="Approve">✔️</button>
                                                    <button onClick={(e) => {e.stopPropagation(); handleReject(admin._id);}} className="action-btn reject-btn" title="Reject">❌</button>
                                                </>
                                            )}
                                            {admin.applicationStatus === 'approved' && admin.role !== 'super_admin' && (
                                                <button onClick={(e) => {e.stopPropagation(); handleToggleActive(admin._id, admin.isActive);}} className={`action-btn ${admin.isActive ? 'deactivate-btn' : 'activate-btn'}`} title={admin.isActive ? "Deactivate" : "Activate"}>
                                                    {admin.isActive ? '🛑' : '🟢'}
                                                </button>
                                            )}
                                             {admin.role !== 'super_admin' && ( // Super admin cannot delete self
                                                <button onClick={(e) => { e.stopPropagation(); handleDelete(admin._id); }} className="action-btn delete-btn" title="Delete Admin">🗑️</button>
                                             )}
                                        </td>
                                    </tr>
                                ))}
                                {filteredAndSearchedAdmins.length === 0 && <tr><td colSpan="6" style={{textAlign: 'center'}}>No admin accounts found.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="admin-entity-details-panel">
                    {selectedAdmin ? (
                        <>
                            <div className="details-header">
                                <h3>{selectedAdmin.username} {selectedAdmin.role === 'super_admin' ? '(Owner)' : ''}</h3>
                                <span className={`status-badge status-${selectedAdmin.applicationStatus?.toLowerCase().replace(/_/g, '-')}`}>{selectedAdmin.applicationStatus?.toUpperCase() || 'N/A'}</span>
                            </div>
                            <div className="details-body">
                                <p><strong>Full Name:</strong> {selectedAdmin.name}</p>
                                <p><strong>Role:</strong> {selectedAdmin.role}</p>
                                <p><strong>Active:</strong> {selectedAdmin.isActive ? 'Yes' : 'No'}</p>
                                <p><strong>Created:</strong> {new Date(selectedAdmin.createdAt).toLocaleString()}</p>
                            </div>
                            <div className="details-actions">
                                {selectedAdmin.applicationStatus === 'pending_super_admin_approval' && (
                                    <>
                                        <button onClick={() => handleApprove(selectedAdmin._id)} className="admin-action-button approve">Approve Application</button>
                                        <button onClick={() => handleReject(selectedAdmin._id)} className="admin-action-button reject">Reject Application</button>
                                    </>
                                )}
                                {selectedAdmin.applicationStatus === 'approved' && selectedAdmin.role !== 'super_admin' && (
                                    <>
                                    <button onClick={() => handleToggleActive(selectedAdmin._id, selectedAdmin.isActive)} className={`admin-action-button ${selectedAdmin.isActive ? 'deactivate' : 'activate'}`}>
                                        {selectedAdmin.isActive ? 'Deactivate' : 'Activate'}
                                    </button>
                                    <button onClick={() => openResetPasswordModal(selectedAdmin)} className="admin-action-button reset-pass-btn">Reset Password</button>
                                    </>
                                )}
                                 {selectedAdmin.role !== 'super_admin' && (
                                    <button onClick={() => handleDelete(selectedAdmin._id)} className="admin-action-button delete">Delete Admin</button>
                                 )}
                            </div>
                        </>
                    ) : <p className="no-selection-message">Select an admin from the list to view details.</p>}
                </div>
            </div>

            {showResetPasswordModal && adminToResetPassword && (
                <ResetPasswordModal
                    adminToReset={adminToResetPassword}
                    onClose={() => { setShowResetPasswordModal(false); setAdminToResetPassword(null); }}
                    onPasswordReset={handlePasswordResetSuccess}
                />
            )}
        </div>
    );
}
export default AdminManageAdminsPage;