import { randomUUID } from 'node:crypto';
import { query } from '@/lib/db';
import { handler, json, need, requireUser, HttpError } from '@/lib/api';
import { logActivity } from '@/lib/mongo';

export const GET = handler(async () => {
  const user = await requireUser();

  if (user.role === 'student') {
    // each assignment of my courses + my latest attempt (correlated subquery)
    const assignments = await query('student',
      `SELECT a.assignment_id, a.title, a.description, a.due_date, a.max_points, a.weightage_percent,
              c.course_code, c.title AS course_title, (a.due_date < NOW()) AS is_past_due,
              sb.submission_id, sb.version_no, sb.status, sb.points_awarded, sb.feedback, sb.submitted_at
         FROM assignments a
         JOIN courses c ON c.course_id = a.course_id
         JOIN course_enrollments e ON e.course_id = a.course_id AND e.student_id = ?
                                  AND e.enrollment_status IN ('active', 'completed')
         LEFT JOIN submissions sb ON sb.assignment_id = a.assignment_id AND sb.student_id = e.student_id
                                 AND sb.version_no = (SELECT MAX(x.version_no) FROM submissions x
                                                       WHERE x.assignment_id = a.assignment_id
                                                         AND x.student_id = e.student_id)
        ORDER BY a.due_date`, [user.id]);
    return json({ assignments });
  }

  const assignments = await query(user.role,
    `SELECT a.assignment_id, a.course_id, a.title, a.description, a.due_date, a.max_points, a.weightage_percent,
            c.course_code, c.title AS course_title,
            COUNT(DISTINCT sb.student_id)                 AS students_submitted,
            SUM(sb.submission_id IS NOT NULL AND sb.points_awarded IS NULL) AS to_grade,
            ROUND(AVG(sb.points_awarded), 2)              AS avg_points
       FROM assignments a
       JOIN courses c ON c.course_id = a.course_id
       LEFT JOIN submissions sb ON sb.assignment_id = a.assignment_id
      WHERE (? = 'admin' OR c.instructor_id = ?)
      GROUP BY a.assignment_id, a.course_id, a.title, a.description, a.due_date, a.max_points,
               a.weightage_percent, c.course_code, c.title
      ORDER BY a.due_date DESC`, [user.role, user.id]);
  const courses = await query(user.role,
    `SELECT course_id, course_code, title FROM courses
      WHERE (? = 'admin' OR instructor_id = ?) AND is_archived = FALSE ORDER BY course_code`, [user.role, user.id]);
  return json({ assignments, courses });
});

export const POST = handler(async (request) => {
  const user = await requireUser('instructor', 'admin');
  const body = await request.json();
  need(body, 'course_id', 'title', 'due_date');
  const [course] = await query(user.role, 'SELECT instructor_id FROM courses WHERE course_id = ?', [body.course_id]);
  if (!course) throw new HttpError(404, 'Course not found');
  if (user.role !== 'admin' && course.instructor_id !== user.id) throw new HttpError(403, 'You do not teach this course');

  const id = randomUUID();
  await query(user.role,
    `INSERT INTO assignments (assignment_id, course_id, title, description, due_date, max_points, weightage_percent, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, body.course_id, String(body.title).trim(), body.description || '',
     String(body.due_date).replace('T', ' '), Number(body.max_points || 100), Number(body.weightage_percent || 10), user.id]);
  await logActivity(user, 'assignment_created', { title: body.title });
  return json({ assignment_id: id }, 201);
});
