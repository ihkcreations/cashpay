import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const AgentProtectedRoute = () => {
  const { user, loading } = useAuth(); // 'user' state will hold agent data
  const location = useLocation();

  if (loading) {
    return <div style={{padding: '50px', textAlign: 'center', fontSize: '18px'}}>Loading Agent Session...</div>;
  }

  if (!user || user.role !== 'agent' || !user.isActive) {
    return <Navigate to="/agent/login" state={{ from: location }} replace />;
  }
  return <Outlet />;
};
export default AgentProtectedRoute;