import { query, callProc } from '@/lib/db';
import { getDb } from '@/lib/mongo';
import { handler, json, requireUser } from '@/lib/api';

export const GET = handler(async () => {
  const user = await requireUser();

  if (user.role === 'student') {
    const [summary] = await callProc('student', 'CALL sp_student_dashboard(?)', [user.id]);
    const progress = await query('student',
      `SELECT course_id, course_code, course_title, enrollment_status, target_grade, final_grade,
              study_hours, total_assignments, submitted_assignments, score_pct, projected_grade
         FROM v_student_course_progress WHERE student_id = ? ORDER BY course_code`, [user.id]);
    const deadlines = await query('student',
      `SELECT assignment_id, course_code, title, due_date, days_left, is_submitted
         FROM v_upcoming_deadlines WHERE student_id = ? ORDER BY due_date`, [user.id]);
    const week = await query('student',
      `SELECT DATE_FORMAT(started_at, '%Y-%m-%d') AS day, SUM(duration_minutes) AS minutes
         FROM study_sessions
        WHERE student_id = ? AND started_at >= DATE_SUB(CURDATE(), INTERVAL 13 DAY)
        GROUP BY DATE_FORMAT(started_at, '%Y-%m-%d') ORDER BY day`, [user.id]);
    return json({ role: user.role, summary, progress, deadlines, week });
  }

  if (user.role === 'instructor') {
    const courses = await query('instructor',
      `SELECT c.course_id, c.course_code, c.title,
              (SELECT COUNT(*) FROM course_enrollments e
                WHERE e.course_id = c.course_id AND e.enrollment_status = 'active') AS active_students,
              (SELECT COUNT(*) FROM assignments a WHERE a.course_id = c.course_id) AS assignments,
              (SELECT COUNT(*) FROM submissions sb JOIN assignments a ON a.assignment_id = sb.assignment_id
                WHERE a.course_id = c.course_id AND sb.points_awarded IS NULL) AS to_grade,
              (SELECT ROUND(AVG(p.score_pct), 1) FROM v_student_course_progress p
                WHERE p.course_id = c.course_id) AS avg_score_pct
         FROM courses c WHERE c.instructor_id = ? ORDER BY c.course_code`, [user.id]);
    const pending = await query('instructor',
      `SELECT sb.submission_id, a.assignment_id, a.title, c.course_code, s.full_name, sb.version_no, sb.status, sb.submitted_at
         FROM submissions sb
         JOIN assignments a ON a.assignment_id = sb.assignment_id
         JOIN courses c     ON c.course_id = a.course_id
         JOIN students s    ON s.student_id = sb.student_id
        WHERE c.instructor_id = ? AND sb.points_awarded IS NULL
        ORDER BY sb.submitted_at`, [user.id]);
    return json({ role: user.role, courses, pending });
  }

  // admin
  const [totals] = await query('admin',
    `SELECT (SELECT COUNT(*) FROM students)            AS users,
            (SELECT COUNT(*) FROM courses)             AS courses,
            (SELECT COUNT(*) FROM course_enrollments)  AS enrollments,
            (SELECT COUNT(*) FROM assignments)         AS assignments,
            (SELECT COUNT(*) FROM submissions)         AS submissions,
            (SELECT COUNT(*) FROM study_sessions)      AS study_sessions,
            (SELECT COUNT(*) FROM study_tasks)         AS study_tasks,
            (SELECT COUNT(*) FROM grade_audit_log)     AS audit_rows`);
  const byRole = await query('admin', 'SELECT role, COUNT(*) AS users FROM students GROUP BY role');
  let mongo = { notes: null, activity_logs: null };
  try {
    const db = await getDb();
    mongo = {
      notes: await db.collection('notes').countDocuments(),
      activity_logs: await db.collection('activity_logs').countDocuments(),
    };
  } catch { /* MongoDB offline: the SQL part of the dashboard still works */ }
  return json({ role: user.role, totals, byRole, mongo });
});
