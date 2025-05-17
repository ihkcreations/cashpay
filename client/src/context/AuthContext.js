// client/src/context/AuthContext.js
import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../api/api';
import { useNavigate, useLocation } from 'react-router-dom';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null); // Single user state for whoever is logged in
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    let isMounted = true;
    const rehydrateAuth = async () => {
      if (!isMounted) return;
      setLoading(true);

      const adminToken = localStorage.getItem('adminToken');
      const userToken = localStorage.getItem('token'); // For regular users/agents

      let tokenToUse = null;
      let profileEndpoint = '';
      let entityType = '';
      let currentTokenKey = ''; // To know which token to remove on failure

      // Prioritize admin token if on an admin path or if it's the only one present
      if (location.pathname.startsWith('/admin') && adminToken) {
          tokenToUse = adminToken;
          profileEndpoint = '/admin/auth/profile';
          entityType = 'Admin';
          currentTokenKey = 'adminToken';
      } else if (userToken) { // Fallback to user/agent token for non-admin paths
          tokenToUse = userToken;
          profileEndpoint = '/auth/profile'; // Generic profile endpoint for user/agent
          entityType = 'User/Agent';
          currentTokenKey = 'token';
      } else if (adminToken) { // If not on admin path but only admin token exists
          tokenToUse = adminToken;
          profileEndpoint = '/admin/auth/profile';
          entityType = 'Admin (fallback)';
          currentTokenKey = 'adminToken';
      }


      if (tokenToUse && profileEndpoint) {
        
        // Temporarily set token for this API call for rehydration
        const originalAuthHeader = api.defaults.headers.common['Authorization'];
        api.defaults.headers.common['Authorization'] = `Bearer ${tokenToUse}`;
        try {
          const { data } = await api.get(profileEndpoint);
          
          if (isMounted) setUser(data); // data should include the role
        } catch (error) {
          console.error(`[AuthContext - Rehydrate] ${entityType} token invalid or profile fetch failed:`, error.response?.data?.message || error.message);
          localStorage.removeItem(currentTokenKey);
          if (isMounted) setUser(null);
        } finally {
            // Restore original or delete if it wasn't set
            if (originalAuthHeader) {
                api.defaults.headers.common['Authorization'] = originalAuthHeader;
            } else {
                delete api.defaults.headers.common['Authorization'];
            }
        }
      } else {
        
        if (isMounted) setUser(null);
      }
      if (isMounted) setLoading(false);
    };

    rehydrateAuth();
    return () => { isMounted = false; };
  }, [location.pathname]); // Re-check on path changes

  // Unified Login - components will call this and then navigate
  const generalLogin = async (loginApiCall, tokenStorageKey, credentials) => {
    setLoading(true);
    try {
        const { data } = await loginApiCall(credentials);
        localStorage.setItem(tokenStorageKey, data.token);
        api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
        setUser(data);
        setLoading(false);
        return data;
    } catch (error) {
        localStorage.removeItem(tokenStorageKey);
        delete api.defaults.headers.common['Authorization'];
        setUser(null);
        setLoading(false);
        throw error; // Re-throw for component to handle
    }
  };

  const logout = (navigateTo = '/') => {
    // GOOD: Simple log message
    
    localStorage.removeItem('token');
    localStorage.removeItem('adminToken');
    delete api.defaults.headers.common['Authorization'];
    setUser(null); // Set user to null BEFORE navigation if possible
    navigate(navigateTo);
  };

  const updateUser = (userData) => {
    
    setUser(prev => ({ ...prev, ...userData }));
  };

  const contextValue = {
    user, // This will be the currently active user, agent, OR admin
    loading,
    generalLogin,
    logout,
    updateUser,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {loading && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999, fontSize: '18px', color: '#333' }}>
          <p>Initializing App Session...</p>
        </div>
      )}
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};