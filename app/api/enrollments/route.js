import { query } from '@/lib/db';
import { handler, json, need, requireUser, HttpError } from '@/lib/api';
import { logActivity } from '@/lib/mongo';

// Enroll: all business rules live in the stored procedure sp_enroll_student
export const POST = handler(async (request) => {
  const user = await requireUser('student');
  const body = await request.json();
  need(body, 'course_id');
  await query('student', 'CALL sp_enroll_student(?, ?, ?)', [user.id, body.course_id, body.target_grade || null]);
  await logActivity(user, 'course_enrolled', { course_id: body.course_id });
  return json({ ok: true }, 201);
});

// Drop a course (soft delete: the row is kept with status 'dropped')
export const DELETE = handler(async (request) => {
  const user = await requireUser('student');
  const courseId = new URL(request.url).searchParams.get('course_id');
  const result = await query('student',
    `UPDATE course_enrollments SET enrollment_status = 'dropped'
      WHERE course_id = ? AND student_id = ? AND enrollment_status IN ('active', 'auditing')`, [courseId, user.id]);
  if (!result.affectedRows) throw new HttpError(404, 'No active enrollment found for this course');
  await logActivity(user, 'course_dropped', { course_id: courseId });
  return json({ ok: true });
});
