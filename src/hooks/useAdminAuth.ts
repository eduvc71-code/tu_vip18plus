import { useState, useEffect, useCallback } from 'react';

export interface UseAdminAuthReturn {
  token: string;
  isAuthenticated: boolean;
  authChecked: boolean;
  pinInput: string;
  loginError: string;
  loading: boolean;
  setPinInput: (pin: string) => void;
  handleLoginWithPin: (e?: React.FormEvent) => Promise<string | null>;
  handleLogout: () => void;
  verifyAndAuthenticate: (tok: string) => Promise<boolean>;
}

export interface UseAdminAuthOptions {
  isOpen: boolean;
  onLoginSuccess?: (token: string) => void | Promise<void>;
}

export const useAdminAuth = ({
  isOpen,
  onLoginSuccess
}: UseAdminAuthOptions): UseAdminAuthReturn => {
  const [token, setToken] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loading, setLoading] = useState(false);

  const verifyAndAuthenticate = useCallback(async (tok: string): Promise<boolean> => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: tok })
      });
      const data = await res.json();
      if (res.ok && data.valid) {
        setToken(tok);
        setIsAuthenticated(true);
        try { localStorage.setItem('danii_admin_token', tok); } catch {}
        if (onLoginSuccess) {
          void onLoginSuccess(tok);
        }
        return true;
      } else {
        setIsAuthenticated(false);
        try { localStorage.removeItem('danii_admin_token'); } catch {}
        return false;
      }
    } catch {
      setIsAuthenticated(false);
      return false;
    } finally {
      setAuthChecked(true);
      setLoading(false);
    }
  }, [onLoginSuccess]);

  const handleLoginWithPin = useCallback(async (e?: React.FormEvent): Promise<string | null> => {
    if (e) e.preventDefault();
    if (!pinInput.trim()) return null;
    setLoading(true);
    setLoginError('');
    try {
      const res = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: pinInput.trim() })
      });
      const data = await res.json();
      if (res.ok && data.valid && data.token) {
        setToken(data.token);
        setIsAuthenticated(true);
        try { localStorage.setItem('danii_admin_token', data.token); } catch {}
        if (onLoginSuccess) {
          void onLoginSuccess(data.token);
        }
        return data.token;
      } else {
        setLoginError(data.error || 'Credenciales incorrectas');
        return null;
      }
    } catch {
      setLoginError('Error de conexión con el servidor');
      return null;
    } finally {
      setLoading(false);
    }
  }, [pinInput, onLoginSuccess]);

  const handleLogout = useCallback(() => {
    setToken('');
    setIsAuthenticated(false);
    try { localStorage.removeItem('danii_admin_token'); } catch {}
    window.location.href = '/';
  }, []);

  useEffect(() => {
    if (isOpen) {
      const urlParams = new URLSearchParams(window.location.search);
      const magicToken = urlParams.get('admin_token') || '';
      const savedToken = (() => {
        try { return localStorage.getItem('danii_admin_token') || ''; } catch { return ''; }
      })();
      const tokenToTry = magicToken || savedToken;

      if (tokenToTry) {
        void verifyAndAuthenticate(tokenToTry).then(valid => {
          if (valid && magicToken) {
            urlParams.delete('admin_token');
            const newQuery = urlParams.toString();
            const newUrl = window.location.pathname + (newQuery ? `?${newQuery}` : '');
            window.history.replaceState({}, document.title, newUrl);
          }
        });
      } else {
        setIsAuthenticated(false);
        setAuthChecked(true);
      }
    }
  }, [isOpen, verifyAndAuthenticate]);

  return {
    token,
    isAuthenticated,
    authChecked,
    pinInput,
    loginError,
    loading,
    setPinInput,
    handleLoginWithPin,
    handleLogout,
    verifyAndAuthenticate
  };
};
