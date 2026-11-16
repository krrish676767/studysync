// ============================================================================
// StudySync : mongo/01_setup.js  -  MongoDB collections, validators, indexes, data
// Run with:   mongosh mongo/01_setup.js
// (npm run db:mongo does exactly the same from Node.js)
// ============================================================================
db = db.getSiblingDB('studysync');

db.notes.drop();
db.activity_logs.drop();

// ---------------------------------------------------------------- collections
// notes: one document per note, with embedded tags[] and flashcards[]
db.createCollection('notes', {
  validator: {
  $jsonSchema: {
    bsonType: 'object',
    required: ['owner_id', 'owner_name', 'title', 'content', 'tags', 'is_shared', 'flashcards', 'created_at', 'updated_at'],
    properties: {
      owner_id:    { bsonType: 'string', description: 'students.student_id in MySQL' },
      owner_name:  { bsonType: 'string' },
      course_code: { bsonType: ['string', 'null'], description: 'courses.course_code in MySQL' },
      title:       { bsonType: 'string', minLength: 1, maxLength: 200 },
      content:     { bsonType: 'string' },
      tags:        { bsonType: 'array', maxItems: 10, uniqueItems: true, items: { bsonType: 'string', minLength: 1, maxLength: 30 } },
      is_shared:   { bsonType: 'bool' },
      flashcards:  {
        bsonType: 'array',
        items: {
          bsonType: 'object',
          required: ['card_id', 'question', 'answer'],
          properties: {
            card_id:  { bsonType: 'string' },
            question: { bsonType: 'string', minLength: 1 },
            answer:   { bsonType: 'string', minLength: 1 },
          },
        },
      },
      revision:    { bsonType: ['int', 'long', 'double'] },
      created_at:  { bsonType: 'date' },
      updated_at:  { bsonType: 'date' },
    },
  },
},
  validationLevel: 'strict',
  validationAction: 'error',
});

// activity_logs: append-only event stream written by the API
db.createCollection('activity_logs', {
  validator: {
  $jsonSchema: {
    bsonType: 'object',
    required: ['action', 'role', 'at'],
    properties: {
      user_id:   { bsonType: ['string', 'null'] },
      user_name: { bsonType: 'string' },
      role:      { enum: ['student', 'instructor', 'admin', 'guest'] },
      action:    { bsonType: 'string' },
      details:   { bsonType: 'object' },
      at:        { bsonType: 'date' },
    },
  },
},
});

// -------------------------------------------------------------------- indexes
db.notes.createIndex({ title: 'text', tags: 'text', content: 'text' },
  { name: 'notes_text', weights: { title: 10, tags: 5, content: 1 } });          // full-text search
db.notes.createIndex({ owner_id: 1, updated_at: -1 }, { name: 'owner_recent' });  // compound
db.notes.createIndex({ tags: 1 }, { name: 'tags_multikey' });                    // multikey (array)
db.notes.createIndex({ course_code: 1, is_shared: 1 }, { name: 'course_shared' });

db.activity_logs.createIndex({ at: 1 }, { name: 'ttl_90_days', expireAfterSeconds: 90 * 86400 });  // TTL
db.activity_logs.createIndex({ user_id: 1, at: -1 }, { name: 'user_recent' });
db.activity_logs.createIndex({ action: 1 }, { name: 'by_action' });

// ---------------------------------------------------------------- sample data
// owner_id values are students.student_id in MySQL; course_code is courses.course_code
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

db.notes.insertMany([
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

db.activity_logs.insertMany([
  { user_id: KRRISH, user_name: 'Krrish P Raju', role: 'student', action: 'login', details: {}, at: daysAgo(3) },
  { user_id: KRRISH, user_name: 'Krrish P Raju', role: 'student', action: 'study_session_logged', details: { minutes: 75 }, at: daysAgo(2) },
  { user_id: KRRISH, user_name: 'Krrish P Raju', role: 'student', action: 'note_created', details: { title: 'Normalization quick revision' }, at: daysAgo(2) },
  { user_id: ROHIT, user_name: 'Rohit Sharma', role: 'student', action: 'login', details: {}, at: daysAgo(2) },
  { user_id: ROHIT, user_name: 'Rohit Sharma', role: 'student', action: 'assignment_submitted', details: { assignment_id: 'a207-nb', version: 1 }, at: daysAgo(4) },
  { user_id: MEERA, user_name: 'Meera Nair', role: 'student', action: 'assignment_submitted', details: { assignment_id: 'a204-dp', version: 1 }, at: daysAgo(1) },
  { user_id: ALAN, user_name: 'Prof. Alan Turing', role: 'instructor', action: 'login', details: {}, at: daysAgo(1) },
  { user_id: ALAN, user_name: 'Prof. Alan Turing', role: 'instructor', action: 'submission_graded', details: { submission_id: 9, points: 48 }, at: daysAgo(1) },
]);

print('notes:', db.notes.countDocuments(), ' activity_logs:', db.activity_logs.countDocuments());
printjson(db.notes.getIndexes().map((i) => i.name));
