import { query } from '@/lib/db';
import { handler, json, requireUser, HttpError } from '@/lib/api';

export const PATCH = handler(async (request, { id }) => {
  const user = await requireUser('student');
  const body = await request.json();
  const result = await query('student',
    `UPDATE study_sessions SET focus_score = COALESCE(?, focus_score), notes = COALESCE(?, notes)
      WHERE session_id = ? AND student_id = ?`, [body.focus_score ?? null, body.notes ?? null, Number(id), user.id]);
  if (!result.affectedRows) throw new HttpError(404, 'Session not found');
  return json({ ok: true });
});

export const DELETE = handler(async (_request, { id }) => {
  const user = await requireUser('student');
  const result = await query('student', 'DELETE FROM study_sessions WHERE session_id = ? AND student_id = ?', [Number(id), user.id]);
  if (!result.affectedRows) throw new HttpError(404, 'Session not found');
  return json({ ok: true });
});
