import { createContext, useContext } from 'react';

export const AuthContext = createContext(null);

/**
 * { user, status, loggedOut, login, register, logout }. `status`: 'loading' | 'in' | 'out'.
 * `loggedOut` is true when the person logged out on purpose.
 */
export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside <AuthProvider>.');
  return value;
}
