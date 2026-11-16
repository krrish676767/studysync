import { query, withConnection } from '@/lib/db';
import { handler, json, need, requireUser, HttpError } from '@/lib/api';
import { logActivity } from '@/lib/mongo';

export const GET = handler(async (request) => {
  const user = await requireUser();
  const assignmentId = new URL(request.url).searchParams.get('assignment_id');
  if (!assignmentId) throw new HttpError(400, 'assignment_id is required');

  if (user.role === 'student') {
    const submissions = await query('student',
      `SELECT submission_id, version_no, file_url, status, points_awarded, feedback, submitted_at
         FROM submissions WHERE assignment_id = ? AND student_id = ? ORDER BY version_no DESC`, [assignmentId, user.id]);
    return json({ submissions });
  }
  const submissions = await query(user.role,
    `SELECT sb.submission_id, sb.student_id, s.full_name, s.enrollment_no, sb.version_no, sb.file_url,
            sb.status, sb.points_awarded, sb.feedback, sb.submitted_at, a.max_points
       FROM submissions sb
       JOIN students s    ON s.student_id = sb.student_id
       JOIN assignments a ON a.assignment_id = sb.assignment_id
       JOIN courses c     ON c.course_id = a.course_id
      WHERE sb.assignment_id = ? AND (? = 'admin' OR c.instructor_id = ?)
      ORDER BY s.full_name, sb.version_no DESC`, [assignmentId, user.role, user.id]);
  return json({ submissions });
});

// Submit: versioning, late detection and the planner update happen inside
// the transactional procedure sp_submit_assignment.
export const POST = handler(async (request) => {
  const user = await requireUser('student');
  const body = await request.json();
  need(body, 'assignment_id', 'file_url');
  const out = await withConnection('student', async (conn) => {
    await conn.query('CALL sp_submit_assignment(?, ?, ?, @sid, @ver)', [body.assignment_id, user.id, String(body.file_url).trim()]);
    const [[row]] = await conn.query('SELECT @sid AS submission_id, @ver AS version_no');
    return row;
  });
  await logActivity(user, 'assignment_submitted', { assignment_id: body.assignment_id, version: out.version_no });
  return json(out, 201);
});
