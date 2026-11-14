import test from 'node:test';
import assert from 'node:assert/strict';
import mysql from 'mysql2/promise';
import { mysqlOptions } from '../server/mysql.mjs';
import { commitImport } from '../server/import-store.mjs';
import { cataloguePhotos, photoTableSql } from '../server/product-photos.mjs';

// Opt-in integration check. Clone only schema, into connection-local TEMPORARY
// tables. Redirect every catalogue identifier before executing importer SQL.
test(
  'MySQL: selected sizes, repeat imports, model metadata, and atomic rollback',
  { skip: process.env.IMPORT_TEST_MYSQL !== '1' },
  async () => {
    const db = await mysql.createConnection(await mysqlOptions());
    const tables = ['DSGeneric', 'DSColours', 'WingsData', 'ReservesData'];
    const redirectTables = (sql) =>
      sql.replace(
        /\b(WingsData|ReservesData|DSGeneric|DSColours|gear_product_photos)\b/g,
        'tmp_fb_test_$1',
      );
    const isolated = {
      query: (q) => {
        assert.doesNotMatch(q, /CREATE/);
        return db.query(redirectTables(q));
      },
      beginTransaction: () => db.beginTransaction(),
      rollback: () => db.rollback(),
      commit: () => db.commit(),
      release: () => {},
      execute: (q, args) => {
        const sql = typeof q === 'string' ? q : q.sql;
        assert.notEqual(redirectTables(sql), sql);
        return db.execute({ sql: redirectTables(sql) }, args);
      },
    };
    const row = {
      category: 'Wings',
      values: {
        Make: 'Import test',
        Model: 'Wing',
        Size: '22',
        Colours: 'Blue; Red',
        Cells: '40',
      },
    };
    const reserve = {
      category: 'Reserves',
      values: {
        Make: 'Import test',
        Model: 'Reserve',
        Size: '100',
        Weightmanu: '1020',
      },
    };
    try {
      for (const t of tables)
        await db.query(
          'CREATE TEMPORARY TABLE tmp_fb_test_' + t + ' LIKE ' + t,
        );
      await db.query(
        redirectTables(photoTableSql).replace(
          'CREATE TABLE',
          'CREATE TEMPORARY TABLE',
        ),
      );
      const save = async (rows) =>
        (await commitImport(rows, async () => isolated)).results;
      assert.deepEqual(await save([row, reserve, reserve]), [
        'added',
        'added',
        'already exists',
      ]);
      assert.deepEqual(await save([row, reserve]), [
        'already exists',
        'already exists',
      ]);
      const next = {
        ...row,
        values: { ...row.values, Size: '24', modelyear: '2024' },
      };
      assert.deepEqual(await save([next]), ['added']);
      const [meta] = await db.query(
        "SELECT modelyear FROM tmp_fb_test_DSGeneric WHERE Model='Wing'",
      );
      assert.equal(meta[0].modelyear, 2024);
      await assert.rejects(
        save([
          { ...reserve, values: { ...reserve.values, Size: '120' } },
          { ...row, values: { ...row.values, Size: '26', modelyear: '2022' } },
        ]),
        /conflicts/,
      );
      const [counts] = await db.query(
        'SELECT (SELECT COUNT(*) FROM tmp_fb_test_WingsData) AS wings,(SELECT COUNT(*) FROM tmp_fb_test_ReservesData) AS reserves,(SELECT COUNT(*) FROM tmp_fb_test_DSColours) AS colours',
      );
      assert.deepEqual({ ...counts[0] }, { wings: 2, reserves: 1, colours: 2 });
      const photo = {
        source: 'https://flybubble.com/products/test-wing',
        image: 'https://cdn.shopify.com/s/files/1/wing.jpg?width=700',
      };
      let downloads = 0;
      const bytes = Buffer.from([255, 216, 255, 217]);
      const withPhotos = (rows) =>
        commitImport(
          rows,
          async () => isolated,
          async () => {
            downloads++;
            return { bytes, mime: 'image/jpeg' };
          },
        );
      const reviewed = [
        { ...row, photo },
        { ...next, photo },
      ];
      const saved = await withPhotos(reviewed);
      assert.equal(saved.photosSaved, 1);
      assert.deepEqual(saved.results, ['already exists', 'already exists']);
      assert.equal((await withPhotos(reviewed)).photosSaved, 0);
      assert.equal(downloads, 1);
      const catalogue = await cataloguePhotos(isolated);
      assert.match(
        catalogue['import test:wing'],
        /^\/api\/product-photos\/[a-f0-9]{64}$/,
      );
      const [[stored]] = await db.query(
        'SELECT mime_type,image_bytes,source_url FROM tmp_fb_test_gear_product_photos',
      );
      assert.equal(stored.mime_type, 'image/jpeg');
      assert.deepEqual(stored.image_bytes, bytes);
      assert.equal(stored.source_url, photo.source);
    } finally {
      await db.end();
    }
  },
);
