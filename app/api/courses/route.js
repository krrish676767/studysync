import { randomUUID } from 'node:crypto';
import { query } from '@/lib/db';
import { handler, json, need, requireUser } from '@/lib/api';
import { logActivity } from '@/lib/mongo';

export const GET = handler(async (request) => {
  const user = await requireUser();
  const q = (new URL(request.url).searchParams.get('q') || '').trim();
  const like = `%${q}%`;
  const courses = await query(user.role,
    `SELECT c.course_id, c.course_code, c.title, c.department, c.credits, c.max_seats, c.is_archived,
            c.instructor_id, i.full_name AS instructor,
            (SELECT COUNT(*) FROM course_enrollments e
              WHERE e.course_id = c.course_id AND e.enrollment_status <> 'dropped') AS seats_taken,
            me.enrollment_status AS my_status
       FROM courses c
       JOIN students i ON i.student_id = c.instructor_id
       LEFT JOIN course_enrollments me ON me.course_id = c.course_id AND me.student_id = ?
      WHERE (? = '' OR c.title LIKE ? OR c.course_code LIKE ? OR c.department LIKE ?)
      ORDER BY c.course_code`, [user.id, q, like, like, like]);
  return json({ courses });
});

export const POST = handler(async (request) => {
  const user = await requireUser('instructor', 'admin');
  const body = await request.json();
  need(body, 'course_code', 'title', 'department');
  const modules = String(body.modules || '').split(',').map((m) => m.trim()).filter(Boolean);
  const id = randomUUID();
  await query(user.role,
    `INSERT INTO courses (course_id, instructor_id, course_code, title, department, credits, syllabus_json, max_seats)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, user.role === 'admin' && body.instructor_id ? body.instructor_id : user.id,
     String(body.course_code).trim().toUpperCase(), String(body.title).trim(), String(body.department).trim(),
     Number(body.credits || 3), JSON.stringify({ modules }), Number(body.max_seats || 60)]);
  await logActivity(user, 'course_created', { course_code: body.course_code });
  return json({ course_id: id }, 201);
});
