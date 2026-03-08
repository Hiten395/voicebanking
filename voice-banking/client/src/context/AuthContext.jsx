import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../utils/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

// Helper to decode JWT payload without external library
const decodeJwt = (token) => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function (c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);

  // Set token in axios defaults
  useEffect(() => {
    if (accessToken) {
      api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
      localStorage.setItem('vb_token', accessToken);
    } else {
      delete api.defaults.headers.common['Authorization'];
      localStorage.removeItem('vb_token');
    }
  }, [accessToken]);

  // Auto-logout timer based on JWT expiration
  useEffect(() => {
    let timeoutId = null;
    if (accessToken) {
      const payload = decodeJwt(accessToken);
      if (payload && payload.exp) {
        const expiresInMs = (payload.exp * 1000) - Date.now();
        if (expiresInMs > 0) {
          timeoutId = setTimeout(() => {
            window.dispatchEvent(new Event('auth:unauthorized'));
          }, expiresInMs);
        } else {
          // Already expired
          window.dispatchEvent(new Event('auth:unauthorized'));
        }
      }
    }
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [accessToken]);

  // Restore token from localStorage on mount
  useEffect(() => {
    const storedToken = localStorage.getItem('vb_token');
    if (storedToken) {
      api.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
      setAccessToken(storedToken);
      // Verify token is still valid by fetching profile
      api.get('/user/profile')
        .then(res => setUser(res.data.user))
        .catch(() => {
          // Token expired or invalid
          delete api.defaults.headers.common['Authorization'];
          localStorage.removeItem('vb_token');
          setAccessToken(null);
          setUser(null);
          setSessionExpired(true);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = useCallback((tokenData) => {
    api.defaults.headers.common['Authorization'] = `Bearer ${tokenData.accessToken}`;
    setAccessToken(tokenData.accessToken);
    setUser(tokenData.user);
    setSessionExpired(false);
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Ignore errors on logout
    }
    delete api.defaults.headers.common['Authorization'];
    localStorage.removeItem('vb_token');
    setAccessToken(null);
    setUser(null);
    setSessionExpired(false);
  }, []);

  // Listen for 401 events dispatched from the API interceptor
  useEffect(() => {
    const handleUnauthorized = () => {
      delete api.defaults.headers.common['Authorization'];
      localStorage.removeItem('vb_token');
      setAccessToken(null);
      setUser(null);
      setSessionExpired(true);
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, []);

  const clearSessionExpired = () => setSessionExpired(false);

  return (
    <AuthContext.Provider value={{
      user,
      accessToken,
      isAuthenticated: !!accessToken,
      loading,
      sessionExpired,
      clearSessionExpired,
      login,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  );
};
