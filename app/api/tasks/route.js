import { query } from '@/lib/db';
import { handler, json, need, requireUser, HttpError } from '@/lib/api';

// The planner is a tree, read with a recursive CTE.
export const GET = handler(async () => {
  const user = await requireUser('student');
  const tasks = await query('student',
    `WITH RECURSIVE task_tree AS (
         SELECT task_id, parent_task_id, course_id, title, priority, due_date, is_completed, completed_at,
                0 AS depth, CAST(LPAD(task_id, 8, '0') AS CHAR(1000)) AS path
           FROM study_tasks
          WHERE parent_task_id IS NULL AND student_id = ?
         UNION ALL
         SELECT t.task_id, t.parent_task_id, t.course_id, t.title, t.priority, t.due_date, t.is_completed, t.completed_at,
                tt.depth + 1, CONCAT(tt.path, '/', LPAD(t.task_id, 8, '0'))
           FROM study_tasks t
           JOIN task_tree tt ON t.parent_task_id = tt.task_id
     )
     SELECT tt.task_id, tt.parent_task_id, tt.title, tt.priority, tt.due_date, tt.is_completed, tt.completed_at,
            tt.depth, c.course_code,
            (SELECT COUNT(*) FROM study_tasks ch WHERE ch.parent_task_id = tt.task_id) AS child_count
       FROM task_tree tt
       LEFT JOIN courses c ON c.course_id = tt.course_id
      ORDER BY tt.path`, [user.id]);
  const courses = await query('student',
    `SELECT c.course_id, c.course_code FROM course_enrollments e JOIN courses c ON c.course_id = e.course_id
      WHERE e.student_id = ? AND e.enrollment_status <> 'dropped' ORDER BY c.course_code`, [user.id]);
  return json({ tasks, courses });
});

export const POST = handler(async (request) => {
  const user = await requireUser('student');
  const body = await request.json();
  need(body, 'title');
  let courseId = body.course_id || null;
  if (body.parent_task_id) {
    const [parent] = await query('student',
      'SELECT course_id FROM study_tasks WHERE task_id = ? AND student_id = ?', [Number(body.parent_task_id), user.id]);
    if (!parent) throw new HttpError(404, 'Parent task not found');
    courseId = courseId || parent.course_id;
  }
  const result = await query('student',
    `INSERT INTO study_tasks (student_id, course_id, parent_task_id, title, priority, due_date)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [user.id, courseId, body.parent_task_id ? Number(body.parent_task_id) : null,
     String(body.title).trim(), body.priority || 'medium', body.due_date || null]);
  return json({ task_id: result.insertId }, 201);
});
