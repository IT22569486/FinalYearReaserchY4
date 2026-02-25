import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // On mount, check localStorage for existing session
  useEffect(() => {
    const stored = localStorage.getItem('ctb_user');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setUser(parsed);
        // Set auth header for future requests
        api.defaults.headers.common['Authorization'] = `Bearer ${parsed.token}`;
      } catch {
        localStorage.removeItem('ctb_user');
      }
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const response = await api.post('/api/user/login', { email, password });
    const userData = response.data;
    // Ensure role defaults to admin for dashboard users
    const userWithRole = { ...userData, role: userData.role || 'admin' };
    setUser(userWithRole);
    localStorage.setItem('ctb_user', JSON.stringify(userWithRole));
    api.defaults.headers.common['Authorization'] = `Bearer ${userWithRole.token}`;
    return userWithRole;
  };

  const register = async (name, email, password) => {
    const response = await api.post('/api/user/register', { name, email, password });
    const userData = response.data;
    const userWithRole = { ...userData, role: userData.role || 'admin' };
    setUser(userWithRole);
    localStorage.setItem('ctb_user', JSON.stringify(userWithRole));
    api.defaults.headers.common['Authorization'] = `Bearer ${userWithRole.token}`;
    return userWithRole;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('ctb_user');
    delete api.defaults.headers.common['Authorization'];
  };

  const isAdmin = user?.role === 'admin';

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export default AuthContext;
