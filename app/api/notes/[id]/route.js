import { getDb, toObjectId, logActivity } from '@/lib/mongo';
import { handler, json, requireUser, HttpError } from '@/lib/api';
import { cleanTags, visibleTo } from '@/lib/notes';

export const GET = handler(async (_request, { id }) => {
  const user = await requireUser();
  const db = await getDb();
  const note = await db.collection('notes').findOne({ $and: [{ _id: toObjectId(id) }, visibleTo(user)] });
  if (!note) throw new HttpError(404, 'Note not found');
  return json({ note });
});

// UPDATE: $set changed fields, $inc the revision counter, $currentDate the timestamp
export const PUT = handler(async (request, { id }) => {
  const user = await requireUser();
  const body = await request.json();
  const $set = {};
  if (body.title !== undefined) $set.title = String(body.title).trim();
  if (body.content !== undefined) $set.content = String(body.content);
  if (body.tags !== undefined) $set.tags = cleanTags(body.tags);
  if (body.is_shared !== undefined) $set.is_shared = Boolean(body.is_shared);
  if (body.course_code !== undefined) $set.course_code = body.course_code ? String(body.course_code).trim().toUpperCase() : null;

  const db = await getDb();
  const result = await db.collection('notes').updateOne(
    { _id: toObjectId(id), owner_id: user.id },
    { $set, $inc: { revision: 1 }, $currentDate: { updated_at: true } });
  if (!result.matchedCount) throw new HttpError(404, 'Note not found, or you are not its owner');
  return json({ ok: true });
});

// DELETE: owner, or an admin moderating shared notes
export const DELETE = handler(async (_request, { id }) => {
  const user = await requireUser();
  const db = await getDb();
  const filter = user.role === 'admin' ? { _id: toObjectId(id) } : { _id: toObjectId(id), owner_id: user.id };
  const result = await db.collection('notes').deleteOne(filter);
  if (!result.deletedCount) throw new HttpError(404, 'Note not found, or you are not its owner');
  await logActivity(user, 'note_deleted', { note_id: id });
  return json({ ok: true });
});
