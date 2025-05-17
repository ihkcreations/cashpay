// client/src/api/api.js
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  config => {
    // The AuthContext's generalLogin function sets the default Authorization header.
    // This interceptor simply uses whatever is set.
    return config;
  },
  error => {
    return Promise.reject(error);
  }
);

export default api;