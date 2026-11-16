// MongoDB access layer (NoSQL side: notes + activity log).
import { MongoClient, ObjectId } from 'mongodb';

const globalForMongo = globalThis;

export async function getDb() {
  if (!globalForMongo.__studysyncMongo) {
    const client = new MongoClient(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017', {
      serverSelectionTimeoutMS: 4000,
    });
    globalForMongo.__studysyncMongo = client.connect().catch((err) => {
      globalForMongo.__studysyncMongo = null;
      throw err;
    });
  }
  const client = await globalForMongo.__studysyncMongo;
  return client.db(process.env.MONGODB_DB || 'studysync');
}

export function toObjectId(id) {
  if (!ObjectId.isValid(id)) {
    const err = new Error('Invalid note id');
    err.status = 400;
    throw err;
  }
  return new ObjectId(id);
}

/** Append an event to the activity_logs collection. Never breaks the request. */
export async function logActivity(user, action, details = {}) {
  try {
    const db = await getDb();
    await db.collection('activity_logs').insertOne({
      user_id: user?.id || null,
      user_name: user?.name || 'anonymous',
      role: user?.role || 'guest',
      action,
      details,
      at: new Date(),
    });
  } catch (err) {
    console.warn('[activity log skipped]', err.message);
  }
}
