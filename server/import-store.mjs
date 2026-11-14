import { databasePool, mysqlConfigured } from './mysql.mjs';
import projection from '../shared/projection.json' with { type: 'json' };
import { tables } from '../shared/import-fields.mjs';
import { readBatch, ImportError } from './import-validation.mjs';
import { preparePhotos, savePhotos } from './product-photos.mjs';
import { downloadReviewedPhoto } from './photo-lookup.mjs';

export const writesConfigured = (env = process.env) =>
  env.DATA_SOURCE === 'mysql' && mysqlConfigured(env);
const pool = databasePool(process.env, 2, 5);
async function connection() {
  if (!writesConfigured())
    throw new ImportError(
      'Adding rows requires live MySQL and the catalogue database credentials.',
      503,
    );
  return (await pool.get()).getConnection();
}
const quote = (k) => '`' + k + '`';
const query = (db, sql, params) => db.execute({ sql, timeout: 15000 }, params);
// Only identifiers from projection.json and fixed SQL appear in statements.
async function insert(db, table, keys, values) {
  return query(
    db,
    'INSERT INTO ' +
      quote(table) +
      ' (' +
      keys.map(quote).join(',') +
      ') VALUES (' +
      keys.map(() => '?').join(',') +
      ')',
    values,
  );
}
async function modelDetails(db, category, v) {
  const key = [v.Make, v.Model];
  const [matches] = await query(
    db,
    'SELECT modelyear,shopurl,prodtype FROM DSGeneric WHERE Brand=? AND Model=?',
    key,
  );
  if (
    matches.length &&
    matches[0].prodtype &&
    matches[0].prodtype.toLowerCase() !== category.toLowerCase()
  )
    throw new ImportError(
      v.Make +
        ' ' +
        v.Model +
        ': model metadata already belongs to another category.',
      409,
    );
  if (!matches.length) {
    await insert(db, 'DSGeneric', projection.DSGeneric, [
      ...key,
      v.modelyear || null,
      v.ShopURL || null,
      category,
    ]);
  } else {
    const changes = [],
      values = [];
    for (const [column, value] of [
      ['modelyear', v.modelyear],
      ['shopurl', v.ShopURL],
    ]) {
      if (!value) continue;
      const existing = matches[0][column];
      if (existing == null || existing === '') {
        changes.push(quote(column) + '=?');
        values.push(value);
      } else if (String(existing) !== value)
        throw new ImportError(
          v.Make +
            ' ' +
            v.Model +
            ': ' +
            column +
            ' conflicts with another size or existing model metadata. Correct it or leave it blank.',
          409,
        );
    }
    if (changes.length)
      await query(
        db,
        'UPDATE DSGeneric SET ' +
          changes.join(',') +
          ' WHERE Brand=? AND Model=?',
        [...values, ...key],
      );
  }
  if (category === 'Wings' && v.Colours) {
    for (const colour of new Set(
      v.Colours.split(';')
        .map((c) => c.trim())
        .filter(Boolean),
    )) {
      const args = [...key, colour];
      const [found] = await query(
        db,
        'SELECT 1 FROM DSColours WHERE Brand=? AND Model=? AND Colour=?',
        args,
      );
      if (!found.length)
        await insert(db, 'DSColours', projection.DSColours, args);
    }
  }
}
export async function commitImport(
  input,
  getConnection = connection,
  downloadPhoto = downloadReviewedPhoto,
) {
  const rows = readBatch(input);
  const db = await getConnection(),
    results = [];
  try {
    const { ready, paths } = await preparePhotos(
      db,
      input,
      rows,
      downloadPhoto,
    );
    // Reserve IDs auto-increment: do not rely on INSERT duplicate-key checks for model identity.
    // SERIALIZABLE makes these existence checks locking reads, including currently absent sizes.
    await db.query('SET TRANSACTION ISOLATION LEVEL SERIALIZABLE');
    await db.beginTransaction();
    for (const { category, values: v } of rows) {
      const table = tables[category];
      const [matches] = await query(
        db,
        'SELECT 1 FROM ' +
          quote(table) +
          ' WHERE Make=? AND Model=? AND Size=? LIMIT 1',
        [v.Make, v.Model, v.Size],
      );
      if (matches.length) {
        results.push('already exists');
        continue;
      }
      await modelDetails(db, category, v);
      const keys = projection[table];
      await insert(
        db,
        table,
        keys,
        keys.map((k) => v[k] ?? null),
      );
      results.push('added');
    }
    const photosSaved = await savePhotos(db, ready);
    await db.commit();
    return { results, photosSaved, photoPaths: paths };
  } catch (error) {
    await db.rollback();
    if (
      ['ER_DUP_ENTRY', 'ER_LOCK_DEADLOCK', 'ER_LOCK_WAIT_TIMEOUT'].includes(
        error.code,
      )
    )
      throw new ImportError(
        'Another import changed these rows. No rows from this batch were added. Retry the selection.',
        409,
      );
    throw error;
  } finally {
    db.release();
  }
}
