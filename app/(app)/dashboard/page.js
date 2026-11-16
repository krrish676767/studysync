'use client';
import Link from 'next/link';
import { useData, fmtDate, fmtMinutes } from '@/lib/client';
import { useUser } from '@/components/AppShell';
import { Stat, DataTable, StatusBadge, Badge, Loading } from '@/components/ui';

function WeekChart({ week }) {
  const byDay = Object.fromEntries((week || []).map((w) => [w.day, Number(w.minutes)]));
  const days = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    days.push({ key, label: d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }), minutes: byDay[key] || 0 });
  }
  const max = Math.max(60, ...days.map((d) => d.minutes));
  return (
    <div className="bars">
      {days.map((d) => (
        <div className="bar" key={d.key} title={`${d.label}: ${d.minutes} min`}>
          <em>{d.minutes || ''}</em>
          <div className={d.minutes ? '' : 'zero'} style={{ height: `${(d.minutes / max) * 100}%` }} />
          <span>{d.label.split(' ')[0]}</span>
        </div>
      ))}
    </div>
  );
}

function StudentDashboard({ data }) {
  const s = data.summary || {};
  return (
    <>
      <div className="grid cols-5" style={{ marginBottom: 18 }}>
        <Stat label="Active courses" value={s.active_courses} />
        <Stat label="Studied, last 7 days" value={fmtMinutes(s.minutes_last_7_days)} hint={`${fmtMinutes(s.minutes_last_30_days)} in 30 days`} />
        <Stat label="Average focus" value={s.avg_focus ?? '-'} hint="out of 5" />
        <Stat label="Open tasks" value={s.open_tasks} />
        <Stat label="Pending assignments" value={s.pending_assignments} hint={`${s.assignments_submitted} submitted so far`} />
      </div>
      <div className="grid side">
        <div>
          <div className="card">
            <h2>Course progress</h2>
            <DataTable
              rows={data.progress}
              rowKey={(r) => r.course_id}
              empty="You are not enrolled in any course yet."
              columns={[
                { key: 'course_code', label: 'Course', render: (r) => <Link href={`/courses/${r.course_id}`}><b>{r.course_code}</b> {r.course_title}</Link> },
                { key: 'enrollment_status', label: 'Status', render: (r) => <StatusBadge value={r.enrollment_status} /> },
                { key: 'submitted', label: 'Submitted', render: (r) => (
                  <div>
                    <div className="small">{r.submitted_assignments} / {r.total_assignments}</div>
                    <div className="progress"><div style={{ width: `${r.total_assignments ? (r.submitted_assignments / r.total_assignments) * 100 : 0}%` }} /></div>
                  </div>) },
                { key: 'study_hours', label: 'Hours', align: 'right' },
                { key: 'score_pct', label: 'Score %', align: 'right' },
                { key: 'grade', label: 'Projected / target', render: (r) => (
                  <span>{r.final_grade ? <Badge kind="good">final {r.final_grade}</Badge> : <Badge kind="brand">{r.projected_grade || '-'}</Badge>} <span className="muted">/ {r.target_grade || '-'}</span></span>) },
              ]}
            />
          </div>
          <div className="card">
            <h2>Study minutes, last 14 days</h2>
            <WeekChart week={data.week} />
          </div>
        </div>
        <div className="card">
          <h2>Upcoming deadlines</h2>
          {data.deadlines.length === 0 ? <div className="empty">No upcoming deadlines.</div> : data.deadlines.map((d) => (
            <div key={d.assignment_id} style={{ padding: '9px 0', borderBottom: '1px solid var(--line)' }}>
              <div className="spread">
                <b>{d.title}</b>
                {d.is_submitted ? <Badge kind="good">submitted</Badge> : <Badge kind={d.days_left <= 3 ? 'bad' : 'warn'}>{d.days_left} days left</Badge>}
              </div>
              <div className="small muted">{d.course_code} &middot; due {fmtDate(d.due_date)}</div>
            </div>
          ))}
          <p className="small" style={{ marginTop: 12 }}><Link href="/assignments">Go to assignments</Link></p>
        </div>
      </div>
    </>
  );
}

