import axios from 'axios';

const BASE_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:8000';

const axiosInstance = axios.create({
  baseURL: `${BASE_URL}/api`,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
  // Allow sending httpOnly cookies (if backend sets them) for improved security
  withCredentials: true,
});

// Request interceptor
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    const isLoginRequest = error.config?.url && (error.config.url.endsWith('/user/login') || error.config.url.endsWith('user/login'));
    if (error.response?.status === 401 && !isLoginRequest) {
      localStorage.removeItem('token');
      try {
        axios.post(`${BASE_URL}/api/user/logout`, {}, { withCredentials: true }).catch(() => {})
      } catch {
        // ignore logout errors
      }
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
