// Creates the MongoDB side of StudySync:  npm run db:mongo
//   - collections with $jsonSchema validators
//   - indexes (text, compound, multikey, TTL)
//   - sample documents
// Safe to re-run: it resets the two collections.
import { readFileSync, existsSync } from 'node:fs';
import { MongoClient } from 'mongodb';
import { NOTES_VALIDATOR, ACTIVITY_VALIDATOR } from '../lib/notes.js';

// read .env.local without extra dependencies
const envFile = new URL('../.env.local', import.meta.url);
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2];
  }
}

const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017';
const dbName = process.env.MONGODB_DB || 'studysync';
const client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });

const KRRISH = '11111111-1111-1111-1111-111111111111';
const ROHIT = '33333333-3333-3333-3333-333333333333';
const MEERA = '77777777-7777-7777-7777-777777777777';
const ALAN = '22222222-2222-2222-2222-222222222222';
const daysAgo = (d) => new Date(Date.now() - d * 86400000);
let cardNo = 0;
const card = (question, answer) => ({ card_id: `seed-card-${++cardNo}`, question, answer });
const note = (owner_id, owner_name, course_code, title, content, tags, is_shared, flashcards, age) => ({
  owner_id, owner_name, course_code, title, content, tags, is_shared, flashcards,
  revision: 1, created_at: daysAgo(age + 2), updated_at: daysAgo(age),
});

