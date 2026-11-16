'use client';
import { useState } from 'react';
import { api, useData, fmtDate } from '@/lib/client';
import { useUser } from '@/components/AppShell';
import { Alert, Field, DataTable, StatusBadge, Badge, Loading } from '@/components/ui';

/* ------------------------------------------------------------------ student */
function StudentAssignments({ state }) {
  const [urls, setUrls] = useState({});
  const [history, setHistory] = useState(null);
  const [msg, setMsg] = useState({ kind: '', text: '' });

  async function submit(a) {
    setMsg({ kind: '', text: '' });
    try {
      const out = await api('/api/submissions', { method: 'POST', body: { assignment_id: a.assignment_id, file_url: urls[a.assignment_id] } });
      setMsg({ kind: 'ok', text: `Submitted "${a.title}" as version ${out.version_no}` });
      setUrls({ ...urls, [a.assignment_id]: '' });
      state.reload();
    } catch (err) { setMsg({ kind: 'error', text: err.message }); }
  }
  async function showHistory(a) {
    const out = await api(`/api/submissions?assignment_id=${a.assignment_id}`);
    setHistory({ title: a.title, rows: out.submissions });
  }

  return (
    <>
      <Alert kind={msg.kind}>{msg.text}</Alert>
      <div className="card">
        <DataTable rows={state.data.assignments} rowKey={(r) => r.assignment_id} empty="Enroll in a course to see its assignments." columns={[
          { key: 'title', label: 'Assignment', render: (r) => (<div><b>{r.title}</b><div className="small muted">{r.course_code} &middot; {r.description}</div></div>) },
          { key: 'due_date', label: 'Due', render: (r) => (<div>{fmtDate(r.due_date)}{r.is_past_due ? <div><Badge kind="warn">past due</Badge></div> : null}</div>) },
          { key: 'status', label: 'My latest attempt', render: (r) => (r.submission_id
            ? <div><StatusBadge value={r.status} /> <span className="small muted">v{r.version_no}</span><div><button className="ghost small" onClick={() => showHistory(r)}>history</button></div></div>
            : <span className="muted">not submitted</span>) },
          { key: 'points_awarded', label: 'Marks', render: (r) => (r.points_awarded !== null && r.points_awarded !== undefined
            ? <div><b>{r.points_awarded}</b> / {r.max_points}<div className="small muted">{r.feedback}</div></div>
            : <span className="muted">- / {r.max_points}</span>) },
          { key: 'submit', label: 'Submit work', render: (r) => (
            <form className="row" style={{ flexWrap: 'nowrap' }} onSubmit={(e) => { e.preventDefault(); submit(r); }}>
              <input type="url" style={{ minWidth: 190 }} placeholder="https://link-to-your-file" required
                value={urls[r.assignment_id] || ''} onChange={(e) => setUrls({ ...urls, [r.assignment_id]: e.target.value })} />
              <button className="primary small">{r.submission_id ? 'Resubmit' : 'Submit'}</button>
            </form>) },
        ]} />
      </div>
      {history && (
        <div className="card">
          <div className="spread"><h2>Attempt history: {history.title}</h2><button className="small" onClick={() => setHistory(null)}>Close</button></div>
          <DataTable rows={history.rows} rowKey={(r) => r.submission_id} columns={[
            { key: 'version_no', label: 'Version' },
            { key: 'status', label: 'Status', render: (r) => <StatusBadge value={r.status} /> },
            { key: 'points_awarded', label: 'Marks' },
            { key: 'feedback', label: 'Feedback' },
            { key: 'file_url', label: 'File', render: (r) => <a href={r.file_url} target="_blank" rel="noreferrer">open</a> },
            { key: 'submitted_at', label: 'Submitted', render: (r) => fmtDate(r.submitted_at) },
          ]} />
        </div>
      )}
    </>
  );
}

/* --------------------------------------------------------------- instructor */
function GradeRow({ row, onSaved, onError }) {
  const [points, setPoints] = useState(row.points_awarded ?? '');
  const [feedback, setFeedback] = useState(row.feedback ?? '');
  async function save(e) {
    e.preventDefault();
    try {
      await api(`/api/submissions/${row.submission_id}`, { method: 'PATCH', body: { points_awarded: points, feedback } });
      onSaved(`Saved ${points} / ${row.max_points} for ${row.full_name}`);
    } catch (err) { onError(err.message); }
  }
  return (
    <form className="row" style={{ flexWrap: 'nowrap' }} onSubmit={save}>
      <input type="number" step="0.5" min="0" style={{ width: 84 }} value={points} onChange={(e) => setPoints(e.target.value)} required />
      <span className="muted small">/ {row.max_points}</span>
      <input style={{ minWidth: 180 }} placeholder="Feedback" value={feedback} onChange={(e) => setFeedback(e.target.value)} />
      <button className="primary small">Save</button>
    </form>
  );
}

