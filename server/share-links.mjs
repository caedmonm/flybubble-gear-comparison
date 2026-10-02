import { createHash, randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import mysql from 'mysql2/promise';

export const shareTableSql = `CREATE TABLE IF NOT EXISTS gear_share_links (
  id CHAR(12) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
  digest CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL UNIQUE,
  target TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB`;

/** Only catalogue paths may be saved; never redirects to external sites.
 * @param {unknown} target
 */
export function validateShareTarget(target) {
  if (
    typeof target !== 'string' ||
    target.length > 8192 ||
    !target.startsWith('/') ||
    target.startsWith('//')
  )
    throw new Error('Invalid share target');
  const url = new URL(target, 'https://share.invalid');
  if (
    url.origin !== 'https://share.invalid' ||
    !['/wings', '/reserves'].includes(url.pathname) ||
    url.hash
  )
    throw new Error('Invalid share target');
  // Query-key order is immaterial; repeated item order preserves comparison columns.
  url.searchParams.sort();
  return `${url.pathname}${url.search}`;
}

export function createShareLinkService(env = process.env) {
  let pool;
  function getPool() {
    pool ||= connect();
    return pool;
  }
  async function connect() {
    const password = env.SHARE_DB_PASSWORD || env.DB_PASSWORD;
    if (!password || password === 'hide')
      throw new Error('Share database is not configured');
    const ca =
      env.SHARE_DB_CA_CERT ||
      env.DB_CA_CERT ||
      (env.DB_CA_PATH ? await readFile(env.DB_CA_PATH, 'utf8') : undefined);
    return mysql.createPool({
      host: env.SHARE_DB_HOST || env.DB_HOST,
      port: Number(env.SHARE_DB_PORT || env.DB_PORT || 25060),
      database: env.SHARE_DB_NAME || env.DB_NAME || 'defaultdb',
      user: env.SHARE_DB_USER || env.DB_USER,
      password,
      connectionLimit: 3,
      queueLimit: 10,
      connectTimeout: 10000,
      multipleStatements: false,
      ssl: { rejectUnauthorized: true, ...(ca ? { ca } : {}) },
    });
  }
  return {
    async create(target) {
      const canonical = validateShareTarget(target);
      const digest = createHash('sha256').update(canonical).digest('hex');
      const db = await getPool();
      for (let attempt = 0; attempt < 3; attempt++) {
        const id = randomBytes(9).toString('base64url');
        try {
          await db.execute(
            {
              sql: 'INSERT INTO gear_share_links (id, digest, target) VALUES (?, ?, ?)',
              timeout: 10000,
            },
            [id, digest, canonical],
          );
        } catch (error) {
          if (error.code !== 'ER_DUP_ENTRY') throw error;
        }
        const [rows] = await db.execute(
          {
            sql: 'SELECT id FROM gear_share_links WHERE digest = ? LIMIT 1',
            timeout: 10000,
          },
          [digest],
        );
        if (rows.length) return rows[0].id;
      }
      throw new Error('Could not allocate share ID');
    },
    async resolve(id) {
      if (typeof id !== 'string' || !/^[A-Za-z0-9_-]{12}$/.test(id))
        return null;
      const db = await getPool();
      const [rows] = await db.execute(
        {
          sql: 'SELECT target FROM gear_share_links WHERE id = ? LIMIT 1',
          timeout: 10000,
        },
        [id],
      );
      return rows.length ? validateShareTarget(rows[0].target) : null;
    },
    async migrate() {
      const db = await getPool();
      await db.query(shareTableSql);
    },
    async close() {
      await (await pool)?.end();
    },
  };
}

export const shareLinkService = createShareLinkService();
