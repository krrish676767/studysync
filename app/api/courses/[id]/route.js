import { query } from '@/lib/db';
import { handler, json, requireUser, HttpError } from '@/lib/api';

async function loadCourse(role, id) {
  const [course] = await query(role,
    `SELECT c.course_id, c.course_code, c.title, c.department, c.credits, c.max_seats, c.is_archived,
            c.syllabus_json, c.instructor_id, i.full_name AS instructor, i.email AS instructor_email
       FROM courses c JOIN students i ON i.student_id = c.instructor_id
      WHERE c.course_id = ?`, [id]);
  if (!course) throw new HttpError(404, 'Course not found');
  return course;
}

export const GET = handler(async (_request, { id }) => {
  const user = await requireUser();
  const course = await loadCourse(user.role, id);
  if (typeof course.syllabus_json === 'string') {
    try { course.syllabus_json = JSON.parse(course.syllabus_json); } catch { /* keep as text */ }
  }
  const assignments = await query(user.role,
    `SELECT assignment_id, title, due_date, max_points, weightage_percent
       FROM assignments WHERE course_id = ? ORDER BY due_date`, [id]);
  const materials = await query(user.role,
    `SELECT m.material_id, m.title, m.material_type, m.file_url, m.plain_text, m.created_at, u.full_name AS uploader
       FROM study_materials m LEFT JOIN students u ON u.student_id = m.uploader_id
      WHERE m.course_id = ? ORDER BY m.created_at DESC, m.title`, [id]);
  const leaderboard = await query(user.role,
    `SELECT course_rank, student_id, student_name, score_pct, study_hours
       FROM v_course_leaderboard WHERE course_id = ? ORDER BY course_rank`, [id]);

  const canManage = user.role === 'admin' || (user.role === 'instructor' && course.instructor_id === user.id);
  let roster = null;
  if (canManage) {
    roster = await query(user.role,
      `SELECT student_id, student_name, enrollment_status, target_grade, final_grade,
              study_hours, submitted_assignments, total_assignments, score_pct, projected_grade
         FROM v_student_course_progress WHERE course_id = ? ORDER BY student_name`, [id]);
  }
  const [mine] = await query(user.role,
    'SELECT enrollment_status, target_grade, final_grade FROM course_enrollments WHERE course_id = ? AND student_id = ?',
    [id, user.id]);
  return json({ course, assignments, materials, leaderboard, roster, canManage, myEnrollment: mine || null });
});

export const PATCH = handler(async (request, { id }) => {
  const user = await requireUser('instructor', 'admin');
  const course = await loadCourse(user.role, id);
  if (user.role !== 'admin' && course.instructor_id !== user.id) throw new HttpError(403, 'You do not teach this course');
  const body = await request.json();
  await query(user.role,
    `UPDATE courses
        SET title = COALESCE(?, title), credits = COALESCE(?, credits),
            max_seats = COALESCE(?, max_seats), is_archived = COALESCE(?, is_archived)
      WHERE course_id = ?`,
    [body.title ?? null, body.credits ?? null, body.max_seats ?? null,
     body.is_archived === undefined ? null : (body.is_archived ? 1 : 0), id]);
  return json({ ok: true });
});

export const DELETE = handler(async (_request, { id }) => {
  const user = await requireUser('admin');
  const result = await query(user.role, 'DELETE FROM courses WHERE course_id = ?', [id]);
  if (!result.affectedRows) throw new HttpError(404, 'Course not found');
  return json({ ok: true });
});
