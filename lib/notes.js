// Shared definitions for the MongoDB side (used by the API and by scripts/setup-mongo.mjs)

export const NOTES_VALIDATOR = {
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
};

export const ACTIVITY_VALIDATOR = {
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
};

export function cleanTags(input) {
  const list = Array.isArray(input) ? input : String(input || '').split(',');
  return [...new Set(list.map((t) => String(t).trim().toLowerCase()).filter(Boolean))].slice(0, 10);
}

/** Notes a user may see: their own + everything shared. */
export const visibleTo = (user) => ({ $or: [{ owner_id: user.id }, { is_shared: true }] });
