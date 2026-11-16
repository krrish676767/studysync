import { query } from '@/lib/db';
import { handler, json, requireUser, HttpError } from '@/lib/api';

export const PATCH = handler(async (request, { id }) => {
  const user = await requireUser('student');
  const body = await request.json();
  // completed_at is maintained by the trigger trg_task_before_update
  const result = await query('student',
    `UPDATE study_tasks
        SET title = COALESCE(?, title), priority = COALESCE(?, priority), is_completed = COALESCE(?, is_completed)
      WHERE task_id = ? AND student_id = ?`,
    [body.title ?? null, body.priority ?? null,
     body.is_completed === undefined ? null : (body.is_completed ? 1 : 0), Number(id), user.id]);
  if (!result.affectedRows) throw new HttpError(404, 'Task not found');
  return json({ ok: true });
});

export const DELETE = handler(async (_request, { id }) => {
  const user = await requireUser('student');
  // sub-tasks disappear through ON DELETE CASCADE on fk_tasks_parent
  const result = await query('student', 'DELETE FROM study_tasks WHERE task_id = ? AND student_id = ?', [Number(id), user.id]);
  if (!result.affectedRows) throw new HttpError(404, 'Task not found');
  return json({ ok: true });
});