try {
  await client.connect();
  const db = client.db(dbName);

  for (const name of ['notes', 'activity_logs']) {
    await db.collection(name).drop().catch(() => {});
  }
  await db.createCollection('notes', { validator: NOTES_VALIDATOR, validationLevel: 'strict', validationAction: 'error' });
  await db.createCollection('activity_logs', { validator: ACTIVITY_VALIDATOR });

  const notes = db.collection('notes');
  await notes.createIndex({ title: 'text', tags: 'text', content: 'text' },
    { name: 'notes_text', weights: { title: 10, tags: 5, content: 1 } });
  await notes.createIndex({ owner_id: 1, updated_at: -1 }, { name: 'owner_recent' });
  await notes.createIndex({ tags: 1 }, { name: 'tags_multikey' });
  await notes.createIndex({ course_code: 1, is_shared: 1 }, { name: 'course_shared' });

  const logs = db.collection('activity_logs');
  await logs.createIndex({ at: 1 }, { name: 'ttl_90_days', expireAfterSeconds: 90 * 86400 });
  await logs.createIndex({ user_id: 1, at: -1 }, { name: 'user_recent' });
  await logs.createIndex({ action: 1 }, { name: 'by_action' });

  await notes.insertMany([
    note(KRRISH, 'Krrish P Raju', 'CS301', 'Normalization quick revision',
      '1NF: atomic values, no repeating groups.\n2NF: 1NF + no partial dependency on a composite key.\n3NF: 2NF + no transitive dependency.\nBCNF: every determinant is a candidate key.\n\nTrick: "the key, the whole key, and nothing but the key".',
      ['normalization', 'dbms', 'exam'], true,
      [card('What does 2NF remove?', 'Partial dependencies on a composite primary key.'),
       card('When is a relation in BCNF?', 'When every determinant is a candidate key.'),
       card('What does 3NF remove?', 'Transitive dependencies of non-key attributes.')], 2),
    note(KRRISH, 'Krrish P Raju', 'CS301', 'Triggers vs CHECK constraints',
      'CHECK can only look at the row being written. A rule that needs another table (marks <= max_points of the assignment) needs a BEFORE trigger with SIGNAL SQLSTATE 45000. AFTER triggers are used for audit logs.',
      ['triggers', 'dbms', 'sql'], true,
      [card('Which trigger timing is used for validation?', 'BEFORE INSERT / BEFORE UPDATE.')], 5),
    note(KRRISH, 'Krrish P Raju', 'CS302', 'Dynamic programming checklist',
      'Define the state. Write the recurrence. Decide the order of evaluation. Base cases. Then optimise space.\nKnapsack: dp[i][w] = max(dp[i-1][w], v[i] + dp[i-1][w-w[i]]).',
      ['dp', 'algorithms'], false,
      [card('Two properties needed for DP?', 'Optimal substructure and overlapping subproblems.')], 1),
    note(KRRISH, 'Krrish P Raju', null, 'Weekly study plan',
      'Mon/Wed: DBMS project. Tue/Thu: Algorithms problem sets. Fri: Networks lab. Weekend: revision and flashcards.',
      ['planning'], false, [], 0),
    note(ROHIT, 'Rohit Sharma', 'CS301', 'SQL joins cheat sheet',
      'INNER JOIN keeps matching rows only. LEFT JOIN keeps every row of the left table. A SELF JOIN joins a table to itself using aliases. Use NOT EXISTS for anti-joins.',
      ['sql', 'joins', 'dbms'], true,
      [card('Which join keeps unmatched left rows?', 'LEFT OUTER JOIN.')], 6),
    note(ROHIT, 'Rohit Sharma', 'CS304', 'Naive Bayes summary',
      'P(class | features) is proportional to P(class) * product of P(feature | class). Assumes conditional independence. Use Laplace smoothing to avoid zero probabilities.',
      ['ml', 'naive-bayes', 'exam'], true, [], 4),
    note(MEERA, 'Meera Nair', 'CS301', 'MongoDB aggregation stages',
      '$match filters, $group aggregates, $unwind explodes arrays, $project reshapes, $sort orders, $lookup joins another collection, $facet runs several pipelines at once.',
      ['mongodb', 'nosql', 'dbms'], true,
      [card('Which stage flattens an array field?', '$unwind'),
       card('Which stage is like GROUP BY?', '$group')], 3),
    note(MEERA, 'Meera Nair', 'CS301', 'Transactions and ACID',
      'Atomicity: all or nothing. Consistency: constraints hold. Isolation: concurrent transactions do not interfere. Durability: committed data survives a crash. Isolation levels: READ UNCOMMITTED, READ COMMITTED, REPEATABLE READ, SERIALIZABLE.',
      ['transactions', 'dbms', 'exam'], true,
      [card('Default isolation level of InnoDB?', 'REPEATABLE READ.')], 7),
    note(ALAN, 'Prof. Alan Turing', 'CS301', 'Instructor note: mini project rubric',
      'ER diagram, relational schema, DDL with constraints, DML, nested and join queries, procedures, functions, triggers, CTEs, NoSQL CRUD, Next.js interface, authentication with two roles.',
      ['dbms', 'project', 'rubric'], true, [], 10),
  ]);

  await logs.insertMany([
    { user_id: KRRISH, user_name: 'Krrish P Raju', role: 'student', action: 'login', details: {}, at: daysAgo(3) },
    { user_id: KRRISH, user_name: 'Krrish P Raju', role: 'student', action: 'study_session_logged', details: { minutes: 75 }, at: daysAgo(2) },
    { user_id: KRRISH, user_name: 'Krrish P Raju', role: 'student', action: 'note_created', details: { title: 'Normalization quick revision' }, at: daysAgo(2) },
    { user_id: ROHIT, user_name: 'Rohit Sharma', role: 'student', action: 'login', details: {}, at: daysAgo(2) },
    { user_id: ROHIT, user_name: 'Rohit Sharma', role: 'student', action: 'assignment_submitted', details: { assignment_id: 'a207-nb', version: 1 }, at: daysAgo(4) },
    { user_id: MEERA, user_name: 'Meera Nair', role: 'student', action: 'assignment_submitted', details: { assignment_id: 'a204-dp', version: 1 }, at: daysAgo(1) },
    { user_id: ALAN, user_name: 'Prof. Alan Turing', role: 'instructor', action: 'login', details: {}, at: daysAgo(1) },
    { user_id: ALAN, user_name: 'Prof. Alan Turing', role: 'instructor', action: 'submission_graded', details: { submission_id: 9, points: 48 }, at: daysAgo(1) },
  ]);

  console.log(`MongoDB "${dbName}" ready:`,
    await notes.countDocuments(), 'notes,',
    await logs.countDocuments(), 'activity log entries,',
    (await notes.indexes()).length + (await logs.indexes()).length, 'indexes');
} catch (err) {
  console.error('MongoDB setup failed:', err.message);
  process.exitCode = 1;
} finally {
  await client.close();
}
