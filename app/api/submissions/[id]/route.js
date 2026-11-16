import { query } from '@/lib/db';
import { handler, json, need, requireUser } from '@/lib/api';
import { logActivity } from '@/lib/mongo';

// Grade: sp_grade_submission checks that the caller teaches the course,
// trg_sub_before_update validates the marks, trg_sub_after_update writes the audit row.
export const PATCH = handler(async (request, { id }) => {
  const user = await requireUser('instructor', 'admin');
  const body = await request.json();
  need(body, 'points_awarded');
  await query(user.role, 'CALL sp_grade_submission(?, ?, ?, ?)',
    [Number(id), Number(body.points_awarded), body.feedback || null, user.id]);
  await logActivity(user, 'submission_graded', { submission_id: Number(id), points: Number(body.points_awarded) });
  return json({ ok: true });
});
