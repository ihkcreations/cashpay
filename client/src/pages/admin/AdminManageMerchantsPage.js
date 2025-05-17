// client/src/pages/admin/AdminManageMerchantsPage.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/api';
import { useAuth } from '../../context/AuthContext'; // To check admin role for actions

function AdminManageMerchantsPage() {
    const [merchants, setMerchants] = useState([]);
    const [selectedMerchant, setSelectedMerchant] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const { user: adminUser } = useAuth(); // Get logged-in admin info

    const fetchMerchants = async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/admin/data/merchants');
            setMerchants(data);
            setSelectedMerchant(null);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to fetch merchants.');
            console.error("Fetch merchants error:", err);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchMerchants();
    }, []);

    const handleMerchantSelect = (merchant) => {
        setSelectedMerchant(merchant);
    };

    const handleToggleActive = async (merchantId, currentIsActive) => {
        const action = currentIsActive ? "deactivate" : "activate";
        if (!window.confirm(`Are you sure you want to ${action} merchant "${selectedMerchant?.merchantName || merchantId}"?`)) return;
        try {
            setLoading(true);
            const updatedMerchant = { ...selectedMerchant, isActive: !currentIsActive };
            // Assuming merchantId in selectedMerchant is the MongoDB _id
            const { data } = await api.put(`/admin/data/merchants/${merchantId}`, { isActive: !currentIsActive });
            alert(`Merchant ${action}d successfully.`);
            fetchMerchants(); // Refresh list
            setSelectedMerchant(data); // Update selected merchant with response
        } catch (err) {
            setError(err.response?.data?.message || `Failed to ${action} merchant.`);
        }
        setLoading(false);
    };

    const handleDeleteMerchant = async (merchantId) => {
        if (!window.confirm(`Are you sure you want to delete merchant "${selectedMerchant?.merchantName || merchantId}"? This cannot be undone.`)) return;
        try {
            setLoading(true);
            await api.delete(`/admin/data/merchants/${merchantId}`);
            alert('Merchant deleted successfully.');
            fetchMerchants();
            setSelectedMerchant(null);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to delete merchant.');
        }
        setLoading(false);
    };


    const filteredAndSearchedMerchants = merchants.filter(merchant =>
        (merchant.merchantName && merchant.merchantName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (merchant.merchantId && merchant.merchantId.toLowerCase().includes(searchTerm.toLowerCase())) ||
        merchant.mobileNumber.includes(searchTerm)
    );

    if (loading && merchants.length === 0) {
        return <div className="admin-content-area"><p>Loading merchants...</p></div>;
    }

    return (
        <div className="admin-manage-entities-page">
            <div className="admin-page-header">
                <h1>Manage Merchants</h1>
                <div className="admin-page-actions">
                    <input
                        type="search"
                        placeholder="Search Merchants (Name, ID, Phone)..."
                        className="admin-search-bar page-search"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    {adminUser?.role === 'super_admin' && (
                        <Link to="/admin/dashboard/merchants/add" className="admin-add-button">
                            <span>+</span> Add New Merchant
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
                                    <th>Merchant Name</th>
                                    <th>Merchant ID</th>
                                    <th>Phone</th>
                                    <th>Balance</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredAndSearchedMerchants.length > 0 ? (
                                    filteredAndSearchedMerchants.map(merchant => (
                                        <tr key={merchant._id} onClick={() => handleMerchantSelect(merchant)} className={selectedMerchant?._id === merchant._id ? 'selected-row' : ''}>
                                            <td>{merchant.merchantName}</td>
                                            <td>{merchant.merchantId}</td>
                                            <td>{merchant.mobileNumber}</td>
                                            <td>৳{merchant.balance?.toFixed(2)}</td>
                                            <td>
                                                <span className={`status-badge ${merchant.isActive ? 'status-active' : 'status-inactive'}`}>
                                                    {merchant.isActive ? 'Active' : 'Inactive'}
                                                </span>
                                            </td>
                                            <td className="action-buttons">
                                                {adminUser?.role === 'super_admin' && ( // Assuming only super_admin can toggle/delete
                                                    <>
                                                        <button onClick={(e) => {e.stopPropagation(); handleToggleActive(merchant._id, merchant.isActive);}} className={`action-btn ${merchant.isActive ? 'deactivate-btn' : 'activate-btn'}`} title={merchant.isActive ? "Deactivate" : "Activate"}>
                                                            {merchant.isActive ? '🛑' : '🟢'}
                                                        </button>
                                                        <button onClick={(e) => { e.stopPropagation(); handleDeleteMerchant(merchant._id); }} className="action-btn delete-btn" title="Delete Merchant">
                                                            🗑️
                                                        </button>
                                                    </>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr><td colSpan="6" style={{ textAlign: 'center' }}>No merchants found.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="admin-entity-details-panel">
                    {selectedMerchant ? (
                        <>
                            <div className="details-header">
                                <h3>{selectedMerchant.merchantName}</h3>
                                <span className={`status-badge ${selectedMerchant.isActive ? 'status-active' : 'status-inactive'}`}>{selectedMerchant.isActive ? 'Active' : 'Inactive'}</span>
                            </div>
                            <div className="details-body">
                                <p><strong>Merchant Ref ID:</strong> {selectedMerchant.merchantId}</p>
                                <p><strong>Mongo ID:</strong> {selectedMerchant._id}</p>
                                <p><strong>Mobile:</strong> {selectedMerchant.mobileNumber}</p>
                                <p><strong>Category:</strong> {selectedMerchant.category || 'N/A'}</p>
                                <p><strong>Balance:</strong> ৳{selectedMerchant.balance?.toFixed(2)}</p>
                                <p><strong>Created:</strong> {new Date(selectedMerchant.createdAt).toLocaleString()}</p>
                            </div>
                             <div className="details-actions">
                                {adminUser?.role === 'super_admin' && (
                                    <>
                                    <button onClick={() => handleToggleActive(selectedMerchant._id, selectedMerchant.isActive)} className={`admin-action-button ${selectedMerchant.isActive ? 'deactivate' : 'activate'}`}>
                                        {selectedMerchant.isActive ? 'Deactivate' : 'Activate'}
                                    </button>
                                    <button onClick={() => handleDeleteMerchant(selectedMerchant._id)} className="admin-action-button delete" style={{backgroundColor: '#ef4444', marginTop: '10px'}}>
                                        Delete Merchant
                                    </button>
                                    </>
                                )}
                                {/* Add Edit button here later */}
                            </div>
                        </>
                    ) : (
                        <p className="no-selection-message">Select a merchant from the list to view details.</p>
                    )}
                </div>
            </div>
        </div>
    );
}

export default AdminManageMerchantsPage;