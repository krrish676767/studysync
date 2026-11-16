import { query } from '@/lib/db';
import { handler, json, requireUser } from '@/lib/api';

export const GET = handler(async () => {
  await requireUser('admin');
  const audit = await query('admin',
    `SELECT g.audit_id, a.title AS assignment, s.full_name AS student, g.old_points, g.new_points,
            g.old_status, g.new_status, g.changed_by, g.changed_at
       FROM grade_audit_log g
       JOIN assignments a ON a.assignment_id = g.assignment_id
       JOIN students s    ON s.student_id = g.student_id
      ORDER BY g.changed_at DESC, g.audit_id DESC LIMIT 50`);
  return json({ audit });
});
