import { useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { fieldErrors } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import FormField from '../components/FormField.jsx';

export default function Register() {
  const { user, register } = useAuth();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/';
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={from} replace />;

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    const next = {};
    const name = form.name.trim();
    if (name.length < 2 || name.length > 80) next.name = 'Name must be 2–80 characters';
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) next.email = 'Enter a valid email';
    if (form.password.length < 8) next.password = 'Password must be at least 8 characters';
    if (form.confirm !== form.password) next.confirm = 'Passwords do not match';
    setErrors(next);
    setFormError('');
    if (Object.keys(next).length) return;

    setBusy(true);
    try {
      await register(name, form.email.trim(), form.password);
    } catch (err) {
      setErrors(fieldErrors(err));
      setFormError(err.message);
      setBusy(false);
    }
  };

  return (
    <div className="auth-wrap">
      <form className="auth-card" onSubmit={submit} noValidate>
        <h1 className="auth-title">Create your account</h1>
        <p className="auth-sub">Book tickets in a few clicks and keep everything in one place.</p>

        {formError && <div className="form-error">{formError}</div>}

        <FormField id="name" label="Name" error={errors.name}>
          <input
            id="name"
            className="input"
            autoComplete="name"
            value={form.name}
            onChange={set('name')}
          />
        </FormField>
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
            autoComplete="new-password"
            value={form.password}
            onChange={set('password')}
          />
        </FormField>
        <FormField id="confirm" label="Confirm password" error={errors.confirm}>
          <input
            id="confirm"
            type="password"
            className="input"
            autoComplete="new-password"
            value={form.confirm}
            onChange={set('confirm')}
          />
        </FormField>

        <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={busy}>
          {busy ? 'Creating account…' : 'Sign up'}
        </button>
        <p className="auth-foot">
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </form>
    </div>
  );
}