import { query } from '@/lib/db';
import { handler, json, requireUser, HttpError } from '@/lib/api';

async function ownAssignment(user, id) {
  const [row] = await query(user.role,
    `SELECT a.assignment_id, c.instructor_id FROM assignments a
       JOIN courses c ON c.course_id = a.course_id WHERE a.assignment_id = ?`, [id]);
  if (!row) throw new HttpError(404, 'Assignment not found');
  if (user.role !== 'admin' && row.instructor_id !== user.id) throw new HttpError(403, 'You do not teach this course');
}

export const PATCH = handler(async (request, { id }) => {
  const user = await requireUser('instructor', 'admin');
  await ownAssignment(user, id);
  const body = await request.json();
  await query(user.role,
    `UPDATE assignments
        SET title = COALESCE(?, title), description = COALESCE(?, description),
            due_date = COALESCE(?, due_date), max_points = COALESCE(?, max_points),
            weightage_percent = COALESCE(?, weightage_percent)
      WHERE assignment_id = ?`,
    [body.title ?? null, body.description ?? null, body.due_date ? String(body.due_date).replace('T', ' ') : null,
     body.max_points ?? null, body.weightage_percent ?? null, id]);
  return json({ ok: true });
});

export const DELETE = handler(async (_request, { id }) => {
  const user = await requireUser('instructor', 'admin');
  await ownAssignment(user, id);
  await query(user.role, 'DELETE FROM assignments WHERE assignment_id = ?', [id]); // submissions go via ON DELETE CASCADE
  return json({ ok: true });
});
