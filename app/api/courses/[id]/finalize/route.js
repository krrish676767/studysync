import { query, withConnection } from '@/lib/db';
import { handler, json, requireUser, HttpError } from '@/lib/api';
import { logActivity } from '@/lib/mongo';

// Calls the cursor-based procedure sp_finalize_course_grades
export const POST = handler(async (_request, { id }) => {
  const user = await requireUser('instructor', 'admin');
  const [course] = await query(user.role, 'SELECT instructor_id, course_code FROM courses WHERE course_id = ?', [id]);
  if (!course) throw new HttpError(404, 'Course not found');
  if (user.role !== 'admin' && course.instructor_id !== user.id) throw new HttpError(403, 'You do not teach this course');

  const updated = await withConnection(user.role, async (conn) => {
    await conn.query('CALL sp_finalize_course_grades(?, @updated)', [id]);
    const [[row]] = await conn.query('SELECT @updated AS updated');
    return row.updated;
  });
  await logActivity(user, 'grades_finalized', { course_code: course.course_code, students: updated });
  return json({ updated });
});
