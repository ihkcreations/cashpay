// client/src/index.js
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router } from 'react-router-dom'; // Import BrowserRouter
import './index.css';
import App from './App';
import { AuthProvider } from './context/AuthContext'; // Import AuthProvider
import { OtpDisplayProvider } from './context/OtpDisplayContext';


const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    {/* Wrap the Router around everything */}
    <Router>
      {/* Now AuthProvider and App are inside the Router context */}
      <AuthProvider>
        <OtpDisplayProvider> {/* Wrap App with OtpDisplayProvider */}
          <App />
        </OtpDisplayProvider>
      </AuthProvider>
    </Router>
  </React.StrictMode>
);
