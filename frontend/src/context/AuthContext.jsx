import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      // Configurar header de auth para todas las peticiones
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      api.get('/me')
        .then(res => setUser(res.data))
        .catch(() => {
          localStorage.removeItem('token');
          delete api.defaults.headers.common['Authorization'];
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const res = await api.post('/login', { email, password });
    const { token, user: userData } = res.data;

    localStorage.setItem('token', token);
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    setUser(userData);
  };

  const logout = async () => {
    try {
      await api.post('/logout');
    } catch {
      // Ignore — token might be expired
    }
    localStorage.removeItem('token');
    delete api.defaults.headers.common['Authorization'];
    setUser(null);
  };

  // Para uso directo en Register (sin re-fetch)
  const setUserDirect = (userData) => {
    setUser(userData);
  };

  const refreshUser = async () => {
    try {
      const res = await api.get('/me');
      setUser(res.data);
    } catch (err) {
      console.error('Error refreshing user', err);
    }
  };

  const isOwner      = user?.role === 'owner';
  const isSecretario = user?.role === 'secretario';
  const isInstructor = user?.role === 'instructor';

  return (
    <AuthContext.Provider value={{ 
      user, 
      login, 
      logout, 
      loading, 
      setUserDirect, 
      refreshUser,
      isOwner,
      isSecretario,
      isInstructor
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);