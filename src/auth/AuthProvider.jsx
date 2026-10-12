import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api, setSessionExpiredHandler } from '../api/api.js';
import { clearDraft } from '../data/draftStorage.js';
import { AuthContext } from './AuthContext.js';

/** Knows who is logged in. Checks the cookie once on load, then follows login / logout. */
export default function AuthProvider({ children }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState('loading');
  // True after the person chose to log out (as opposed to a session that simply ran out).
  const [loggedOut, setLoggedOut] = useState(false);

  useEffect(() => {
    let active = true;
    api.auth
      .me()
      .then(({ user: me }) => active && (setUser(me), setStatus('in')))
      .catch(() => active && setStatus('out'));
    return () => {
      active = false;
    };
  }, []);

  // A 401 from any other request means the session ended: show the login page again. The
  // remembered server data goes too, so whoever logs in next never sees this person's.
  useEffect(() => {
    setSessionExpiredHandler(() => {
      queryClient.clear();
      setUser(null);
      setStatus('out');
    });
    return () => setSessionExpiredHandler(() => {});
  }, [queryClient]);

  const login = useCallback(async (credentials) => {
    const { user: me } = await api.auth.login(credentials);
    setUser(me);
    setStatus('in');
    setLoggedOut(false);
  }, []);

  const register = useCallback(async (details) => {
    const { user: me } = await api.auth.register(details);
    setUser(me);
    setStatus('in');
    setLoggedOut(false);
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.auth.logout();
    } finally {
      // Whatever the server said, this browser stops treating the person as logged in, and
      // the saved form is removed so the next person on a shared computer does not see it.
      if (user) clearDraft(user.id);
      queryClient.clear();
      setUser(null);
      setStatus('out');
      setLoggedOut(true);
    }
  }, [user, queryClient]);

  const value = useMemo(
    () => ({ user, status, loggedOut, login, register, logout }),
    [user, status, loggedOut, login, register, logout],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
