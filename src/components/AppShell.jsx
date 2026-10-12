import './AppShell.css';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.js';
import { hasUnsavedWork } from '../data/draftStorage.js';

/** The frame around every page once logged in: navigation, who is logged in, log out. */
export default function AppShell() {
  const { user, logout } = useAuth();

  async function handleLogout() {
    const unsaved = hasUnsavedWork(user.id);
    if (unsaved && !window.confirm('The invoice you are editing has not been saved and will be lost. Log out anyway?')) {
      return;
    }
    await logout();
  }

  return (
    <div className="shell">
      <nav className="shell-nav screen-only" aria-label="Main">
        <span className="shell-brand">Sales Bill</span>
        <div className="shell-links">
          <NavLink to="/" end>
            Billing
          </NavLink>
          <NavLink to="/invoices">History</NavLink>
          <NavLink to="/dashboard">Dashboard</NavLink>
        </div>
        <div className="shell-user">
          <span className="shell-user-name" title={user.email}>
            {user.name}
          </span>
          <button type="button" className="button" onClick={handleLogout}>
            Log out
          </button>
        </div>
      </nav>
      <div className="shell-page">
        <Outlet />
      </div>
    </div>
  );
}
