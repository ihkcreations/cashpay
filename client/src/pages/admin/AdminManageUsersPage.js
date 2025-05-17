// client/src/pages/admin/AdminManageUsersPage.js
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom'; // Link for Add New User button
import api from '../../api/api'; // Ensure correct path
import { useAuth } from '../../context/AuthContext'; // To get admin token implicitly via api instance
// Import Admin.css if not globally imported via App.js
// import '../../styles/Admin.css';

function AdminManageUsersPage() {
    const [users, setUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const { user: adminUser } = useAuth(); // Get the logged-in admin's details if needed
    const navigate = useNavigate();

    useEffect(() => {
        const fetchUsers = async () => {
            setLoading(true);
            try {
                // The API interceptor should add the adminToken
                const { data } = await api.get('/admin/data/users');
                setUsers(data);
                if (data.length > 0) {
                    // Optionally select the first user by default, or based on query param
                    // For now, let's not auto-select to keep it simple
                    // setSelectedUser(data[0]);
                }
            } catch (err) {
                setError(err.response?.data?.message || 'Failed to fetch users.');
                console.error("Fetch users error:", err);
            }
            setLoading(false);
        };
        fetchUsers();
    }, []);

    const handleUserSelect = async (userId) => {
        // Fetch full details for the selected user to display in the right panel
        // Or, if the initial list already contains all needed details, just set it.
        // For now, let's assume the list has enough for a summary, and clicking fetches more if needed.
        const userToDisplay = users.find(u => u._id === userId);
        if (userToDisplay) {
            // If you need more details not in the list, fetch from /api/admin/data/users/:id
            // For now, we'll use the data from the list.
            setSelectedUser(userToDisplay);
        } else {
             // Fetch if not in current list (e.g., after search or if list is paginated)
            try {
                const { data } = await api.get(`/admin/data/users/${userId}`);
                setSelectedUser(data);
            } catch (err) {
                setError(`Failed to fetch details for user ${userId}`);
            }
        }
    };

    const handleDeleteUser = async (userIdToDelete) => {
        if (window.confirm(`Are you sure you want to delete user ${selectedUser?.name || userIdToDelete}? This action cannot be undone.`)) {
            try {
                setLoading(true); // Consider a specific deleting state
                await api.delete(`/admin/data/users/${userIdToDelete}`);
                setUsers(prevUsers => prevUsers.filter(u => u._id !== userIdToDelete));
                setSelectedUser(null); // Clear selection
                alert('User deleted successfully.');
            } catch (err) {
                setError(err.response?.data?.message || 'Failed to delete user.');
            }
            setLoading(false);
        }
    };

    const filteredUsers = users.filter(user =>
        (user.name && user.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        user.mobileNumber.includes(searchTerm) ||
        (user.username && user.username.toLowerCase().includes(searchTerm.toLowerCase())) // If users also had usernames
    );

    if (loading && users.length === 0) { // Initial load
        return <div className="admin-content-area"><p>Loading users...</p></div>;
    }

    return (
        // This page will be rendered inside the <Outlet /> of AdminProtectedRoute,
        // which is inside the main AdminDashboardLayout's <div className="admin-main-content">
        <div className="admin-manage-users-page">
            <div className="admin-page-header">
                <h1>Manage Regular Users</h1>
                <div className="admin-page-actions">
                    <input
                        type="search"
                        placeholder="Search Users (Name, Phone)..."
                        className="admin-search-bar page-search" // More specific class
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <Link to="add" className="admin-add-button">
                        {/* Add icon (e.g., SVG or font icon) */}
                        <span>+</span> Add New User
                    </Link>
                </div>
            </div>

            {error && <p className="admin-error-message main-error">{error}</p>}

            <div className="admin-users-layout-grid"> {/* For list and details side-by-side */}
                <div className="admin-users-list-container">
                    <div className="admin-table-wrapper">
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>Name {/* Add sort icons if implementing sort */}</th>
                                    <th>Phone</th>
                                    <th>Balance</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredUsers.length > 0 ? (
                                    filteredUsers.map(user => (
                                        <tr key={user._id} onClick={() => handleUserSelect(user._id)} className={selectedUser?._id === user._id ? 'selected-row' : ''}>
                                            <td>{user.name || 'N/A'}</td>
                                            <td>{user.mobileNumber}</td>
                                            <td>৳{user.balance?.toFixed(2)}</td>
                                            <td>
                                                <span className={`status-badge ${user.isVerified ? 'status-verified' : 'status-pending'}`}>
                                                    {user.isVerified ? 'Verified' : 'Not Verified'}
                                                </span>
                                            </td>
                                            <td className="action-buttons">
                                                {/* <button className="action-btn view-btn" onClick={() => handleUserSelect(user._id)}>👁️</button> */}
                                                {/* <button className="action-btn edit-btn">✏️</button> */}
                                                <button
                                                    className="action-btn delete-btn"
                                                    onClick={(e) => { e.stopPropagation(); handleDeleteUser(user._id); }}
                                                    title="Delete User"
                                                >
                                                    🗑️
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="5" style={{ textAlign: 'center' }}>No users found.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Right Details Panel */}
                <div className="admin-user-details-panel">
                    {selectedUser ? (
                        <>
                            <div className="details-header">
                                <h3>{selectedUser.name || 'User Details'}</h3>
                                {/* Add Edit button here later */}
                            </div>
                            <div className="details-body">
                                <p><strong>ID:</strong> {selectedUser._id}</p>
                                <p><strong>Username:</strong> {selectedUser.username || 'N/A'}</p>
                                <p><strong>Name:</strong> {selectedUser.name || 'N/A'}</p>
                                <p><strong>Mobile:</strong> {selectedUser.mobileNumber}</p>
                                <p><strong>Balance:</strong> ৳{selectedUser.balance?.toFixed(2)}</p>
                                <p><strong>Verified:</strong> {selectedUser.isVerified ? 'Yes' : 'No'}</p>
                                <p><strong>Role:</strong> {selectedUser.role}</p>
                                <p><strong>Joined:</strong> {new Date(selectedUser.createdAt).toLocaleDateString()}</p>
                                {selectedUser.dateOfBirth && <p><strong>DOB:</strong> {new Date(selectedUser.dateOfBirth).toLocaleDateString()}</p>}
                                {/* Add more fields as needed */}
                            </div>
                            <div className="details-actions">
                                <button
                                    className="admin-delete-button-detail"
                                    onClick={() => handleDeleteUser(selectedUser._id)}
                                >
                                    Delete This User
                                </button>
                            </div>
                        </>
                    ) : (
                        <p className="no-selection-message">Select a user from the list to view details.</p>
                    )}
                </div>
            </div>
        </div>
    );
}

export default AdminManageUsersPage;