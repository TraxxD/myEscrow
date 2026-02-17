import { useState, useEffect, useCallback } from 'react';
import * as api from '../services/api';

export default function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [error, setError] = useState(null);

  // On mount: check for existing token and validate it
  useEffect(() => {
    const token = api.getToken();
    if (!token) {
      setInitializing(false);
      return;
    }

    api.getWalletBalance()
      .then((data) => {
        // Token is valid — decode user info from token payload
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUser({
          id: payload.id,
          username: payload.username,
          email: payload.email,
          walletBalance: data.balance,
        });
      })
      .catch(() => {
        // Token invalid or expired
        api.clearToken();
      })
      .finally(() => setInitializing(false));
  }, []);

  const login = useCallback(async (email, password) => {
    setError(null);
    setLoading(true);
    try {
      const data = await api.login(email, password);
      setUser(data.user);
      return data.user;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const register = useCallback(async (username, email, password) => {
    setError(null);
    setLoading(true);
    try {
      const data = await api.register(username, email, password);
      setUser(data.user);
      return data.user;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    api.clearToken();
    setUser(null);
    setError(null);
  }, []);

  // Quick demo login: register first, fall back to login if already exists
  const demoLogin = useCallback(async (username, email, password) => {
    setError(null);
    setLoading(true);
    try {
      const data = await api.register(username, email, password);
      setUser(data.user);
      return data.user;
    } catch (regErr) {
      // Already registered — try login instead
      try {
        const data = await api.login(email, password);
        setUser(data.user);
        return data.user;
      } catch (loginErr) {
        setError(loginErr.message);
        throw loginErr;
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshBalance = useCallback(async () => {
    try {
      const data = await api.getWalletBalance();
      setUser((prev) => prev ? { ...prev, walletBalance: data.balance } : prev);
    } catch {
      // silently fail
    }
  }, []);

  return { user, loading, initializing, error, login, register, logout, demoLogin, refreshBalance, setError };
}
