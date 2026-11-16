// Quick health check for both databases:  npm run db:check
import { readFileSync, existsSync } from 'node:fs';
import mysql from 'mysql2/promise';
import { MongoClient } from 'mongodb';

const envFile = new URL('../.env.local', import.meta.url);
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2];
  }
}
const env = (k, d) => process.env[k] ?? d;
let failed = false;

for (const [role, user, pass] of [
  ['student', env('MYSQL_STUDENT_USER', 'ss_student'), env('MYSQL_STUDENT_PASSWORD', 'StudySync@Student1')],
  ['instructor', env('MYSQL_INSTRUCTOR_USER', 'ss_instructor'), env('MYSQL_INSTRUCTOR_PASSWORD', 'StudySync@Instructor1')],
  ['admin', env('MYSQL_ADMIN_USER', 'ss_admin'), env('MYSQL_ADMIN_PASSWORD', 'StudySync@Admin1')],
  ['auth', env('MYSQL_AUTH_USER', 'ss_auth'), env('MYSQL_AUTH_PASSWORD', 'StudySync@Auth1')],
]) {
  try {
    const conn = await mysql.createConnection({
      host: env('MYSQL_HOST', '127.0.0.1'), port: Number(env('MYSQL_PORT', 3306)),
      database: env('MYSQL_DATABASE', 'studysync'), user, password: pass,
    });
    const [[row]] = await conn.query('SELECT COUNT(*) AS n FROM students');
    console.log(`OK    MySQL as ${user} (${role}): ${row.n} users visible`);
    await conn.end();
  } catch (err) {
    failed = true;
    console.log(`FAIL  MySQL as ${user} (${role}): ${err.message}`);
  }
}

const client = new MongoClient(env('MONGODB_URI', 'mongodb://127.0.0.1:27017'), { serverSelectionTimeoutMS: 4000 });
try {
  await client.connect();
  const db = client.db(env('MONGODB_DB', 'studysync'));
  console.log(`OK    MongoDB: ${await db.collection('notes').countDocuments()} notes, ${await db.collection('activity_logs').countDocuments()} activity log entries`);
} catch (err) {
  failed = true;
  console.log(`FAIL  MongoDB: ${err.message}`);
} finally {
  await client.close();
}
process.exitCode = failed ? 1 : 0;
