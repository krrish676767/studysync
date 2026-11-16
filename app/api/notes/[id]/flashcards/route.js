import { randomUUID } from 'node:crypto';
import { getDb, toObjectId } from '@/lib/mongo';
import { handler, json, need, requireUser, HttpError } from '@/lib/api';

// Flashcards are EMBEDDED documents inside a note: $push adds one, $pull removes one.
export const POST = handler(async (request, { id }) => {
  const user = await requireUser();
  const body = await request.json();
  need(body, 'question', 'answer');
  const card = { card_id: randomUUID(), question: String(body.question).trim(), answer: String(body.answer).trim() };
  const db = await getDb();
  const result = await db.collection('notes').updateOne(
    { _id: toObjectId(id), owner_id: user.id },
    { $push: { flashcards: card }, $currentDate: { updated_at: true } });
  if (!result.matchedCount) throw new HttpError(404, 'Note not found, or you are not its owner');
  return json({ card }, 201);
});

export const DELETE = handler(async (request, { id }) => {
  const user = await requireUser();
  const cardId = new URL(request.url).searchParams.get('card_id');
  const db = await getDb();
  const result = await db.collection('notes').updateOne(
    { _id: toObjectId(id), owner_id: user.id },
    { $pull: { flashcards: { card_id: cardId } }, $currentDate: { updated_at: true } });
  if (!result.modifiedCount) throw new HttpError(404, 'Flashcard not found');
  return json({ ok: true });
});
