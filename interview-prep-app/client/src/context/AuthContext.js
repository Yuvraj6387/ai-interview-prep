import React, { createContext, useState, useContext, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

const CACHED_USER_KEY = 'cachedUser';

const readCachedUser = () => {
  try {
    const raw = localStorage.getItem(CACHED_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    return null;
  }
};

const writeCachedUser = (user) => {
  try {
    localStorage.setItem(CACHED_USER_KEY, JSON.stringify(user));
  } catch (error) {
    // Storage full or blocked - the app still works, it just re-fetches.
  }
};

const clearSession = () => {
  localStorage.removeItem('token');
  localStorage.removeItem(CACHED_USER_KEY);
};

// Only trust the cached user if we still hold a token to go with it.
const initialUser = () => (localStorage.getItem('token') ? readCachedUser() : null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(initialUser);
  // Only block the whole app on the very first sign-in on this device. After
  // that we paint from the cached user straight away and confirm it in the
  // background, instead of holding a full-screen spinner for a round trip to a
  // free-tier backend that may still be waking up.
  const [loading, setLoading] = useState(() => !!localStorage.getItem('token') && !readCachedUser());

  useEffect(() => {
    if (!localStorage.getItem('token')) {
      setLoading(false);
      return;
    }
    loadUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadUser = async () => {
    try {
      const response = await authAPI.getCurrentUser();
      writeCachedUser(response.data.user);
      setUser(response.data.user);
    } catch (error) {
      // Only an actually rejected token should sign someone out. A timeout or a
      // network blip used to drop them back to the landing page mid-session.
      if (error.response?.status === 401) {
        clearSession();
        setUser(null);
      } else {
        console.error('Failed to refresh user:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const response = await authAPI.login({ email, password });
    localStorage.setItem('token', response.data.token);
    writeCachedUser(response.data.user);
    setUser(response.data.user);
    return response.data;
  };

  const register = async (userData) => {
    const response = await authAPI.register(userData);
    localStorage.setItem('token', response.data.token);
    writeCachedUser(response.data.user);
    setUser(response.data.user);
    return response.data;
  };

  const googleLogin = async (credential) => {
    const response = await authAPI.google(credential);
    localStorage.setItem('token', response.data.token);
    writeCachedUser(response.data.user);
    setUser(response.data.user);
    return response.data;
  };

  const updateProfileImage = async (profileImage) => {
    const response = await authAPI.updateProfileImage(profileImage);
    writeCachedUser(response.data.user);
    setUser(response.data.user);
  };

  const logout = () => {
    clearSession();
    setUser(null);
  };

  const value = {
    user,
    loading,
    login,
    register,
    googleLogin,
    updateProfileImage,
    logout,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
