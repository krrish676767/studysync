import { getDb } from '@/lib/mongo';
import { handler, json, requireUser } from '@/lib/api';
import { visibleTo } from '@/lib/notes';

// Aggregation pipelines over the notes collection
export const GET = handler(async () => {
  const user = await requireUser();
  const db = await getDb();
  const notes = db.collection('notes');

  // 1. tag cloud: $unwind the tags array, then $group
  const tags = await notes.aggregate([
    { $match: visibleTo(user) },
    { $unwind: '$tags' },
    { $group: { _id: '$tags', notes: { $sum: 1 } } },
    { $sort: { notes: -1, _id: 1 } },
    { $limit: 20 },
    { $project: { _id: 0, tag: '$_id', notes: 1 } },
  ]).toArray();

  // 2. per course: note count, flashcard count, contributors
  const byCourse = await notes.aggregate([
    { $match: visibleTo(user) },
    { $group: {
        _id: { $ifNull: ['$course_code', 'General'] },
        notes: { $sum: 1 },
        flashcards: { $sum: { $size: '$flashcards' } },
        authors: { $addToSet: '$owner_name' },
        last_update: { $max: '$updated_at' },
    } },
    { $project: { _id: 0, course_code: '$_id', notes: 1, flashcards: 1, authors: { $size: '$authors' }, last_update: 1 } },
    { $sort: { notes: -1, course_code: 1 } },
  ]).toArray();

  // 3. $facet: several summaries in one round trip
  const [facet] = await notes.aggregate([
    { $match: visibleTo(user) },
    { $facet: {
        totals: [{ $group: { _id: null, notes: { $sum: 1 }, flashcards: { $sum: { $size: '$flashcards' } },
                             shared: { $sum: { $cond: ['$is_shared', 1, 0] } } } }],
        mine: [{ $match: { owner_id: user.id } }, { $count: 'notes' }],
    } },
  ]).toArray();

  return json({
    tags,
    byCourse,
    totals: { notes: 0, flashcards: 0, shared: 0, ...(facet.totals[0] || {}), mine: facet.mine[0]?.notes || 0 },
  });
});
