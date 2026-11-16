import { query } from '@/lib/db';
import { handler, json, requireUser, HttpError } from '@/lib/api';
import { logActivity } from '@/lib/mongo';

export const PATCH = handler(async (request, { id }) => {
  const admin = await requireUser('admin');
  const body = await request.json();
  if (id === admin.id && (body.role && body.role !== 'admin' || body.is_active === false)) {
    throw new HttpError(400, 'You cannot demote or deactivate your own admin account');
  }
  const result = await query('admin',
    'UPDATE students SET role = COALESCE(?, role), is_active = COALESCE(?, is_active) WHERE student_id = ?',
    [body.role ?? null, body.is_active === undefined ? null : (body.is_active ? 1 : 0), id]);
  if (!result.affectedRows) throw new HttpError(404, 'User not found');
  await logActivity(admin, 'user_updated', { user_id: id, role: body.role, is_active: body.is_active });
  return json({ ok: true });
});

export const DELETE = handler(async (_request, { id }) => {
  const admin = await requireUser('admin');
  if (id === admin.id) throw new HttpError(400, 'You cannot delete your own account');
  // Fails with FK RESTRICT if the user still teaches a course; enrollments, sessions,
  // submissions and tasks are removed by ON DELETE CASCADE.
  const result = await query('admin', 'DELETE FROM students WHERE student_id = ?', [id]);
  if (!result.affectedRows) throw new HttpError(404, 'User not found');
  await logActivity(admin, 'user_deleted', { user_id: id });
  return json({ ok: true });
});
