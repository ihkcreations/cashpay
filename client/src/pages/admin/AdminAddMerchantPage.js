// client/src/pages/admin/AdminAddMerchantPage.js
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../api/api';

function AdminAddMerchantPage() {
    const [formData, setFormData] = useState({
        merchantName: '',
        merchantId: '', // Custom unique ID
        mobileNumber: '',
        category: '',
        initialBalance: '0'
    });
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');

        if (!formData.merchantName || !formData.merchantId || !formData.mobileNumber) {
            setError("Merchant Name, Merchant ID, and Mobile Number are required.");
            return;
        }
        // Add more specific validations if needed

        setLoading(true);
        try {
            const payload = {
                ...formData,
                initialBalance: parseFloat(formData.initialBalance) || 0,
            };
            const { data } = await api.post('/admin/data/merchants', payload);
            setMessage(`Merchant "${data.merchantName}" created successfully! Redirecting...`);
            setTimeout(() => {
                navigate('/admin/dashboard/merchants');
            }, 2000);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to create merchant.');
        }
        setLoading(false);
    };

    return (
        <div className="admin-add-entity-page">
            <div className="admin-page-header">
                <h1>Add New Merchant</h1>
                <Link to="/admin/dashboard/merchants" className="admin-back-button">
                    <span>←</span> Back to Merchants List
                </Link>
            </div>

            {error && <p className="admin-error-message main-error">{error}</p>}
            {message && <p className="admin-success-message main-success">{message}</p>}

            <form onSubmit={handleSubmit} className="admin-form-card wider-card">
                <div className="admin-input-group">
                    <label htmlFor="merchantName">Merchant Name</label>
                    <input type="text" name="merchantName" id="merchantName" className="admin-input" value={formData.merchantName} onChange={handleChange} required />
                </div>
                <div className="admin-input-group">
                    <label htmlFor="merchantId">Merchant ID (Unique)</label>
                    <input type="text" name="merchantId" id="merchantId" className="admin-input" value={formData.merchantId} onChange={handleChange} required />
                </div>
                <div className="admin-input-group">
                    <label htmlFor="mobileNumber">Contact Mobile Number</label>
                    <input type="text" name="mobileNumber" id="mobileNumber" className="admin-input" value={formData.mobileNumber} onChange={handleChange} required placeholder="01XXXXXXXXX" />
                </div>
                <div className="admin-input-group">
                    <label htmlFor="category">Category (e.g., E-commerce, Retail)</label>
                    <input type="text" name="category" id="category" className="admin-input" value={formData.category} onChange={handleChange} />
                </div>
                <div className="admin-input-group">
                    <label htmlFor="initialBalance">Initial Balance (৳)</label>
                    <input type="number" name="initialBalance" id="initialBalance" className="admin-input" value={formData.initialBalance} onChange={handleChange} min="0" step="0.01" />
                </div>

                <button type="submit" className="admin-submit-button main-action" disabled={loading}>
                    {loading ? 'Creating...' : 'Create New Merchant'}
                </button>
            </form>
        </div>
    );
}

export default AdminAddMerchantPage;