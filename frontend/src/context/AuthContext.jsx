import { createContext, useContext, useEffect, useState } from 'react';
import { getToken, removeToken } from '../services/api';
import { login as loginService, fetchCurrentUser } from '../services/authService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const token = getToken();
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const currentUser = await fetchCurrentUser();
        setUser(currentUser);
      } catch (err) {
        if (err.status === 401) {
          removeToken();
          setUser(null);
        }
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (email, password) => {
    const data = await loginService(email, password);
    // data contains user and token; fetchCurrentUser is source of truth, but we can set from login response
    if (data.user) {
      setUser(data.user);
    } else {
      // fallback to fetch
      try {
        const currentUser = await fetchCurrentUser();
        setUser(currentUser);
      } catch {}
    }
    return data;
  };

  const logout = () => {
    removeToken();
    setUser(null);
  };

  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    login,
    logout
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
