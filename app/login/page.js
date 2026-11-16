'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api } from '@/lib/client';
import { Alert, Field } from '@/components/ui';

const DEMO = [
  { label: 'Student', email: 'krrish@studysync.edu' },
  { label: 'Instructor', email: 'alan@studysync.edu' },
  { label: 'Admin', email: 'admin@studysync.edu' },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api('/api/auth/login', { method: 'POST', body: { email, password } });
      router.push('/dashboard');
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <div className="auth">
      <form className="auth-card" onSubmit={submit}>
        <div className="brand" style={{ color: 'var(--ink)', padding: 0, marginBottom: 14 }}>
          <span className="brand-mark" style={{ color: '#fff' }}>S</span>StudySync
        </div>
        <h1>Sign in</h1>
        <p className="muted">Student Course &amp; Study Management System</p>
        <Alert>{error}</Alert>
        <Field label="E-mail">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
        </Field>
        <Field label="Password">
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </Field>
        <button className="primary" style={{ width: '100%', padding: 10 }} disabled={busy}>
          {busy ? 'Signing in...' : 'Sign in'}
        </button>
        <p className="small" style={{ marginTop: 12 }}>New student? <Link href="/register">Create an account</Link></p>
        <div className="demo">
          <div className="small muted" style={{ marginBottom: 8 }}>Demo accounts (password: password123)</div>
          <div className="row">
            {DEMO.map((d) => (
              <button type="button" key={d.label} className="small"
                onClick={() => { setEmail(d.email); setPassword('password123'); }}>
                {d.label}
              </button>
            ))}
          </div>
        </div>
      </form>
    </div>
  );
}
