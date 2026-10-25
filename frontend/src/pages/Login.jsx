import { useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { fieldErrors } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import FormField from '../components/FormField.jsx';

export default function Login() {
  const { user, login } = useAuth();
  const location = useLocation();
  const from = location.state?.from?.pathname;
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={from || (user.role === 'admin' ? '/admin' : '/')} replace />;

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    const next = {};
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) next.email = 'Enter a valid email';
    if (!form.password) next.password = 'Password is required';
    setErrors(next);
    setFormError('');
    if (Object.keys(next).length) return;

    setBusy(true);
    try {
      await login(form.email.trim(), form.password);
    } catch (err) {
      setErrors(fieldErrors(err));
      setFormError(err.message);
      setBusy(false);
    }
  };

  return (
    <div className="auth-wrap">
      <form className="auth-card" onSubmit={submit} noValidate>
        <h1 className="auth-title">Welcome back</h1>
        <p className="auth-sub">Log in to book tickets and manage your favorites.</p>

        {formError && <div className="form-error">{formError}</div>}

        <FormField id="email" label="Email" error={errors.email}>
          <input
            id="email"
            type="email"
            className="input"
            autoComplete="email"
            value={form.email}
            onChange={set('email')}
          />
        </FormField>
        <FormField id="password" label="Password" error={errors.password}>
          <input
            id="password"
            type="password"
            className="input"
            autoComplete="current-password"
            value={form.password}
            onChange={set('password')}
          />
        </FormField>

        <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={busy}>
          {busy ? 'Logging in…' : 'Log in'}
        </button>
        <p className="auth-foot">
          New here? <Link to="/register">Create an account</Link>
        </p>
      </form>
    </div>
  );
}