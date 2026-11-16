// Small helpers shared by every route handler.
import { NextResponse } from 'next/server';
import { getSession } from './auth';

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export const json = (data, status = 200) => NextResponse.json(data, { status });

/** Returns the logged-in user or throws 401 / 403. */
export async function requireUser(...allowedRoles) {
  const user = await getSession();
  if (!user) throw new HttpError(401, 'Please sign in');
  if (allowedRoles.length && !allowedRoles.includes(user.role)) {
    throw new HttpError(403, `This action needs the role: ${allowedRoles.join(' or ')}`);
  }
  return user;
}

export function need(body, ...fields) {
  for (const f of fields) {
    if (body[f] === undefined || body[f] === null || String(body[f]).trim() === '') {
      throw new HttpError(400, `Missing field: ${f}`);
    }
  }
}

/** Wraps a handler and converts database / validation errors into JSON responses. */
export function handler(fn) {
  return async (request, context) => {
    try {
      const params = context?.params ? await context.params : {};
      return await fn(request, params);
    } catch (err) {
      if (err instanceof HttpError || err.status) return json({ error: err.message }, err.status);
      // SIGNAL SQLSTATE '45000' raised by our procedures and triggers
      if (err.sqlState === '45000') return json({ error: err.sqlMessage }, 400);
      if (['ER_TABLEACCESS_DENIED_ERROR', 'ER_COLUMNACCESS_DENIED_ERROR', 'ER_PROCACCESS_DENIED_ERROR', 'ER_DBACCESS_DENIED_ERROR'].includes(err.code)) {
        return json({ error: `Denied by MySQL role privileges: ${err.sqlMessage}` }, 403);
      }
      if (err.code === 'ER_DUP_ENTRY') return json({ error: 'That record already exists (duplicate value)' }, 409);
      if (err.code === 'ER_CHECK_CONSTRAINT_VIOLATED') return json({ error: `Rejected by a CHECK constraint: ${err.sqlMessage}` }, 400);
      if (err.code === 'ER_ROW_IS_REFERENCED_2') return json({ error: 'Cannot delete: other records still reference this row (foreign key RESTRICT)' }, 409);
      if (err.code === 'ER_NO_REFERENCED_ROW_2') return json({ error: 'Referenced record does not exist (foreign key)' }, 400);
      if (err.code === 121 || err.codeName === 'DocumentValidationFailure') return json({ error: 'Rejected by the MongoDB schema validator' }, 400);
      if (err.code === 'ECONNREFUSED' || err.name === 'MongoServerSelectionError') {
        return json({ error: `Database is not reachable: ${err.message}` }, 503);
      }
      console.error(err);
      return json({ error: err.sqlMessage || err.message || 'Server error' }, 500);
    }
  };
}
