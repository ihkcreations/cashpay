import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const AdminProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth(); // 'user' state will hold admin data
  const location = useLocation();

  if (loading) {
    return <div style={{padding: '50px', textAlign: 'center', fontSize: '18px'}}>Loading Admin Session...</div>;
  }

  if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }
  // if (user && user.role === 'admin' && !user.isActive) { ... } // Optional active check

  return children;
};
export default AdminProtectedRoute;