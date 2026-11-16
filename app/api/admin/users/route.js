import { query } from '@/lib/db';
import { handler, json, requireUser } from '@/lib/api';

export const GET = handler(async () => {
  await requireUser('admin');
  const users = await query('admin',
    `SELECT s.student_id, s.full_name, s.email, s.enrollment_no, s.current_semester, s.role, s.is_active,
            s.created_at, s.last_login_at,
            (SELECT COUNT(*) FROM course_enrollments e WHERE e.student_id = s.student_id) AS enrollments,
            (SELECT COUNT(*) FROM courses c WHERE c.instructor_id = s.student_id)         AS courses_taught
       FROM students s ORDER BY FIELD(s.role, 'admin', 'instructor', 'student'), s.full_name`);
  return json({ users });
});
