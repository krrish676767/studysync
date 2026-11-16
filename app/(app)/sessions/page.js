'use client';
import { useState } from 'react';
import { api, useData, fmtDate, fmtMinutes } from '@/lib/client';
import { Alert, Field, DataTable, StatusBadge, Loading } from '@/components/ui';

export default function SessionsPage() {
  const state = useData('/api/sessions');
  const blank = { course_id: '', session_type: 'pomodoro', duration_minutes: 25, focus_score: 4, notes: '' };
  const [form, setForm] = useState(blank);
  const [msg, setMsg] = useState({ kind: '', text: '' });
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const courses = state.data?.courses || [];

  async function act(fn, okText) {
    setMsg({ kind: '', text: '' });
    try { await fn(); setMsg({ kind: 'ok', text: okText }); state.reload(); }
    catch (err) { setMsg({ kind: 'error', text: err.message }); }
  }
  const add = (e) => {
    e.preventDefault();
    act(() => api('/api/sessions', { method: 'POST', body: { ...form, course_id: form.course_id || courses[0]?.course_id } }), 'Study session logged')
      .then(() => setForm({ ...blank, course_id: form.course_id }));
  };

  return (
    <>
      <div className="page-head">
        <div><h1>Study Sessions</h1><div className="sub">Log focus blocks and see where your time goes</div></div>
      </div>
      <Alert kind={msg.kind}>{msg.text}</Alert>
      <Loading state={state} />
      {state.data && (
        <div className="grid side">
          <div>
            <form className="card" onSubmit={add}>
              <h2>Log a session</h2>
              <div className="form-grid">
                <Field label="Course">
                  <select value={form.course_id} onChange={set('course_id')}>
                    {courses.map((c) => <option key={c.course_id} value={c.course_id}>{c.course_code} {c.title}</option>)}
                  </select>
                </Field>
                <Field label="Type">
                  <select value={form.session_type} onChange={set('session_type')}>
                    <option value="pomodoro">Pomodoro</option><option value="deep_work">Deep work</option>
                    <option value="revision">Revision</option><option value="exam_prep">Exam prep</option>
                  </select>
                </Field>
                <Field label="Minutes (1-720)"><input type="number" value={form.duration_minutes} onChange={set('duration_minutes')} required /></Field>
                <Field label="Focus (1-5)"><input type="number" value={form.focus_score} onChange={set('focus_score')} required /></Field>
              </div>
              <Field label="What did you work on?"><input value={form.notes} onChange={set('notes')} /></Field>
              <button className="primary" disabled={!courses.length}>Log session</button>
              {!courses.length && <span className="small muted" style={{ marginLeft: 10 }}>Enroll in a course first.</span>}
            </form>
            <div className="card">
              <h2>History</h2>
              <DataTable rows={state.data.sessions} rowKey={(r) => r.session_id} empty="No sessions logged yet." columns={[
                { key: 'started_at', label: 'When', render: (r) => fmtDate(r.started_at) },
                { key: 'course_code', label: 'Course' },
                { key: 'session_type', label: 'Type', render: (r) => <StatusBadge value={r.session_type} /> },
                { key: 'duration_minutes', label: 'Duration', render: (r) => fmtMinutes(r.duration_minutes) },
                { key: 'focus_score', label: 'Focus', render: (r) => (
                  <select style={{ width: 62 }} value={r.focus_score}
                    onChange={(e) => act(() => api(`/api/sessions/${r.session_id}`, { method: 'PATCH', body: { focus_score: Number(e.target.value) } }), 'Focus score updated')}>
                    {[1, 2, 3, 4, 5].map((n) => <option key={n}>{n}</option>)}
                  </select>) },
                { key: 'notes', label: 'Notes' },
                { key: 'del', label: '', render: (r) => <button className="ghost danger small" onClick={() => act(() => api(`/api/sessions/${r.session_id}`, { method: 'DELETE' }), 'Session deleted')}>delete</button> },
              ]} />
            </div>
          </div>
          <div className="card">
            <h2>Time by course</h2>
            <DataTable rows={state.data.byCourse} rowKey={(r) => r.course_code} empty="No data yet." columns={[
              { key: 'course_code', label: 'Course' },
              { key: 'sessions', label: 'Sessions', align: 'right' },
              { key: 'minutes', label: 'Time', align: 'right', render: (r) => fmtMinutes(r.minutes) },
              { key: 'avg_focus', label: 'Focus', align: 'right' },
            ]} />
          </div>
        </div>
      )}
    </>
  );
}
