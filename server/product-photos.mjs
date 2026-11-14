import { createHash } from 'node:crypto';
import bundled from '../data/images.json' with { type: 'json' };
import { photoKey } from '../shared/model-photo.mjs';
import { databasePool, mysqlConfigured } from './mysql.mjs';
import { findShopPhoto, validPhotoChoice } from './photo-lookup.mjs';
import { ImportError, readRow } from './import-validation.mjs';

const pool = databasePool();
const legacyKey = (brand, model) =>
  (brand.trim() + ':' + model.trim()).toLowerCase();
const photoId = (brand, model) =>
  createHash('sha256').update(photoKey(brand, model)).digest('hex');
const photoPath = (id) => '/api/product-photos/' + id;
const optionalTableUnavailable = (e) =>
  ['ER_NO_SUCH_TABLE', 'ER_TABLEACCESS_DENIED_ERROR'].includes(e.code);
export const photoTableSql = `CREATE TABLE IF NOT EXISTS gear_product_photos (
  id CHAR(64) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
  brand VARCHAR(255) NOT NULL, model VARCHAR(255) NOT NULL,
  source_url TEXT NOT NULL, image_url TEXT NOT NULL,
  mime_type VARCHAR(20) NOT NULL, image_bytes MEDIUMBLOB NOT NULL
) ENGINE=InnoDB`;

export async function cataloguePhotos(db) {
  try {
    const [rows] = await db.query(
      'SELECT id, brand, model FROM gear_product_photos',
    );
    return {
      ...Object.fromEntries(
        rows.map((r) => [legacyKey(r.brand, r.model), photoPath(r.id)]),
      ),
      ...bundled,
    };
  } catch (e) {
    if (optionalTableUnavailable(e)) return bundled;
    throw e;
  }
}
export async function lookupPhoto(input, signal) {
  const { values } = readRow(input, { research: true });
  const { Make, Model } = values;
  const existing = bundled[legacyKey(Make, Model)];
  if (existing) return { status: 'existing', image: existing };
  if (process.env.DATA_SOURCE === 'mysql' && mysqlConfigured()) {
    try {
      const [found] = await (
        await pool.get()
      ).execute('SELECT id, source_url FROM gear_product_photos WHERE id=?', [
        photoId(Make, Model),
      ]);
      if (found.length)
        return {
          status: 'existing',
          image: photoPath(found[0].id),
          source: found[0].source_url,
        };
    } catch (e) {
      if (!optionalTableUnavailable(e)) throw e;
    }
  }
  const found = await findShopPhoto(values, fetch, signal);
  return found ? { status: 'found', ...found } : { status: 'missing' };
}
export async function readPhoto(id) {
  if (!/^[a-f0-9]{64}$/.test(id) || process.env.DATA_SOURCE !== 'mysql')
    return null;
  const [rows] = await (
    await pool.get()
  ).execute(
    'SELECT mime_type, image_bytes FROM gear_product_photos WHERE id=?',
    [id],
  );
  return rows[0];
}

// Prepare only photos attached to reviewed, selected rows. Download before taking
// catalogue locks, once per model, keeping the final insert in the size transaction.
export async function preparePhotos(db, input, rows, download) {
  const choices = new Map();
  for (const [i, { values }] of rows.entries()) {
    const choice = input[i].photo;
    if (choice == null || bundled[legacyKey(values.Make, values.Model)])
      continue;
    if (!validPhotoChoice(choice))
      throw new ImportError('Invalid photo selection.');
    const id = photoId(values.Make, values.Model),
      prior = choices.get(id);
    if (
      prior &&
      (prior.photo.image !== choice.image ||
        prior.photo.source !== choice.source)
    )
      throw new ImportError('Choose one photo per model.');
    choices.set(id, { id, values, photo: choice });
  }
  const paths = Object.fromEntries(
    [...choices.values()].map(({ id, values }) => [
      photoKey(values.Make, values.Model),
      photoPath(id),
    ]),
  );
  if (!choices.size) return { ready: [], paths };
  // DDL implicitly commits in MySQL, so only initialise the optional table before BEGIN.
  try {
    await db.query('SELECT id FROM gear_product_photos LIMIT 0');
  } catch (e) {
    if (e.code !== 'ER_NO_SUCH_TABLE') throw e;
    await db.query(photoTableSql);
  }
  const ready = [];
  let size = 0;
  for (const item of choices.values()) {
    const [found] = await db.execute(
      'SELECT id FROM gear_product_photos WHERE id=?',
      [item.id],
    );
    if (found.length) continue;
    const file = await download(item.values, item.photo);
    size += file.bytes.length;
    if (size > 48 * 1024 * 1024)
      throw new ImportError(
        'The selected photos exceed 48 MB. Save fewer models at a time.',
        413,
      );
    ready.push({ ...item, ...file });
  }
  return { ready, paths };
}
export async function savePhotos(db, ready) {
  let saved = 0;
  for (const { id, values, photo, mime, bytes } of ready) {
    try {
      await db.execute(
        'INSERT INTO gear_product_photos (id,brand,model,source_url,image_url,mime_type,image_bytes) VALUES (?,?,?,?,?,?,?)',
        [id, values.Make, values.Model, photo.source, photo.image, mime, bytes],
      );
      saved++;
    } catch (e) {
      if (e.code !== 'ER_DUP_ENTRY') throw e;
    }
  }
  return saved;
}
