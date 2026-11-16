import { getPool } from '@/lib/db';
import { handler, json, requireUser, HttpError } from '@/lib/api';
import { QUERY_CATALOG, LEVEL_LABELS } from '@/lib/queryCatalog';

const visible = (q, role) => !q.roles || q.roles.includes(role);

export const GET = handler(async () => {
  const user = await requireUser();
  return json({
    levels: LEVEL_LABELS,
    queries: QUERY_CATALOG.filter((q) => visible(q, user.role)),
  });
});

// Runs ONE catalogued query (never free-form SQL) with the MySQL account of the caller's role.
export const POST = handler(async (request) => {
  const user = await requireUser();
  const { id } = await request.json();
  const q = QUERY_CATALOG.find((x) => x.id === id);
  if (!q || !visible(q, user.role)) throw new HttpError(404, 'Unknown query');

  const started = performance.now();
  const [result, fields] = await getPool(user.role).query(q.sql);
  const ms = Math.round((performance.now() - started) * 10) / 10;

  const isCall = Array.isArray(result) && Array.isArray(result[0]);
  const rows = isCall ? result[0] : result;
  const fieldList = isCall ? fields[0] : fields;
  return json({ id, columns: (fieldList || []).map((f) => f.name), rows, ms, dbUser: `ss_${user.role}` });
});
