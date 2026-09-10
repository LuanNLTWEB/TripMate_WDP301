import { useState, useEffect } from 'react';
import { AuthContext } from './AuthContext';
import { authApi, getToken, setAuthData, clearAuthData } from '../services/api';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const storedUser = localStorage.getItem('user') || sessionStorage.getItem('user');
      return storedUser ? JSON.parse(storedUser) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => getToken());

  // Initialize / verify auth state on mount if token exists
  useEffect(() => {
    const currentToken = getToken();
    if (!currentToken) return;

    let isMounted = true;
    authApi.getMe()
      .then((response) => {
        if (isMounted && response.success && response.user) {
          setUser(response.user);
          setToken(currentToken);
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.warn('Session verification failed:', err.message);
          clearAuthData();
          setUser(null);
          setToken(null);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  /**
   * Login user with credentials
   */
  const login = async (email, password, rememberMe = true) => {
    const response = await authApi.login({ email, password });
    
    if (response.success) {
      setAuthData(response.token, response.user, rememberMe);
      setUser(response.user);
      setToken(response.token);
      return response;
    }
    
    throw new Error(response.message || 'Đăng nhập thất bại');
  };

  /**
   * Register user (does not auto login)
   */
  const register = async (userData) => {
    const response = await authApi.register(userData);
    
    if (response.success) {
      return response;
    }
    
    throw new Error(response.message || 'Đăng ký thất bại');
  };

  /**
   * Logout user
   */
  const logout = () => {
    clearAuthData();
    setUser(null);
    setToken(null);
  };

  /**
   * Update user profile and synchronize state
   */
  const updateProfile = async (profileData) => {
    const response = await authApi.updateProfile(profileData);
    
    if (response.success && response.user) {
      setUser(response.user);
      if (localStorage.getItem('token')) {
        localStorage.setItem('user', JSON.stringify(response.user));
      } else if (sessionStorage.getItem('token')) {
        sessionStorage.setItem('user', JSON.stringify(response.user));
      }
      return response;
    }
    
    throw new Error(response.message || 'Cập nhật thông tin thất bại');
  };

  const value = {
    user,
    token,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    updateProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;
