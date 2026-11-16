// JWT session stored in an httpOnly cookie.
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

export const COOKIE_NAME = 'studysync_session';
const secret = () => new TextEncoder().encode(process.env.JWT_SECRET || 'dev-only-secret-change-me');

export async function createToken(user) {
  return new SignJWT({ id: user.id, name: user.name, email: user.email, role: user.role })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('8h')
    .sign(secret());
}

export async function verifyToken(token) {
  try {
    const { payload } = await jwtVerify(token, secret());
    return { id: payload.id, name: payload.name, email: payload.email, role: payload.role };
  } catch {
    return null;
  }
}

export async function getSession() {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  return token ? verifyToken(token) : null;
}

export const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: false, // local demo over http://localhost; set true behind HTTPS
  path: '/',
  maxAge: 60 * 60 * 8,
};
