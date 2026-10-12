import './LoginPage.css';
import { useId, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.js';

/** Log in, or create an account. Both end up in the app. */
export default function LoginPage() {
  const { status, login, register } = useAuth();
  const location = useLocation();
  const ids = { name: useId(), email: useId(), password: useId(), error: useId() };

  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const creating = mode === 'register';

  if (status === 'in') return <Navigate to={location.state?.from ?? '/'} replace />;

  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));

  function switchMode() {
    setMode(creating ? 'login' : 'register');
    setError('');
  }

  async function submit(event) {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      if (creating) await register(form);
      else await login({ email: form.email, password: form.password });
    } catch (failure) {
      setError(failure.message);
      setIsSubmitting(false);
    }
  }

  return (
    <main className="login">
      <form className="login-card" onSubmit={submit} aria-describedby={error ? ids.error : undefined}>
        <h1>Sales Bill</h1>
        <p className="login-lead">{creating ? 'Create an account to save your invoices.' : 'Log in to your invoices.'}</p>

        {creating && (
          <div className="login-field">
            <label htmlFor={ids.name}>Your name</label>
            <input
              id={ids.name}
              type="text"
              autoComplete="name"
              required
              maxLength={80}
              value={form.name}
              onChange={set('name')}
            />
          </div>
        )}

        <div className="login-field">
          <label htmlFor={ids.email}>Email</label>
          <input
            id={ids.email}
            type="email"
            autoComplete="email"
            required
            maxLength={254}
            value={form.email}
            onChange={set('email')}
          />
        </div>

        <div className="login-field">
          <label htmlFor={ids.password}>Password</label>
          <input
            id={ids.password}
            type={showPassword ? 'text' : 'password'}
            autoComplete={creating ? 'new-password' : 'current-password'}
            required
            minLength={creating ? 8 : undefined}
            maxLength={72}
            value={form.password}
            onChange={set('password')}
          />
          {creating && <span className="login-hint">At least 8 characters.</span>}
        </div>

        <label className="checkbox">
          <input type="checkbox" checked={showPassword} onChange={(event) => setShowPassword(event.target.checked)} />
          Show password
        </label>

        {error && (
          <p id={ids.error} className="login-error" role="alert">
            {error}
          </p>
        )}

        <button type="submit" className="button primary login-submit" disabled={isSubmitting}>
          {isSubmitting ? (creating ? 'Creating account…' : 'Logging in…') : creating ? 'Create account' : 'Log in'}
        </button>

        <p className="login-switch">
          {creating ? 'Already have an account?' : 'New here?'}{' '}
          <button type="button" className="link-button" onClick={switchMode}>
            {creating ? 'Log in' : 'Create an account'}
          </button>
        </p>
      </form>
    </main>
  );
}
