import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.js';
import AppShell from './AppShell.jsx';

/** Shows the app to a logged-in user and sends everyone else to the login page. */
export default function RequireAuth() {
  const { status, loggedOut } = useAuth();
  const location = useLocation();

  if (status === 'loading') return <p className="page-message">Loading…</p>;
  if (status === 'out') {
    // After a session runs out (or a bookmarked link is opened), logging in returns to that
    // page. After a deliberate log out, the next login starts at the first page.
    return <Navigate to="/login" replace state={loggedOut ? null : { from: location.pathname }} />;
  }
  return <AppShell />;
}
