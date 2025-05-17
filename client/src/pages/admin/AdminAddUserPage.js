// client/src/pages/admin/AdminAddUserPage.js
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../api/api';
import '../../styles/Admin.css'; // If not global

function AdminAddUserPage() {
    const [name, setName] = useState('');
    const [dateOfBirth, setDateOfBirth] = useState('');
    const [mobileNumber, setMobileNumber] = useState('');
    const [initialBalance, setInitialBalance] = useState('0');
    const [pin, setPin] = useState('');
    const [confirmPin, setConfirmPin] = useState(''); // For PIN confirmation
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');

        if (pin !== confirmPin) {
            setError("PINs do not match.");
            return;
        }
        // Add more client-side validations as needed (e.g., mobile format, PIN length)
        if (!name || !dateOfBirth || !mobileNumber || !pin ) {
            setError("All fields except initial balance are required.");
            return;
        }
        if (pin.length !== 5) {
            setError("PIN must be 5 digits.");
            return;
        }


        setLoading(true);
        try {
            const payload = {
                name,
                dateOfBirth,
                mobileNumber,
                initialBalance: parseFloat(initialBalance) || 0,
                pin
            };
            const { data } = await api.post('/admin/data/users', payload); // API to create user
            setMessage(`User "${data.name}" created successfully! Redirecting to users list...`);
            // Clear form or navigate away
            setTimeout(() => {
                navigate('/admin/dashboard/users'); // Navigate back to the users list
            }, 2000);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to create user.');
        }
        setLoading(false);
    };

    return (
        // This page will also be rendered within the main admin content area
        <div className="admin-add-user-page">
             <div className="admin-page-header">
                <h1>Add New User</h1>
                <Link to="/admin/dashboard/users" className="admin-back-button">
                    {/* Back icon (e.g., SVG or font icon) */}
                    <span>←</span> Go Back to Users List
                </Link>
            </div>

            {error && <p className="admin-error-message main-error">{error}</p>}
            {message && <p className="admin-success-message main-success">{message}</p>}

            <form onSubmit={handleSubmit} className="admin-form-card wider-card"> {/* Can reuse/extend form card style */}
                <div className="admin-input-group">
                    <label htmlFor="name">Full Name</label>
                    <input type="text" id="name" className="admin-input" value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
                <div className="admin-input-group">
                    <label htmlFor="dateOfBirth">Date of Birth</label>
                    <input type="date" id="dateOfBirth" className="admin-input" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} required />
                </div>
                <div className="admin-input-group">
                    <label htmlFor="mobileNumber">Mobile Number (+8801...)</label>
                    <input type="text" id="mobileNumber" className="admin-input" value={mobileNumber} onChange={(e) => setMobileNumber(e.target.value)} required placeholder="01XXXXXXXXX" />
                </div>
                <div className="admin-input-group">
                    <label htmlFor="initialBalance">Initial Balance (৳)</label>
                    <input type="number" id="initialBalance" className="admin-input" value={initialBalance} onChange={(e) => setInitialBalance(e.target.value)} min="0" step="0.01" />
                </div>
                <div className="admin-input-group">
                    <label htmlFor="pin">Set 5-Digit PIN</label>
                    <input type="password" id="pin" className="admin-input" value={pin} onChange={(e) => setPin(e.target.value)} required maxLength="5" />
                </div>
                 <div className="admin-input-group">
                    <label htmlFor="confirmPin">Confirm PIN</label>
                    <input type="password" id="confirmPin" className="admin-input" value={confirmPin} onChange={(e) => setConfirmPin(e.target.value)} required maxLength="5" />
                </div>

                <button type="submit" className="admin-submit-button main-action" disabled={loading}>
                    {loading ? 'Creating...' : 'Create New User'}
                </button>
            </form>
        </div>
    );
}

export default AdminAddUserPage;