import { useState } from 'react';
import { api, fieldErrors } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import FormField from '../components/FormField.jsx';

export default function Profile() {
  const { user, updateUser } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState({
    name: user.name,
    currentPassword: '',
    newPassword: '',
    confirm: '',
  });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    const next = {};
    const name = form.name.trim();
    if (name.length < 2 || name.length > 80) next.name = 'Name must be 2–80 characters';
    if (form.newPassword) {
      if (!form.currentPassword) next.currentPassword = 'Enter your current password';
      if (form.newPassword.length < 8) next.newPassword = 'Password must be at least 8 characters';
      if (form.confirm !== form.newPassword) next.confirm = 'Passwords do not match';
    }
    setErrors(next);
    setFormError('');
    if (Object.keys(next).length) return;

    const body = { name };
    if (form.newPassword) {
      body.currentPassword = form.currentPassword;
      body.newPassword = form.newPassword;
    }

    setBusy(true);
    try {
      const data = await api('/api/users/me', { method: 'PUT', body });
      updateUser(data.user);
      setForm((f) => ({ ...f, name: data.user.name, currentPassword: '', newPassword: '', confirm: '' }));
      toast.success('Profile updated');
    } catch (err) {
      if (err.code === 'INVALID_PASSWORD') setErrors({ currentPassword: err.message });
      else {
        setErrors(fieldErrors(err));
        setFormError(err.message);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="panel" onSubmit={submit} noValidate>
      <h2 className="block-title">Profile</h2>
      <p className="muted panel-sub">Update your name or change your password.</p>

      {formError && <div className="form-error">{formError}</div>}

      <FormField id="email" label="Email">
        <input id="email" className="input" value={user.email} disabled />
      </FormField>
      <FormField id="name" label="Name" error={errors.name}>
        <input id="name" className="input" autoComplete="name" value={form.name} onChange={set('name')} />
      </FormField>

      <h3 className="panel-section">Change password</h3>
      <p className="muted small panel-sub">Leave these empty to keep your current password.</p>

      <FormField id="currentPassword" label="Current password" error={errors.currentPassword}>
        <input
          id="currentPassword"
          type="password"
          className="input"
          autoComplete="current-password"
          value={form.currentPassword}
          onChange={set('currentPassword')}
        />
      </FormField>
      <FormField id="newPassword" label="New password" error={errors.newPassword}>
        <input
          id="newPassword"
          type="password"
          className="input"
          autoComplete="new-password"
          value={form.newPassword}
          onChange={set('newPassword')}
        />
      </FormField>
      <FormField id="confirm" label="Confirm new password" error={errors.confirm}>
        <input
          id="confirm"
          type="password"
          className="input"
          autoComplete="new-password"
          value={form.confirm}
          onChange={set('confirm')}
        />
      </FormField>

      <button type="submit" className="btn btn-primary" disabled={busy}>
        {busy ? 'Saving…' : 'Save changes'}
      </button>
    </form>
  );
}