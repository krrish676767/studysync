'use client';
import { useState } from 'react';
import { api, useData, fmtDate } from '@/lib/client';
import { Alert, Field, StatusBadge, Loading } from '@/components/ui';

export default function TasksPage() {
  const state = useData('/api/tasks');
  const blank = { title: '', priority: 'medium', due_date: '', course_id: '', parent_task_id: '' };
  const [form, setForm] = useState(blank);
  const [msg, setMsg] = useState({ kind: '', text: '' });
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const tasks = state.data?.tasks || [];

  async function act(fn, okText) {
    setMsg({ kind: '', text: '' });
    try { await fn(); if (okText) setMsg({ kind: 'ok', text: okText }); state.reload(); }
    catch (err) { setMsg({ kind: 'error', text: err.message }); }
  }
  const add = (e) => {
    e.preventDefault();
    act(() => api('/api/tasks', { method: 'POST', body: form }), 'Task added').then(() => setForm(blank));
  };
  const done = tasks.filter((t) => t.is_completed).length;

  return (
    <>
      <div className="page-head">
        <div><h1>Task Planner</h1><div className="sub">Break work into sub-tasks. The tree is read with a recursive CTE.</div></div>
        <div className="muted">{done} of {tasks.length} done</div>
      </div>
      <Alert kind={msg.kind}>{msg.text}</Alert>
      <Loading state={state} />
      {state.data && (
        <div className="grid side">
          <div className="card">
            <h2>My tasks</h2>
            {tasks.length === 0 && <div className="empty">No tasks yet. Add your first one.</div>}
            {tasks.map((t) => (
              <div key={t.task_id} className={`task ${t.is_completed ? 'done' : ''}`} style={{ paddingLeft: 6 + t.depth * 26 }}>
                <input type="checkbox" checked={Boolean(t.is_completed)}
                  onChange={() => act(() => api(`/api/tasks/${t.task_id}`, { method: 'PATCH', body: { is_completed: !t.is_completed } }))} />
                <div className="title">
                  {t.title}
                  <div className="small muted">
                    {t.course_code ? `${t.course_code} · ` : ''}{t.due_date ? `due ${fmtDate(t.due_date, false)}` : 'no due date'}
                    {t.completed_at ? ` · completed ${fmtDate(t.completed_at)}` : ''}
                    {t.child_count ? ` · ${t.child_count} sub-task(s)` : ''}
                  </div>
                </div>
                <StatusBadge value={t.priority} />
                <button className="ghost small" onClick={() => setForm({ ...blank, parent_task_id: String(t.task_id) })}>+ sub-task</button>
                <button className="ghost danger small" onClick={() => {
                  if (t.child_count && !window.confirm('Delete this task and all of its sub-tasks?')) return;
                  act(() => api(`/api/tasks/${t.task_id}`, { method: 'DELETE' }), 'Task deleted');
                }}>delete</button>
              </div>
            ))}
          </div>
          <form className="card" onSubmit={add}>
            <h2>{form.parent_task_id ? 'Add a sub-task' : 'Add a task'}</h2>
            <Field label="Title"><input value={form.title} onChange={set('title')} required /></Field>
            <Field label="Parent task">
              <select value={form.parent_task_id} onChange={set('parent_task_id')}>
                <option value="">None (top level)</option>
                {tasks.map((t) => <option key={t.task_id} value={t.task_id}>{'  '.repeat(t.depth)}{t.title}</option>)}
              </select>
            </Field>
            <div className="form-grid">
              <Field label="Priority">
                <select value={form.priority} onChange={set('priority')}>
                  <option value="low">Low</option><option value="medium">Medium</option>
                  <option value="high">High</option><option value="urgent">Urgent</option>
                </select>
              </Field>
              <Field label="Due date"><input type="date" value={form.due_date} onChange={set('due_date')} /></Field>
            </div>
            <Field label="Course">
              <select value={form.course_id} onChange={set('course_id')}>
                <option value="">None</option>
                {state.data.courses.map((c) => <option key={c.course_id} value={c.course_id}>{c.course_code}</option>)}
              </select>
            </Field>
            <button className="primary">Add task</button>
          </form>
        </div>
      )}
    </>
  );
}
