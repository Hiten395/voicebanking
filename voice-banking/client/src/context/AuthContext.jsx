import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../utils/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Set token in axios defaults
  useEffect(() => {
    if (accessToken) {
      api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
    } else {
      delete api.defaults.headers.common['Authorization'];
    }
  }, [accessToken]);

  // Try silent refresh on mount
  useEffect(() => {
    const silentRefresh = async () => {
      try {
        const res = await api.post('/auth/refresh');
        api.defaults.headers.common['Authorization'] = `Bearer ${res.data.accessToken}`;
        setAccessToken(res.data.accessToken);
        setUser(res.data.user);
      } catch {
        // Not logged in — that's fine
      } finally {
        setLoading(false);
      }
    };
    silentRefresh();
  }, []);

  const login = useCallback((tokenData) => {
    api.defaults.headers.common['Authorization'] = `Bearer ${tokenData.accessToken}`;
    setAccessToken(tokenData.accessToken);
    setUser(tokenData.user);
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Ignore errors on logout
    }
    delete api.defaults.headers.common['Authorization'];
    setAccessToken(null);
    setUser(null);
  }, []);

  const refreshToken = useCallback(async () => {
    try {
      const res = await api.post('/auth/refresh');
      api.defaults.headers.common['Authorization'] = `Bearer ${res.data.accessToken}`;
      setAccessToken(res.data.accessToken);
      setUser(res.data.user);
      return res.data.accessToken;
    } catch {
      delete api.defaults.headers.common['Authorization'];
      setAccessToken(null);
      setUser(null);
      return null;
    }
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      accessToken,
      isAuthenticated: !!accessToken,
      loading,
      login,
      logout,
      refreshToken
    }}>
      {children}
    </AuthContext.Provider>
  );
};
