// client/src/pages/admin/AdminAddAgentPage.js
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../api/api';

function AdminAddAgentPage() {
    const [formData, setFormData] = useState({
        name: '',
        shopName: '',
        district: '',
        area: '',
        nidNumber: '',
        mobileNumber: '',
        initialBalance: '0',
        pin: '',
        confirmPin: ''
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

        if (formData.pin !== formData.confirmPin) {
            setError("PINs do not match.");
            return;
        }
        // Add other client-side validations from your Agent model requirements
        if (!formData.name || !formData.shopName || !formData.district || !formData.area || !formData.nidNumber || !formData.mobileNumber || !formData.pin) {
            setError("All fields are required.");
            return;
        }
         if (formData.pin.length !== 5) {
            setError("PIN must be 5 digits.");
            return;
        }

        setLoading(true);
        try {
            const payload = {
                name: formData.name,
                shopName: formData.shopName,
                district: formData.district,
                area: formData.area,
                nidNumber: formData.nidNumber,
                mobileNumber: formData.mobileNumber,
                initialBalance: parseFloat(formData.initialBalance) || 0,
                pin: formData.pin
            };
            const { data } = await api.post('/admin/data/agents', payload);
            setMessage(`Agent "${data.shopName}" created successfully! Redirecting...`);
            setTimeout(() => {
                navigate('/admin/dashboard/agents');
            }, 2000);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to create agent.');
        }
        setLoading(false);
    };

    return (
        <div className="admin-add-entity-page"> {/* Reusing class name if styles are similar */}
            <div className="admin-page-header">
                <h1>Add New Agent</h1>
                <Link to="/admin/dashboard/agents" className="admin-back-button">
                    <span>←</span> Back to Agents List
                </Link>
            </div>

            {error && <p className="admin-error-message main-error">{error}</p>}
            {message && <p className="admin-success-message main-success">{message}</p>}

            <form onSubmit={handleSubmit} className="admin-form-card wider-card">
                <div className="admin-input-group">
                    <label htmlFor="shopName">Shop Name</label>
                    <input type="text" name="shopName" id="shopName" className="admin-input" value={formData.shopName} onChange={handleChange} required />
                </div>
                <div style={{display: 'flex', gap: '15px'}}>
                    <div className="admin-input-group" style={{flex: 1}}>
                        <label htmlFor="district">District</label>
                        <input type="text" name="district" id="district" className="admin-input" value={formData.district} onChange={handleChange} required />
                    </div>
                    <div className="admin-input-group" style={{flex: 1}}>
                        <label htmlFor="area">Area</label>
                        <input type="text" name="area" id="area" className="admin-input" value={formData.area} onChange={handleChange} required />
                    </div>
                </div>
                <div className="admin-input-group">
                    <label htmlFor="name">Contact Person Name</label>
                    <input type="text" name="name" id="name" className="admin-input" value={formData.name} onChange={handleChange} required />
                </div>
                <div className="admin-input-group">
                    <label htmlFor="mobileNumber">Mobile Number (+8801...)</label>
                    <input type="text" name="mobileNumber" id="mobileNumber" className="admin-input" value={formData.mobileNumber} onChange={handleChange} required placeholder="01XXXXXXXXX"/>
                </div>
                <div className="admin-input-group">
                    <label htmlFor="nidNumber">NID Number</label>
                    <input type="text" name="nidNumber" id="nidNumber" className="admin-input" value={formData.nidNumber} onChange={handleChange} required />
                </div>
                <div style={{display: 'flex', gap: '15px'}}>
                    <div className="admin-input-group" style={{flex: 1}}>
                        <label htmlFor="initialBalance">Initial Balance (৳)</label>
                        <input type="number" name="initialBalance" id="initialBalance" className="admin-input" value={formData.initialBalance} onChange={handleChange} min="0" step="0.01" />
                    </div>
                    <div className="admin-input-group" style={{flex: 1}}>
                        <label htmlFor="pin">Set 5-Digit PIN</label>
                        <input type="password" name="pin" id="pin" className="admin-input" value={formData.pin} onChange={handleChange} required maxLength="5" />
                    </div>
                </div>
                 <div className="admin-input-group">
                    <label htmlFor="confirmPin">Confirm PIN</label>
                    <input type="password" name="confirmPin" id="confirmPin" className="admin-input" value={formData.confirmPin} onChange={handleChange} required maxLength="5" />
                </div>

                <button type="submit" className="admin-submit-button main-action" disabled={loading}>
                    {loading ? 'Creating...' : 'Create New Agent'}
                </button>
            </form>
        </div>
    );
}

export default AdminAddAgentPage;