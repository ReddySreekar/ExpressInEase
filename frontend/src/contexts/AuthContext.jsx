import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { loginUser, registerUser, getMe } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('eie_token'));
  const [loading, setLoading] = useState(true);

  const saveAuth = useCallback((tokenVal, userVal) => {
    setToken(tokenVal);
    setUser(userVal);
    if (tokenVal) {
      localStorage.setItem('eie_token', tokenVal);
    } else {
      localStorage.removeItem('eie_token');
    }
  }, []);

  // Check token validity on mount
  useEffect(() => {
    async function checkAuth() {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const data = await getMe(token);
        setUser(data.user);
      } catch (err) {
        // Token invalid — clear it
        saveAuth(null, null);
      } finally {
        setLoading(false);
      }
    }
    checkAuth();
  }, [token, saveAuth]);

  const login = async (username, password) => {
    const data = await loginUser(username, password);
    saveAuth(data.token, data.user);
    return data;
  };

  const register = async (username, password, referralCode) => {
    const data = await registerUser(username, password, referralCode);
    saveAuth(data.token, data.user);
    return data;
  };

  const logout = () => {
    saveAuth(null, null);
  };

  const value = {
    user,
    token,
    loading,
    isLoggedIn: !!user,
    isAdmin: user?.role === 'admin',
    login,
    register,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
