import { useState, useEffect } from 'react';
import { authApi } from '../services/api';

export const useAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authMethod, setAuthMethod] = useState(null);
  const [keycloakEnabled, setKeycloakEnabled] = useState(false);

  const checkAuthStatus = async () => {
    try {
      const data = await authApi.checkStatus();
      
      setKeycloakEnabled(data.keycloakEnabled || false);
      setAuthMethod(data.authMethod);
      
      if (data.authenticated) {
        setIsAuthenticated(true);
        setUser(data.user);
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

  const logout = async () => {
    try {
      if (keycloakEnabled && authMethod === 'keycloak') {
        // Redirect to Keycloak logout
        window.location.href = '/auth/keycloak/logout';
      } else {
        // Local logout
        await authApi.logout();
        setIsAuthenticated(false);
        setUser(null);
      }
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const loginWithKeycloak = () => {
    window.location.href = '/auth/keycloak/login';
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
    authMethod,
    keycloakEnabled,
    login,
    logout,
    loginWithKeycloak,
    changePassword
  };
};