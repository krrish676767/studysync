import { randomUUID } from 'node:crypto';
import { query } from '@/lib/db';
import { handler, json, need, requireUser, HttpError } from '@/lib/api';

export const POST = handler(async (request) => {
  const user = await requireUser();
  const body = await request.json();
  need(body, 'course_id', 'title', 'file_url');
  const id = randomUUID();
  await query(user.role,
    `INSERT INTO study_materials (material_id, course_id, uploader_id, title, material_type, file_url, plain_text)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, body.course_id, user.id, String(body.title).trim(), body.material_type || 'lecture_notes',
     String(body.file_url).trim(), body.plain_text || '']);
  return json({ material_id: id }, 201);
});

export const DELETE = handler(async (request) => {
  const user = await requireUser('instructor', 'admin');
  const id = new URL(request.url).searchParams.get('id');
  const result = await query(user.role,
    `DELETE m FROM study_materials m JOIN courses c ON c.course_id = m.course_id
      WHERE m.material_id = ? AND (? = 'admin' OR c.instructor_id = ?)`, [id, user.role, user.id]);
  if (!result.affectedRows) throw new HttpError(404, 'Material not found in one of your courses');
  return json({ ok: true });
});
