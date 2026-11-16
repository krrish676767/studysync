import bcrypt from 'bcryptjs';
import { query } from '@/lib/db';
import { handler, json, need, HttpError } from '@/lib/api';
import { createToken, COOKIE_NAME, cookieOptions } from '@/lib/auth';
import { logActivity } from '@/lib/mongo';

export const POST = handler(async (request) => {
  const body = await request.json();
  need(body, 'email', 'password');
  const email = String(body.email).trim().toLowerCase();

  // ss_auth is the only non-admin MySQL account allowed to read password_hash
  const rows = await query('auth',
    'SELECT student_id, email, password_hash, full_name, role, is_active FROM students WHERE email = ?', [email]);
  const row = rows[0];
  if (!row || !(await bcrypt.compare(String(body.password), row.password_hash))) {
    await logActivity(null, 'login_failed', { email });
    throw new HttpError(401, 'Wrong e-mail or password');
  }
  if (!row.is_active) throw new HttpError(403, 'This account has been deactivated by an administrator');

  await query('auth', 'UPDATE students SET last_login_at = NOW() WHERE student_id = ?', [row.student_id]);
  const user = { id: row.student_id, name: row.full_name, email: row.email, role: row.role };
  await logActivity(user, 'login');

  const res = json({ user });
  res.cookies.set(COOKIE_NAME, await createToken(user), cookieOptions);
  return res;
});
