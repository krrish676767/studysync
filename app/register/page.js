'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api } from '@/lib/client';
import { Alert, Field } from '@/components/ui';

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ full_name: '', email: '', enrollment_no: '', current_semester: 5, password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api('/api/auth/register', { method: 'POST', body: form });
      router.push('/dashboard');
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <div className="auth">
      <form className="auth-card" onSubmit={submit}>
        <h1>Create a student account</h1>
        <p className="muted">Instructor and admin roles are assigned by an administrator.</p>
        <Alert>{error}</Alert>
        <Field label="Full name"><input value={form.full_name} onChange={set('full_name')} required /></Field>
        <Field label="E-mail"><input type="email" value={form.email} onChange={set('email')} required /></Field>
        <div className="form-grid">
          <Field label="SRN / enrollment no."><input value={form.enrollment_no} onChange={set('enrollment_no')} required /></Field>
          <Field label="Semester (1-8)">
            <input type="number" min="1" max="8" value={form.current_semester} onChange={set('current_semester')} required />
          </Field>
        </div>
        <Field label="Password (min 8 characters)">
          <input type="password" minLength={8} value={form.password} onChange={set('password')} required />
        </Field>
        <button className="primary" style={{ width: '100%', padding: 10 }} disabled={busy}>
          {busy ? 'Creating...' : 'Create account'}
        </button>
        <p className="small" style={{ marginTop: 12 }}>Already registered? <Link href="/login">Sign in</Link></p>
      </form>
    </div>
  );
}
