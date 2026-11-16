'use client';
import { useState } from 'react';
import { api, useData, fmtDate } from '@/lib/client';
import { useUser } from '@/components/AppShell';
import { Alert, DataTable, StatusBadge, Badge, Loading } from '@/components/ui';

export default function AdminPage() {
  const me = useUser();
  const users = useData('/api/admin/users');
  const audit = useData('/api/admin/audit');
  const activity = useData('/api/admin/activity');
  const [tab, setTab] = useState('users');
  const [msg, setMsg] = useState({ kind: '', text: '' });

  async function act(fn, okText) {
    setMsg({ kind: '', text: '' });
    try { await fn(); setMsg({ kind: 'ok', text: okText }); users.reload(); activity.reload(); }
    catch (err) { setMsg({ kind: 'error', text: err.message }); }
  }

  return (
    <>
      <div className="page-head">
        <div><h1>Admin Console</h1><div className="sub">User and role management, grade audit trail, activity analytics</div></div>
        <div className="row">
          {[['users', 'Users and roles'], ['audit', 'Grade audit log'], ['activity', 'Activity (MongoDB)']].map(([k, label]) => (
            <button key={k} className={tab === k ? 'primary' : ''} onClick={() => setTab(k)}>{label}</button>
          ))}
        </div>
      </div>
      <Alert kind={msg.kind}>{msg.text}</Alert>

      {tab === 'users' && (
        <div className="card">
          <h2>Users</h2>
          <Loading state={users} />
          <DataTable rows={users.data?.users} rowKey={(r) => r.student_id} columns={[
            { key: 'full_name', label: 'Name', render: (r) => (<div><b>{r.full_name}</b><div className="small muted">{r.email}</div></div>) },
            { key: 'enrollment_no', label: 'ID' },
            { key: 'role', label: 'Role', render: (r) => (
              <select style={{ width: 120 }} value={r.role} disabled={r.student_id === me.id}
                onChange={(e) => act(() => api(`/api/admin/users/${r.student_id}`, { method: 'PATCH', body: { role: e.target.value } }), `${r.full_name} is now ${e.target.value}`)}>
                <option value="student">student</option><option value="instructor">instructor</option><option value="admin">admin</option>
              </select>) },
            { key: 'is_active', label: 'Account', render: (r) => (r.is_active ? <Badge kind="good">active</Badge> : <Badge kind="bad">deactivated</Badge>) },
            { key: 'enrollments', label: 'Enrolled', align: 'right' },
            { key: 'courses_taught', label: 'Teaches', align: 'right' },
            { key: 'last_login_at', label: 'Last login', render: (r) => fmtDate(r.last_login_at) },
            { key: 'actions', label: '', render: (r) => (r.student_id === me.id ? <span className="small muted">you</span> : (
              <span className="row" style={{ flexWrap: 'nowrap' }}>
                <button className="small" onClick={() => act(() => api(`/api/admin/users/${r.student_id}`, { method: 'PATCH', body: { is_active: !r.is_active } }), r.is_active ? 'Account deactivated' : 'Account re-activated')}>
                  {r.is_active ? 'Deactivate' : 'Activate'}
                </button>
                <button className="small danger" onClick={() => {
                  if (window.confirm(`Delete ${r.full_name}? Their enrollments, sessions, submissions and tasks are removed too.`)) {
                    act(() => api(`/api/admin/users/${r.student_id}`, { method: 'DELETE' }), 'User deleted');
                  }
                }}>Delete</button>
              </span>)) },
          ]} />
        </div>
      )}

      {tab === 'audit' && (
        <div className="card">
          <div className="spread"><h2>Grade audit log</h2><button className="small" onClick={audit.reload}>Refresh</button></div>
          <p className="small muted">Rows are inserted only by the trigger trg_sub_after_update whenever marks or status change.</p>
          <Loading state={audit} />
          <DataTable rows={audit.data?.audit} rowKey={(r) => r.audit_id} empty="No grade changes recorded yet. Grade a submission as an instructor to see a row appear." columns={[
            { key: 'changed_at', label: 'When', render: (r) => fmtDate(r.changed_at) },
            { key: 'assignment', label: 'Assignment' },
            { key: 'student', label: 'Student' },
            { key: 'points', label: 'Marks', render: (r) => <span>{r.old_points ?? 'NULL'} &rarr; <b>{r.new_points ?? 'NULL'}</b></span> },
            { key: 'status', label: 'Status', render: (r) => <span><StatusBadge value={r.old_status} /> &rarr; <StatusBadge value={r.new_status} /></span> },
            { key: 'changed_by', label: 'Changed by' },
          ]} />
        </div>
      )}

      {tab === 'activity' && (
        <>
          <Loading state={activity} />
          {activity.data && (
            <div className="grid cols-2">
              <div className="card">
                <h2>Events by action</h2>
                <DataTable rows={activity.data.byAction} rowKey={(r) => r.action} columns={[
                  { key: 'action', label: 'Action' },
                  { key: 'events', label: 'Events', align: 'right' },
                  { key: 'last_seen', label: 'Last seen', render: (r) => fmtDate(r.last_seen) },
                ]} />
              </div>
              <div>
                <div className="card">
                  <h2>Daily activity, last 14 days</h2>
                  <DataTable rows={activity.data.byDay} rowKey={(r) => r.day} columns={[
                    { key: 'day', label: 'Day' },
                    { key: 'events', label: 'Events', align: 'right' },
                    { key: 'active_users', label: 'Active users', align: 'right' },
                  ]} />
                </div>
                <div className="card">
                  <h2>Most active users</h2>
                  <DataTable rows={activity.data.topUsers} rowKey={(r) => r.name} columns={[
                    { key: 'name', label: 'User' },
                    { key: 'role', label: 'Role', render: (r) => <StatusBadge value={r.role} /> },
                    { key: 'events', label: 'Events', align: 'right' },
                  ]} />
                </div>
              </div>
              <div className="card" style={{ gridColumn: '1 / -1' }}>
                <h2>Latest events</h2>
                <DataTable rows={activity.data.recent} columns={[
                  { key: 'at', label: 'When', render: (r) => fmtDate(r.at) },
                  { key: 'user_name', label: 'User' },
                  { key: 'role', label: 'Role', render: (r) => <StatusBadge value={r.role} /> },
                  { key: 'action', label: 'Action' },
                  { key: 'details', label: 'Details', render: (r) => <span className="mono small">{JSON.stringify(r.details)}</span> },
                ]} />
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}
