// client/src/pages/admin/AdminAddAdminPage.js
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../api/api';

function AdminAddAdminPage() {
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        confirmPassword: '',
        name: '' // Admin's full name
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

        if (formData.password !== formData.confirmPassword) {
            setError("Passwords do not match.");
            return;
        }
        if (!formData.username || !formData.password || !formData.name) {
            setError("Username, password, and name are required.");
            return;
        }
        if (formData.password.length < 6) {
            setError("Password must be at least 6 characters.");
            return;
        }

        setLoading(true);
        try {
            const payload = {
                username: formData.username,
                password: formData.password,
                name: formData.name
            };
            // This API is for super_admin to create a regular admin directly
            const { data } = await api.post('/admin/data/admins', payload);
            setMessage(`Admin account "${data.username}" created successfully! Redirecting...`);
            setTimeout(() => {
                navigate('/admin/dashboard/admins');
            }, 2000);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to create admin account.');
        }
        setLoading(false);
    };

    return (
        <div className="admin-add-entity-page">
            <div className="admin-page-header">
                <h1>Add New Admin</h1>
                <Link to="/admin/dashboard/admins" className="admin-back-button">
                    <span>←</span> Back to Admins List
                </Link>
            </div>

            {error && <p className="admin-error-message main-error">{error}</p>}
            {message && <p className="admin-success-message main-success">{message}</p>}

            <form onSubmit={handleSubmit} className="admin-form-card wider-card">
                <div className="admin-input-group">
                    <label htmlFor="name">Admin's Full Name</label>
                    <input type="text" name="name" id="name" className="admin-input" value={formData.name} onChange={handleChange} required />
                </div>
                <div className="admin-input-group">
                    <label htmlFor="username">Set Username</label>
                    <input type="text" name="username" id="username" className="admin-input" value={formData.username} onChange={handleChange} required />
                </div>
                <div className="admin-input-group">
                    <label htmlFor="password">Set Password</label>
                    <input type="password" name="password" id="password" className="admin-input" value={formData.password} onChange={handleChange} required />
                </div>
                <div className="admin-input-group">
                    <label htmlFor="confirmPassword">Confirm Password</label>
                    <input type="password" name="confirmPassword" id="confirmPassword" className="admin-input" value={formData.confirmPassword} onChange={handleChange} required />
                </div>

                <button type="submit" className="admin-submit-button main-action" disabled={loading}>
                    {loading ? 'Creating...' : 'Create New Admin'}
                </button>
            </form>
        </div>
    );
}

export default AdminAddAdminPage;