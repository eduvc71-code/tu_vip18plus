import { useState, useEffect, useCallback, useRef } from 'react';

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

  // Keep a stable ref for onLoginSuccess to prevent infinite re-render loops
  const onLoginSuccessRef = useRef(onLoginSuccess);
  useEffect(() => {
    onLoginSuccessRef.current = onLoginSuccess;
  }, [onLoginSuccess]);

  // Guard to run verification only once per panel open session
  const hasCheckedRef = useRef(false);

  const verifyAndAuthenticate = useCallback(async (tok: string): Promise<boolean> => {
    if (!tok) {
      setToken('');
      setIsAuthenticated(false);
      setAuthChecked(true);
      return false;
    }

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
        setAuthChecked(true);
        try { localStorage.setItem('danii_admin_token', tok); } catch {}
        if (onLoginSuccessRef.current) {
          void onLoginSuccessRef.current(tok);
        }
        return true;
      } else {
        setToken('');
        setIsAuthenticated(false);
        setAuthChecked(true);
        try { localStorage.removeItem('danii_admin_token'); } catch {}
        return false;
      }
    } catch (err) {
      console.error('Error verifying admin token:', err);
      setToken('');
      setIsAuthenticated(false);
      setAuthChecked(true);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const handleLoginWithPin = useCallback(async (e?: React.FormEvent): Promise<string | null> => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const cleanPin = pinInput.trim();
    if (!cleanPin) return null;

    setLoading(true);
    setLoginError('');
    try {
      const res = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: cleanPin })
      });
      const data = await res.json();
      if (res.ok && data.valid && data.token) {
        setToken(data.token);
        setIsAuthenticated(true);
        setAuthChecked(true);
        setLoginError('');
        try { localStorage.setItem('danii_admin_token', data.token); } catch {}
        if (onLoginSuccessRef.current) {
          void onLoginSuccessRef.current(data.token);
        }
        return data.token;
      } else {
        setLoginError(data.error || 'Credenciales incorrectas');
        return null;
      }
    } catch (err) {
      console.error('Error in login request:', err);
      setLoginError('Error de conexión con el servidor. Revisa tu conexión.');
      return null;
    } finally {
      setLoading(false);
    }
  }, [pinInput]);

  const handleLogout = useCallback(() => {
    setToken('');
    setIsAuthenticated(false);
    setPinInput('');
    setLoginError('');
    try { localStorage.removeItem('danii_admin_token'); } catch {}
    window.location.href = '/';
  }, []);

  useEffect(() => {
    if (!isOpen) {
      hasCheckedRef.current = false;
      return;
    }

    if (hasCheckedRef.current || isAuthenticated) {
      return;
    }

    hasCheckedRef.current = true;

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
  }, [isOpen, isAuthenticated, verifyAndAuthenticate]);

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
