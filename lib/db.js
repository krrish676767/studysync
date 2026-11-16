// MySQL access layer.
// One connection pool per database role: the pool is chosen from the role of
// the logged-in user, so MySQL's own GRANTs (sql/04_roles.sql) are what
// finally allow or deny every statement.
import mysql from 'mysql2/promise';

const ACCOUNTS = {
  student:    ['MYSQL_STUDENT_USER',    'MYSQL_STUDENT_PASSWORD',    'ss_student',    'StudySync@Student1'],
  instructor: ['MYSQL_INSTRUCTOR_USER', 'MYSQL_INSTRUCTOR_PASSWORD', 'ss_instructor', 'StudySync@Instructor1'],
  admin:      ['MYSQL_ADMIN_USER',      'MYSQL_ADMIN_PASSWORD',      'ss_admin',      'StudySync@Admin1'],
  auth:       ['MYSQL_AUTH_USER',       'MYSQL_AUTH_PASSWORD',       'ss_auth',       'StudySync@Auth1'],
};

const globalForDb = globalThis;
if (!globalForDb.__studysyncPools) globalForDb.__studysyncPools = {};

export function getPool(role) {
  const account = ACCOUNTS[role];
  if (!account) throw new Error(`Unknown database role: ${role}`);
  const pools = globalForDb.__studysyncPools;
  if (!pools[role]) {
    const [userKey, passKey, defUser, defPass] = account;
    pools[role] = mysql.createPool({
      host: process.env.MYSQL_HOST || '127.0.0.1',
      port: Number(process.env.MYSQL_PORT || 3306),
      database: process.env.MYSQL_DATABASE || 'studysync',
      user: process.env[userKey] || defUser,
      password: process.env[passKey] ?? defPass,
      waitForConnections: true,
      connectionLimit: 5,
      dateStrings: true,
      decimalNumbers: true,
    });
  }
  return pools[role];
}

/** Run a statement with the privileges of the given role. Returns the rows. */
export async function query(role, sql, params = []) {
  const [rows] = await getPool(role).query(sql, params);
  return rows;
}

/** CALL a procedure that returns a result set; gives back the first result set. */
export async function callProc(role, sql, params = []) {
  const [result] = await getPool(role).query(sql, params);
  return Array.isArray(result) && Array.isArray(result[0]) ? result[0] : result;
}

/** Run several statements on ONE connection (needed for OUT parameters / session variables). */
export async function withConnection(role, fn) {
  const conn = await getPool(role).getConnection();
  try {
    return await fn(conn);
  } finally {
    conn.release();
  }
}
