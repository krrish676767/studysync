import { getDb, logActivity } from '@/lib/mongo';
import { handler, json, need, requireUser } from '@/lib/api';
import { cleanTags, visibleTo } from '@/lib/notes';

// READ: list / full-text search / filter by tag, course and scope
export const GET = handler(async (request) => {
  const user = await requireUser();
  const sp = new URL(request.url).searchParams;
  const q = (sp.get('q') || '').trim();
  const tag = (sp.get('tag') || '').trim();
  const course = (sp.get('course') || '').trim();
  const scope = sp.get('scope') || 'all';

  const filter = { $and: [visibleTo(user)] };
  if (scope === 'mine') filter.$and.push({ owner_id: user.id });
  if (scope === 'shared') filter.$and.push({ is_shared: true, owner_id: { $ne: user.id } });
  if (tag) filter.$and.push({ tags: tag });
  if (course) filter.$and.push({ course_code: course });
  if (q) filter.$and.push({ $text: { $search: q } });

  const db = await getDb();
  const projection = { content: 1, title: 1, tags: 1, course_code: 1, owner_id: 1, owner_name: 1, is_shared: 1,
                       flashcards: 1, revision: 1, updated_at: 1, created_at: 1 };
  if (q) projection.score = { $meta: 'textScore' };
  const notes = await db.collection('notes')
    .find(filter, { projection })
    .sort(q ? { score: { $meta: 'textScore' } } : { updated_at: -1 })
    .limit(100)
    .toArray();
  return json({ notes });
});

// CREATE
export const POST = handler(async (request) => {
  const user = await requireUser();
  const body = await request.json();
  need(body, 'title');
  const now = new Date();
  const doc = {
    owner_id: user.id,
    owner_name: user.name,
    course_code: body.course_code ? String(body.course_code).trim().toUpperCase() : null,
    title: String(body.title).trim(),
    content: String(body.content || ''),
    tags: cleanTags(body.tags),
    is_shared: Boolean(body.is_shared),
    flashcards: [],
    revision: 1,
    created_at: now,
    updated_at: now,
  };
  const db = await getDb();
  const result = await db.collection('notes').insertOne(doc);
  await logActivity(user, 'note_created', { title: doc.title });
  return json({ _id: result.insertedId }, 201);
});
