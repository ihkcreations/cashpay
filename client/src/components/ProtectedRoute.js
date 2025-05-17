import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = () => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div style={{padding: '50px', textAlign: 'center', fontSize: '18px'}}>Loading User Session...</div>;
  }

  if (!user || user.role !== 'user') { // Strictly 'user'
    return <Navigate to="/" state={{ from: location }} replace />;
  }
  if (!user.name || !user.dateOfBirth) { // Profile completion
    if (location.pathname !== '/app/complete-profile') {
        return <Navigate to="/app/complete-profile" state={{ from: location }} replace />;
    }
  }
  return <Outlet />;
};
export default ProtectedRoute;