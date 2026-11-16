'use client';
import Link from 'next/link';
import { useState } from 'react';
import { api, useData } from '@/lib/client';
import { useUser } from '@/components/AppShell';
import { Alert, Field, StatusBadge, Badge, Loading } from '@/components/ui';

const GRADES = ['S', 'A+', 'A', 'B', 'C', 'D'];

function NewCourseForm({ onDone }) {
  const [form, setForm] = useState({ course_code: '', title: '', department: 'Computer Science & Engineering', credits: 4, max_seats: 60, modules: '' });
  const [error, setError] = useState('');
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  async function submit(e) {
    e.preventDefault();
    setError('');
    try {
      await api('/api/courses', { method: 'POST', body: form });
      onDone();
    } catch (err) { setError(err.message); }
  }
  return (
    <form className="card" onSubmit={submit}>
      <h2>New course</h2>
      <Alert>{error}</Alert>
      <div className="form-grid">
        <Field label="Course code (A-Z, 0-9)"><input value={form.course_code} onChange={set('course_code')} placeholder="CS306" required /></Field>
        <Field label="Title"><input value={form.title} onChange={set('title')} required /></Field>
        <Field label="Department"><input value={form.department} onChange={set('department')} required /></Field>
        <Field label="Credits (1-6)"><input type="number" value={form.credits} onChange={set('credits')} /></Field>
        <Field label="Seats"><input type="number" value={form.max_seats} onChange={set('max_seats')} /></Field>
        <Field label="Modules (comma separated)"><input value={form.modules} onChange={set('modules')} placeholder="Unit 1, Unit 2" /></Field>
      </div>
      <button className="primary">Create course</button>
    </form>
  );
}

export default function CoursesPage() {
  const user = useUser();
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [targets, setTargets] = useState({});
  const [msg, setMsg] = useState({ kind: '', text: '' });
  const state = useData(`/api/courses?q=${encodeURIComponent(search)}`);

  async function act(fn, okText) {
    setMsg({ kind: '', text: '' });
    try {
      await fn();
      setMsg({ kind: 'ok', text: okText });
      state.reload();
    } catch (err) { setMsg({ kind: 'error', text: err.message }); }
  }
  const enroll = (c) => act(() => api('/api/enrollments', { method: 'POST', body: { course_id: c.course_id, target_grade: targets[c.course_id] || 'A' } }), `Enrolled in ${c.course_code}`);
  const drop = (c) => act(() => api(`/api/enrollments?course_id=${c.course_id}`, { method: 'DELETE' }), `Dropped ${c.course_code}`);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Courses</h1>
          <div className="sub">Browse the catalogue{user.role === 'student' ? ' and enroll' : ''}</div>
        </div>
        <form className="row" onSubmit={(e) => { e.preventDefault(); setSearch(q); }}>
          <input style={{ width: 260 }} placeholder="Search code, title or department" value={q} onChange={(e) => setQ(e.target.value)} />
          <button>Search</button>
          {user.role !== 'student' && <button type="button" className="primary" onClick={() => setShowForm(!showForm)}>{showForm ? 'Close' : 'New course'}</button>}
        </form>
      </div>
      <Alert kind={msg.kind}>{msg.text}</Alert>
      {showForm && <NewCourseForm onDone={() => { setShowForm(false); state.reload(); }} />}
      <Loading state={state} />
      <div className="grid cols-3">
        {(state.data?.courses || []).map((c) => {
          const full = c.seats_taken >= c.max_seats;
          const enrolled = c.my_status && c.my_status !== 'dropped';
          return (
            <div className="card course-card" key={c.course_id}>
              <div className="spread">
                <span className="code">{c.course_code}</span>
                <span className="row">
                  {c.is_archived ? <Badge kind="bad">archived</Badge> : null}
                  {c.my_status ? <StatusBadge value={c.my_status} /> : null}
                </span>
              </div>
              <h3><Link href={`/courses/${c.course_id}`}>{c.title}</Link></h3>
              <div className="small muted">{c.department} &middot; {c.credits} credits</div>
              <div className="small">Instructor: {c.instructor}</div>
              <div className="small muted">{c.seats_taken} / {c.max_seats} seats taken {full ? <Badge kind="warn">full</Badge> : null}</div>
              {user.role === 'student' && (
                <div className="row" style={{ marginTop: 'auto', paddingTop: 6 }}>
                  {enrolled ? (
                    c.my_status === 'completed' ? <span className="small muted">Course completed</span>
                      : <button className="danger small" onClick={() => drop(c)}>Drop course</button>
                  ) : (
                    <>
                      <select style={{ width: 110 }} value={targets[c.course_id] || 'A'} onChange={(e) => setTargets({ ...targets, [c.course_id]: e.target.value })}>
                        {GRADES.map((g) => <option key={g} value={g}>Target {g}</option>)}
                      </select>
                      <button className="primary small" onClick={() => enroll(c)}>Enroll</button>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {state.data && state.data.courses.length === 0 && <div className="empty">No course matches that search.</div>}
    </>
  );
}
