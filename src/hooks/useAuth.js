import { useState, useEffect } from 'react';
import { authApi } from '../services/api';

export const useAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkAuthStatus = async () => {
    try {
      const data = await authApi.checkStatus();
      console.log('🔐 Auth status response:', data);
      
      if (data.authenticated) {
        setIsAuthenticated(true);
        setUser(data.user);
        console.log('🔐 User set in useAuth:', data.user);
      } else {
        setIsAuthenticated(false);
        setUser(null);
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (credentials) => {
    try {
      const { response, data } = await authApi.login(credentials);

      if (response.ok) {
        setIsAuthenticated(true);
        setUser(data.user);
        return { success: true };
      } else {
        return { success: false, error: data.error || 'Login failed' };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Connection error' };
    }
  };

  const logout = async (authMethod = 'local') => {
    try {
      await authApi.logout(authMethod);
      if (authMethod === 'local') {
        setIsAuthenticated(false);
        setUser(null);
      }
      // Per Keycloak, il redirect è gestito dall'API
    } catch (error) {
      console.error('Logout error:', error);
      // Forza logout locale in caso di errore
      setIsAuthenticated(false);
      setUser(null);
    }
  };

  const changePassword = async (passwordData) => {
    try {
      const { response, data } = await authApi.changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });

      if (response.ok) {
        return { success: true, message: 'Password changed successfully!' };
      } else {
        return { success: false, error: data.error || 'Error changing password' };
      }
    } catch (error) {
      return { success: false, error: 'Connection error' };
    }
  };

  useEffect(() => {
    checkAuthStatus();
  }, []);

  return {
    isAuthenticated,
    user,
    isLoading,
    login,
    logout,
    changePassword
  };
};