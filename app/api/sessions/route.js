import { query } from '@/lib/db';
import { handler, json, need, requireUser } from '@/lib/api';
import { logActivity } from '@/lib/mongo';

export const GET = handler(async () => {
  const user = await requireUser('student');
  const sessions = await query('student',
    `SELECT ss.session_id, ss.course_id, c.course_code, ss.session_type, ss.duration_minutes,
            ss.focus_score, ss.notes, ss.started_at, ss.ended_at
       FROM study_sessions ss JOIN courses c ON c.course_id = ss.course_id
      WHERE ss.student_id = ? ORDER BY ss.started_at DESC`, [user.id]);
  const byCourse = await query('student',
    `SELECT c.course_code, COUNT(*) AS sessions, SUM(ss.duration_minutes) AS minutes,
            ROUND(AVG(ss.focus_score), 2) AS avg_focus
       FROM study_sessions ss JOIN courses c ON c.course_id = ss.course_id
      WHERE ss.student_id = ? GROUP BY c.course_id, c.course_code ORDER BY minutes DESC`, [user.id]);
  const courses = await query('student',
    `SELECT c.course_id, c.course_code, c.title FROM course_enrollments e
       JOIN courses c ON c.course_id = e.course_id
      WHERE e.student_id = ? AND e.enrollment_status IN ('active', 'auditing') ORDER BY c.course_code`, [user.id]);
  return json({ sessions, byCourse, courses });
});

export const POST = handler(async (request) => {
  const user = await requireUser('student');
  const body = await request.json();
  need(body, 'course_id', 'session_type', 'duration_minutes', 'focus_score');
  const minutes = Number(body.duration_minutes);
  // the session ends now unless a start time was given
  const result = body.started_at
    ? await query('student',
        `INSERT INTO study_sessions (student_id, course_id, session_type, duration_minutes, focus_score, notes, started_at, ended_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, DATE_ADD(?, INTERVAL ? MINUTE))`,
        [user.id, body.course_id, body.session_type, minutes, Number(body.focus_score), body.notes || '',
         String(body.started_at).replace('T', ' '), String(body.started_at).replace('T', ' '), minutes])
    : await query('student',
        `INSERT INTO study_sessions (student_id, course_id, session_type, duration_minutes, focus_score, notes, started_at, ended_at)
         VALUES (?, ?, ?, ?, ?, ?, DATE_SUB(NOW(), INTERVAL ? MINUTE), NOW())`,
        [user.id, body.course_id, body.session_type, minutes, Number(body.focus_score), body.notes || '', minutes]);
  await logActivity(user, 'study_session_logged', { minutes });
  return json({ session_id: result.insertId }, 201);
});
