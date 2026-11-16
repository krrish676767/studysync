import bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import { query } from '@/lib/db';
import { handler, json, need, HttpError } from '@/lib/api';
import { createToken, COOKIE_NAME, cookieOptions } from '@/lib/auth';
import { logActivity } from '@/lib/mongo';

// Self-registration always creates a STUDENT. Instructors and admins are
// promoted by an admin from the Admin page.
export const POST = handler(async (request) => {
  const body = await request.json();
  need(body, 'full_name', 'email', 'password', 'enrollment_no', 'current_semester');
  if (String(body.password).length < 8) throw new HttpError(400, 'Password must be at least 8 characters');

  const user = {
    id: randomUUID(),
    name: String(body.full_name).trim(),
    email: String(body.email).trim().toLowerCase(),
    role: 'student',
  };
  const hash = await bcrypt.hash(String(body.password), 10);
  await query('auth',
    `INSERT INTO students (student_id, email, password_hash, full_name, enrollment_no, current_semester, role)
     VALUES (?, ?, ?, ?, ?, ?, 'student')`,
    [user.id, user.email, hash, user.name, String(body.enrollment_no).trim().toUpperCase(), Number(body.current_semester)]);
  await logActivity(user, 'register');

  const res = json({ user }, 201);
  res.cookies.set(COOKIE_NAME, await createToken(user), cookieOptions);
  return res;
});
