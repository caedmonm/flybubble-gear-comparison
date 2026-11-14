import { readFile } from 'node:fs/promises';
import mysql from 'mysql2/promise';

export const mysqlConfigured = (env = process.env) =>
  !!env.DB_USER && !!env.DB_PASSWORD && env.DB_PASSWORD !== 'hide';

export async function mysqlOptions(env = process.env) {
  if (!mysqlConfigured(env))
    throw new Error('Set DB_USER and DB_PASSWORD before enabling MySQL.');
  const ca =
    env.DB_CA_CERT ||
    (env.DB_CA_PATH ? await readFile(env.DB_CA_PATH, 'utf8') : undefined);
  return {
    host: env.DB_HOST,
    port: Number(env.DB_PORT || 25060),
    database: env.DB_NAME || 'defaultdb',
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    connectTimeout: 10000,
    multipleStatements: false,
    ssl: { rejectUnauthorized: true, ...(ca ? { ca } : {}) },
  };
}

export function databasePool(env = process.env, connectionLimit = 3, queueLimit = 10) {
  let pending;
  return {
    get() {
      pending ??= mysqlOptions(env)
        .then(options => mysql.createPool({ ...options, connectionLimit, queueLimit }))
        .catch(error => { pending = undefined; throw error; });
      return pending;
    },
    async close() {
      const pool = await pending;
      if (pool) { pending = undefined; await pool.end(); }
    },
  };
}
