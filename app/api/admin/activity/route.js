import { getDb } from '@/lib/mongo';
import { handler, json, requireUser } from '@/lib/api';

// Analytics over the MongoDB activity_logs collection
export const GET = handler(async () => {
  await requireUser('admin');
  const db = await getDb();
  const logs = db.collection('activity_logs');

  const byAction = await logs.aggregate([
    { $group: { _id: '$action', events: { $sum: 1 }, last_seen: { $max: '$at' } } },
    { $sort: { events: -1 } },
    { $project: { _id: 0, action: '$_id', events: 1, last_seen: 1 } },
  ]).toArray();

  const byDay = await logs.aggregate([
    { $match: { at: { $gte: new Date(Date.now() - 14 * 86400000) } } },
    { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$at' } },
                events: { $sum: 1 }, users: { $addToSet: '$user_id' } } },
    { $project: { _id: 0, day: '$_id', events: 1, active_users: { $size: '$users' } } },
    { $sort: { day: 1 } },
  ]).toArray();

  const topUsers = await logs.aggregate([
    { $match: { user_id: { $ne: null } } },
    { $group: { _id: { id: '$user_id', name: '$user_name', role: '$role' }, events: { $sum: 1 } } },
    { $sort: { events: -1 } },
    { $limit: 5 },
    { $project: { _id: 0, name: '$_id.name', role: '$_id.role', events: 1 } },
  ]).toArray();

  const recent = await logs.find({}, { projection: { _id: 0 } }).sort({ at: -1 }).limit(25).toArray();
  return json({ byAction, byDay, topUsers, recent });
});