function InstructorDashboard({ data }) {
  const totalStudents = data.courses.reduce((n, c) => n + Number(c.active_students), 0);
  return (
    <>
      <div className="grid cols-4" style={{ marginBottom: 18 }}>
        <Stat label="Courses taught" value={data.courses.length} />
        <Stat label="Active students" value={totalStudents} />
        <Stat label="Assignments" value={data.courses.reduce((n, c) => n + Number(c.assignments), 0)} />
        <Stat label="Waiting for grading" value={data.pending.length} />
      </div>
      <div className="card">
        <h2>My courses</h2>
        <DataTable rows={data.courses} rowKey={(r) => r.course_id} columns={[
          { key: 'course_code', label: 'Course', render: (r) => <Link href={`/courses/${r.course_id}`}><b>{r.course_code}</b> {r.title}</Link> },
          { key: 'active_students', label: 'Active students', align: 'right' },
          { key: 'assignments', label: 'Assignments', align: 'right' },
          { key: 'to_grade', label: 'To grade', align: 'right' },
          { key: 'avg_score_pct', label: 'Average score %', align: 'right' },
        ]} />
      </div>
      <div className="card">
        <h2>Submissions waiting for a grade</h2>
        <DataTable rows={data.pending} rowKey={(r) => r.submission_id} empty="Everything is graded." columns={[
          { key: 'full_name', label: 'Student' },
          { key: 'title', label: 'Assignment', render: (r) => <span><b>{r.course_code}</b> {r.title}</span> },
          { key: 'version_no', label: 'Version', align: 'right' },
          { key: 'status', label: 'Status', render: (r) => <StatusBadge value={r.status} /> },
          { key: 'submitted_at', label: 'Submitted', render: (r) => fmtDate(r.submitted_at) },
        ]} />
        <p className="small" style={{ marginTop: 12 }}><Link href="/assignments">Open the grading page</Link></p>
      </div>
    </>
  );
}

function AdminDashboard({ data }) {
  const t = data.totals;
  return (
    <>
      <h2>MySQL (relational data)</h2>
      <div className="grid cols-4" style={{ marginBottom: 18 }}>
        <Stat label="Users" value={t.users} hint={data.byRole.map((r) => `${r.users} ${r.role}`).join(', ')} />
        <Stat label="Courses" value={t.courses} />
        <Stat label="Enrollments" value={t.enrollments} />
        <Stat label="Assignments" value={t.assignments} />
        <Stat label="Submissions" value={t.submissions} />
        <Stat label="Study sessions" value={t.study_sessions} />
        <Stat label="Planner tasks" value={t.study_tasks} />
        <Stat label="Grade audit rows" value={t.audit_rows} hint="written by a trigger" />
      </div>
      <h2>MongoDB (document data)</h2>
      <div className="grid cols-4">
        <Stat label="Notes" value={data.mongo.notes ?? 'offline'} />
        <Stat label="Activity log events" value={data.mongo.activity_logs ?? 'offline'} />
      </div>
      <p style={{ marginTop: 18 }}><Link href="/admin">Open the admin console</Link></p>
    </>
  );
}

export default function DashboardPage() {
  const user = useUser();
  const state = useData('/api/dashboard');
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Hello, {user.name.split(' ')[0] === 'Prof.' ? user.name : user.name.split(' ')[0]}</h1>
          <div className="sub">Signed in as <StatusBadge value={user.role} /></div>
        </div>
      </div>
      <Loading state={state} />
      {state.data?.role === 'student' && <StudentDashboard data={state.data} />}
      {state.data?.role === 'instructor' && <InstructorDashboard data={state.data} />}
      {state.data?.role === 'admin' && <AdminDashboard data={state.data} />}
    </>
  );
}
