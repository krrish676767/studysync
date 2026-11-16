import { json } from '@/lib/api';
import { COOKIE_NAME, cookieOptions } from '@/lib/auth';

export async function POST() {
  const res = json({ ok: true });
  res.cookies.set(COOKIE_NAME, '', { ...cookieOptions, maxAge: 0 });
  return res;
}