function InstructorAssignments({ state }) {
  const blank = { course_id: '', title: '', description: '', due_date: '', max_points: 100, weightage_percent: 10 };
  const [form, setForm] = useState(blank);
  const [open, setOpen] = useState(null);
  const [msg, setMsg] = useState({ kind: '', text: '' });
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const courses = state.data.courses || [];

  async function create(e) {
    e.preventDefault();
    setMsg({ kind: '', text: '' });
    try {
      await api('/api/assignments', { method: 'POST', body: { ...form, course_id: form.course_id || courses[0]?.course_id } });
      setForm(blank);
      setMsg({ kind: 'ok', text: 'Assignment created' });
      state.reload();
    } catch (err) { setMsg({ kind: 'error', text: err.message }); }
  }
  async function loadSubs(a) {
    const out = await api(`/api/submissions?assignment_id=${a.assignment_id}`);
    setOpen({ assignment: a, rows: out.submissions });
  }
  async function remove(a) {
    if (!window.confirm(`Delete "${a.title}" and all of its submissions?`)) return;
    try {
      await api(`/api/assignments/${a.assignment_id}`, { method: 'DELETE' });
      if (open?.assignment.assignment_id === a.assignment_id) setOpen(null);
      setMsg({ kind: 'ok', text: 'Assignment deleted (submissions removed by ON DELETE CASCADE)' });
      state.reload();
    } catch (err) { setMsg({ kind: 'error', text: err.message }); }
  }

  return (
    <>
      <Alert kind={msg.kind}>{msg.text}</Alert>
      <form className="card" onSubmit={create}>
        <h2>New assignment</h2>
        <div className="form-grid">
          <Field label="Course">
            <select value={form.course_id} onChange={set('course_id')}>
              {courses.map((c) => <option key={c.course_id} value={c.course_id}>{c.course_code} {c.title}</option>)}
            </select>
          </Field>
          <Field label="Title"><input value={form.title} onChange={set('title')} required /></Field>
          <Field label="Due date"><input type="datetime-local" value={form.due_date} onChange={set('due_date')} required /></Field>
          <Field label="Max points"><input type="number" step="0.5" value={form.max_points} onChange={set('max_points')} /></Field>
          <Field label="Weight %"><input type="number" step="0.5" value={form.weightage_percent} onChange={set('weightage_percent')} /></Field>
        </div>
        <Field label="Description"><input value={form.description} onChange={set('description')} /></Field>
        <button className="primary" disabled={!courses.length}>Create assignment</button>
      </form>

      <div className="card">
        <h2>Assignments</h2>
        <DataTable rows={state.data.assignments} rowKey={(r) => r.assignment_id} empty="No assignments yet." columns={[
          { key: 'title', label: 'Assignment', render: (r) => (<div><b>{r.title}</b><div className="small muted">{r.course_code}</div></div>) },
          { key: 'due_date', label: 'Due', render: (r) => fmtDate(r.due_date) },
          { key: 'max_points', label: 'Max', align: 'right' },
          { key: 'students_submitted', label: 'Submitted by', align: 'right' },
          { key: 'to_grade', label: 'To grade', align: 'right', render: (r) => (Number(r.to_grade) ? <Badge kind="warn">{r.to_grade}</Badge> : '0') },
          { key: 'avg_points', label: 'Average', align: 'right' },
          { key: 'actions', label: '', render: (r) => (
            <span className="row" style={{ flexWrap: 'nowrap' }}>
              <button className="small" onClick={() => loadSubs(r)}>Grade</button>
              <button className="small danger" onClick={() => remove(r)}>Delete</button>
            </span>) },
        ]} />
      </div>

      {open && (
        <div className="card">
          <div className="spread"><h2>Submissions: {open.assignment.title}</h2><button className="small" onClick={() => setOpen(null)}>Close</button></div>
          <p className="small muted">Saving calls the procedure sp_grade_submission. Marks above the maximum are rejected by a trigger, and every change is written to the audit log by another trigger.</p>
          <DataTable rows={open.rows} rowKey={(r) => r.submission_id} empty="Nobody has submitted yet." columns={[
            { key: 'full_name', label: 'Student', render: (r) => (<div><b>{r.full_name}</b><div className="small muted">{r.enrollment_no}</div></div>) },
            { key: 'version_no', label: 'Version', render: (r) => `v${r.version_no}` },
            { key: 'status', label: 'Status', render: (r) => <StatusBadge value={r.status} /> },
            { key: 'file_url', label: 'File', render: (r) => <a href={r.file_url} target="_blank" rel="noreferrer">open</a> },
            { key: 'submitted_at', label: 'Submitted', render: (r) => fmtDate(r.submitted_at) },
            { key: 'grade', label: 'Marks and feedback', render: (r) => (
              <GradeRow row={r}
                onSaved={(text) => { setMsg({ kind: 'ok', text }); loadSubs(open.assignment); state.reload(); }}
                onError={(text) => setMsg({ kind: 'error', text })} />) },
          ]} />
        </div>
      )}
    </>
  );
}

export default function AssignmentsPage() {
  const user = useUser();
  const state = useData('/api/assignments');
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Assignments</h1>
          <div className="sub">{user.role === 'student' ? 'Submit work and track your marks' : 'Create assignments and grade submissions'}</div>
        </div>
      </div>
      <Loading state={state} />
      {state.data && (user.role === 'student' ? <StudentAssignments state={state} /> : <InstructorAssignments state={state} />)}
    </>
  );
}
