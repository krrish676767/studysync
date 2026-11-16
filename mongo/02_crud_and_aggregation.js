// ============================================================================
// StudySync : mongo/02_crud_and_aggregation.js
// CRUD operations, queries and aggregation pipelines on the notes collection.
// Run with:   mongosh mongo/02_crud_and_aggregation.js
// The demo document is removed at the end, so the data set is left unchanged.
// ============================================================================
db = db.getSiblingDB('studysync');
const KRRISH = '11111111-1111-1111-1111-111111111111';
const show = (title, value) => { print('\n--- ' + title); printjson(value); };

// ------------------------------------------------------------------ CREATE
const created = db.notes.insertOne({
  owner_id: KRRISH, owner_name: 'Krrish P Raju', course_code: 'CS301',
  title: 'Indexing in one page',
  content: 'A B+ tree index keeps keys sorted, so range scans are cheap. A hash index only helps equality lookups.',
  tags: ['indexing', 'dbms'], is_shared: false, flashcards: [],
  revision: 1, created_at: new Date(), updated_at: new Date(),
});
show('C1 insertOne', created);
const id = created.insertedId;

// The $jsonSchema validator rejects a document with a missing title and a wrong type
try {
  db.notes.insertOne({ owner_id: KRRISH, owner_name: 'Krrish P Raju', content: 42, tags: 'not-an-array' });
} catch (e) {
  show('C2 insert rejected by the validator', e.errInfo ? 'Document failed validation' : e.message);
}

// ------------------------------------------------------------------- READ
show('R1 find with a filter and projection (my notes, newest first)',
  db.notes.find({ owner_id: KRRISH }, { title: 1, tags: 1, updated_at: 1, _id: 0 }).sort({ updated_at: -1 }).toArray());

show('R2 comparison and logical operators (shared DBMS notes that have at least 2 flashcards)',
  db.notes.find({ $and: [{ is_shared: true }, { course_code: 'CS301' }, { 'flashcards.1': { $exists: true } }] },
    { title: 1, owner_name: 1, _id: 0 }).toArray());

show('R3 array operators (tagged exam AND dbms; any tag in a list)',
  { all: db.notes.find({ tags: { $all: ['exam', 'dbms'] } }, { title: 1, _id: 0 }).toArray(),
    in: db.notes.find({ tags: { $in: ['ml', 'dp'] } }, { title: 1, _id: 0 }).toArray() });

show('R4 query inside embedded documents ($elemMatch on flashcards)',
  db.notes.find({ flashcards: { $elemMatch: { question: /BCNF/ } } }, { title: 1, 'flashcards.$': 1, _id: 0 }).toArray());

show('R5 full-text search ranked by relevance',
  db.notes.find({ $text: { $search: 'normalization trigger' } }, { title: 1, score: { $meta: 'textScore' }, _id: 0 })
    .sort({ score: { $meta: 'textScore' } }).toArray());

show('R6 regular expression + count',
  { titles_starting_with_T: db.notes.find({ title: /^T/ }, { title: 1, _id: 0 }).toArray(),
    private_notes: db.notes.countDocuments({ is_shared: false }) });

// ------------------------------------------------------------------ UPDATE
show('U1 updateOne with $set, $inc and $currentDate',
  db.notes.updateOne({ _id: id },
    { $set: { is_shared: true, content: 'B+ tree: sorted keys, cheap range scans. Hash index: equality only.' },
      $inc: { revision: 1 }, $currentDate: { updated_at: true } }));

show('U2 $push an embedded flashcard, $addToSet a tag',
  db.notes.updateOne({ _id: id },
    { $push: { flashcards: { card_id: 'demo-1', question: 'Which index supports range queries?', answer: 'B+ tree' } },
      $addToSet: { tags: 'exam' } }));

show('U3 positional operator: edit one embedded flashcard',
  db.notes.updateOne({ _id: id, 'flashcards.card_id': 'demo-1' },
    { $set: { 'flashcards.$.answer': 'A B+ tree index (leaf nodes are linked)' } }));

show('U4 $pull the flashcard out again',
  db.notes.updateOne({ _id: id }, { $pull: { flashcards: { card_id: 'demo-1' } } }));

show('U5 updateMany + upsert',
  { many: db.notes.updateMany({ course_code: 'CS301', tags: 'exam' }, { $set: { exam_relevant: true } }),
    upsert: db.activity_logs.updateOne({ action: 'demo_marker' },
      { $set: { role: 'admin', user_name: 'script', details: {}, at: new Date() } }, { upsert: true }) });

show('document after the updates', db.notes.findOne({ _id: id }));

// ------------------------------------------------------------- AGGREGATION
show('A1 tag cloud: $unwind + $group + $sort',
  db.notes.aggregate([
    { $unwind: '$tags' },
    { $group: { _id: '$tags', notes: { $sum: 1 } } },
    { $sort: { notes: -1, _id: 1 } },
    { $limit: 5 },
  ]).toArray());

show('A2 per-course summary: $group with $size, $addToSet, $max',
  db.notes.aggregate([
    { $group: { _id: { $ifNull: ['$course_code', 'General'] },
                notes: { $sum: 1 },
                flashcards: { $sum: { $size: '$flashcards' } },
                authors: { $addToSet: '$owner_name' },
                last_update: { $max: '$updated_at' } } },
    { $project: { _id: 0, course: '$_id', notes: 1, flashcards: 1, authors: { $size: '$authors' } } },
    { $sort: { notes: -1 } },
  ]).toArray());

show('A3 top note authors with $facet (two pipelines in one pass)',
  db.notes.aggregate([
    { $facet: {
        by_author: [{ $group: { _id: '$owner_name', notes: { $sum: 1 } } }, { $sort: { notes: -1 } }],
        visibility: [{ $group: { _id: { $cond: ['$is_shared', 'shared', 'private'] }, notes: { $sum: 1 } } }],
    } },
  ]).toArray());

show('A4 $lookup: join each user in activity_logs with the notes they own',
  db.activity_logs.aggregate([
    { $match: { user_id: { $ne: null } } },
    { $group: { _id: '$user_id', name: { $first: '$user_name' }, events: { $sum: 1 } } },
    { $lookup: { from: 'notes', localField: '_id', foreignField: 'owner_id', as: 'notes' } },
    { $project: { _id: 0, name: 1, events: 1, notes_owned: { $size: '$notes' } } },
    { $sort: { events: -1 } },
  ]).toArray());

show('A5 daily activity: $dateToString + $group',
  db.activity_logs.aggregate([
    { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$at' } }, events: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]).toArray());

show('index usage: explain() shows the text index being used',
  db.notes.find({ $text: { $search: 'normalization' } }).explain().queryPlanner.winningPlan.stage
    + ' / ' + JSON.stringify(db.notes.find({ tags: 'dbms' }).explain().queryPlanner.winningPlan.inputStage?.indexName));

// ------------------------------------------------------------------ DELETE
show('D1 deleteOne', db.notes.deleteOne({ _id: id }));
show('D2 deleteMany + $unset clean-up',
  { markers: db.activity_logs.deleteMany({ action: 'demo_marker' }),
    unset: db.notes.updateMany({}, { $unset: { exam_relevant: '' } }) });

print('\nnotes left: ' + db.notes.countDocuments());
