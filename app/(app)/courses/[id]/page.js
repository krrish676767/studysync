'use client';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { api, useData, fmtDate } from '@/lib/client';
import { useUser } from '@/components/AppShell';
import { Alert, Field, DataTable, StatusBadge, Badge, Loading } from '@/components/ui';

export default function CourseDetailPage() {
  const { id } = useParams();
  const user = useUser();
  const state = useData(`/api/courses/${id}`);
  const [msg, setMsg] = useState({ kind: '', text: '' });
  const [mat, setMat] = useState({ title: '', material_type: 'lecture_notes', file_url: '', plain_text: '' });
  const d = state.data;

  async function act(fn, okText) {
    setMsg({ kind: '', text: '' });
    try {
      const out = await fn();
      setMsg({ kind: 'ok', text: typeof okText === 'function' ? okText(out) : okText });
      state.reload();
    } catch (err) { setMsg({ kind: 'error', text: err.message }); }
  }

  if (!d) return <Loading state={state} />;
  const c = d.course;
  const modules = c.syllabus_json?.modules || [];

  return (
    <>
      <div className="page-head">
        <div>
          <div className="small"><Link href="/courses">Courses</Link> / {c.course_code}</div>
          <h1>{c.title}</h1>
          <div className="sub">{c.course_code} &middot; {c.department} &middot; {c.credits} credits &middot; {c.instructor}</div>
        </div>
        <div className="row">
          {c.is_archived ? <Badge kind="bad">archived</Badge> : null}
          {d.myEnrollment ? <StatusBadge value={d.myEnrollment.enrollment_status} /> : null}
          {d.canManage && (
            <>
              <button onClick={() => act(() => api(`/api/courses/${id}`, { method: 'PATCH', body: { is_archived: !c.is_archived } }), c.is_archived ? 'Course re-opened' : 'Course archived')}>
                {c.is_archived ? 'Re-open course' : 'Archive course'}
              </button>
              <button className="primary" onClick={() => act(() => api(`/api/courses/${id}/finalize`, { method: 'POST' }), (o) => `Final grades written for ${o.updated} student(s) by sp_finalize_course_grades`)}>
                Finalize grades
              </button>
            </>
          )}
        </div>
      </div>
      <Alert kind={msg.kind}>{msg.text}</Alert>

      <div className="grid side">
        <div>
          <div className="card">
            <h2>Syllabus</h2>
            {modules.length ? modules.map((m) => <span className="chip" key={m}>{m}</span>) : <span className="muted">No modules listed.</span>}
          </div>
          <div className="card">
            <h2>Assignments</h2>
            <DataTable rows={d.assignments} rowKey={(r) => r.assignment_id} empty="No assignments yet." columns={[
              { key: 'title', label: 'Title' },
              { key: 'due_date', label: 'Due', render: (r) => fmtDate(r.due_date) },
              { key: 'max_points', label: 'Max points', align: 'right' },
              { key: 'weightage_percent', label: 'Weight %', align: 'right' },
            ]} />
          </div>
          {d.roster && (
            <div className="card">
              <h2>Class roster</h2>
              <DataTable rows={d.roster} rowKey={(r) => r.student_id} empty="No students enrolled." columns={[
                { key: 'student_name', label: 'Student' },
                { key: 'enrollment_status', label: 'Status', render: (r) => <StatusBadge value={r.enrollment_status} /> },
                { key: 'sub', label: 'Submitted', render: (r) => `${r.submitted_assignments} / ${r.total_assignments}` },
                { key: 'study_hours', label: 'Hours', align: 'right' },
                { key: 'score_pct', label: 'Score %', align: 'right' },
                { key: 'projected_grade', label: 'Projected' },
                { key: 'target_grade', label: 'Target' },
                { key: 'final_grade', label: 'Final', render: (r) => (r.final_grade ? <Badge kind="good">{r.final_grade}</Badge> : '-') },
              ]} />
            </div>
          )}
          <div className="card">
            <h2>Study materials</h2>
            {d.materials.length === 0 && <div className="empty">No materials uploaded yet.</div>}
            {d.materials.map((m) => (
              <div key={m.material_id} style={{ padding: '9px 0', borderBottom: '1px solid var(--line)' }}>
                <div className="spread">
                  <span><b>{m.title}</b> <StatusBadge value={m.material_type} /></span>
                  <span className="row">
                    <a href={m.file_url} target="_blank" rel="noreferrer" className="small">open file</a>
                    {d.canManage && <button className="ghost danger small" onClick={() => act(() => api(`/api/materials?id=${m.material_id}`, { method: 'DELETE' }), 'Material removed')}>remove</button>}
                  </span>
                </div>
                <div className="small muted">{m.plain_text}</div>
                <div className="small muted">Uploaded by {m.uploader || 'a removed user'}</div>
              </div>
            ))}
            <form style={{ marginTop: 14 }} onSubmit={(e) => {
              e.preventDefault();
              act(() => api('/api/materials', { method: 'POST', body: { ...mat, course_id: id } }), 'Material added')
                .then(() => setMat({ title: '', material_type: 'lecture_notes', file_url: '', plain_text: '' }));
            }}>
              <h3>Add a material</h3>
              <div className="form-grid">
                <Field label="Title"><input value={mat.title} onChange={(e) => setMat({ ...mat, title: e.target.value })} required /></Field>
                <Field label="Type">
                  <select value={mat.material_type} onChange={(e) => setMat({ ...mat, material_type: e.target.value })}>
                    <option value="lecture_notes">Lecture notes</option><option value="slides">Slides</option>
                    <option value="flashcards">Flashcards</option><option value="summary">Summary</option>
                  </select>
                </Field>
                <Field label="File link"><input type="url" value={mat.file_url} onChange={(e) => setMat({ ...mat, file_url: e.target.value })} placeholder="https://..." required /></Field>
                <Field label="Short description"><input value={mat.plain_text} onChange={(e) => setMat({ ...mat, plain_text: e.target.value })} /></Field>
              </div>
              <button>Add material</button>
            </form>
          </div>
        </div>
        <div className="card">
          <h2>Leaderboard</h2>
          <p className="small muted">From the view v_course_leaderboard (RANK window function over the weighted score).</p>
          <DataTable rows={d.leaderboard} rowKey={(r) => r.student_id} empty="No graded work yet." columns={[
            { key: 'course_rank', label: '#' },
            { key: 'student_name', label: 'Student', render: (r) => (r.student_id === user.id ? <b>{r.student_name} (you)</b> : r.student_name) },
            { key: 'score_pct', label: 'Score %', align: 'right' },
          ]} />
        </div>
      </div>
    </>
  );
}
