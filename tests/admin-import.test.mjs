import test from 'node:test';
import assert from 'node:assert/strict';
import { utils, write } from 'xlsx';
import {
  guessLayout,
  previewRows,
  readWorkbook,
} from '../shared/import-workbook.mjs';
import { readBatch } from '../server/import-validation.mjs';
import {
  issueSession,
  validSession,
  passwordMatches,
  sessionSeconds,
  loginLimiter,
} from '../server/admin-session.mjs';
import { researchRow } from '../server/import-research.mjs';
import { commitImport, writesConfigured } from '../server/import-store.mjs';
const wing = {
  category: 'Wings',
  values: { Make: 'Test', Model: 'Wing', Size: '22' },
};

test('CSV preserves quoted fields, leading zeroes and zero; empty, oversize and duplicate mappings cannot commit silently', () => {
  const data = new TextEncoder().encode(
    '\uFEFFBrand,Model,Size,Weight (kg),Unrelated\r\nTest,"Model, Two",01,0,skip\r\nTest,Other,M,,skip',
  );
  const sheets = readWorkbook(data, 'gear.csv'),
    layout = guessLayout(sheets[0]);
  const rows = previewRows(sheets, [layout]);
  assert.deepEqual(rows[0].values, {
    Make: 'Test',
    Model: 'Model, Two',
    Size: '01',
    Gliderwt: '0',
  });
  assert.equal(rows[1].values.Gliderwt, undefined);
  assert.throws(() => readBatch(rows), /positive number/);
  assert.throws(
    () => previewRows(sheets, [{ ...layout, mapping: ['Make', 'Make'] }]),
    /same field/,
  );
  assert.throws(() => readWorkbook(new Uint8Array(0), 'file.csv'), /non-empty/);
  assert.throws(
    () => readWorkbook(new Uint8Array(6 * 1024 * 1024), 'file.xlsx'),
    /5 MB/,
  );
});
test('a large Windows-1252 wing export preserves every size and its weight range', () => {
  const bytes = Buffer.from(
    ['Make,Model,Size,CertAllUp', ...Array.from({ length: 1275 }, (_, i) =>
      `Test,Model \x93A\x94,${i + 1},60\x9673`)].join('\r\n'), 'latin1',
  );
  const sheets = readWorkbook(bytes, 'wings.csv');
  const rows = previewRows(sheets, sheets.map(guessLayout));
  assert.equal(rows.length, 1275);
  assert.deepEqual(rows.at(-1).values, { Make: 'Test', Model: 'Model “A”', Size: '1275', CertAllUp: '60–73' });
  assert.equal(readBatch(rows).length, rows.length);
});
test('Unicode CSV encodings preserve non-Western text and malformed marked files give an actionable error', () => {
  const content = 'Make,Model,Size\nTest,雪,M';
  for (const bytes of [
    Buffer.from(content, 'utf8'),
    Buffer.from('\uFEFF' + content, 'utf8'),
    Buffer.from('\uFEFF' + content, 'utf16le'),
    Buffer.from('\uFEFF' + content, 'utf16le').swap16(),
  ]) {
    const sheets = readWorkbook(bytes, 'gear.csv');
    assert.equal(previewRows(sheets, sheets.map(guessLayout))[0].values.Model, '雪');
  }
  assert.throws(() => readWorkbook(Uint8Array.of(0xff, 0xfe, 0x41), 'bad.csv'), /Export it again/);
});
for (const type of ['xlsx', 'xls'])
  test(
    type +
      ' supports manufacturer title rows, multiple sheets and an excluded sheet',
    () => {
      const wb = utils.book_new();
      utils.book_append_sheet(
        wb,
        utils.aoa_to_sheet([
          ['Spring range'],
          ['Manufacturer', 'Model', 'Size', 'Cells'],
          ['Test', '翼', 'S', 41],
        ]),
        'Wings',
      );
      utils.book_append_sheet(
        wb,
        utils.aoa_to_sheet([
          ['Make', 'Model', 'Size', 'Weightmanu'],
          ['Test', 'Rescue', 100, 980],
        ]),
        'Reserves',
      );
      utils.book_append_sheet(wb, utils.aoa_to_sheet([['Notes']]), 'Read me');
      const sheets = readWorkbook(
        write(wb, { type: 'buffer', bookType: type }),
        'models.' + type,
      );
      const layouts = sheets.map(guessLayout);
      layouts[2].include = false;
      assert.equal(layouts[0].header, 1);
      const rows = previewRows(sheets, layouts);
      assert.deepEqual(
        rows.map((r) => [r.category, r.values.Model, r.values.Size]),
        [
          ['Wings', '翼', 'S'],
          ['Reserves', 'Rescue', '100'],
        ],
      );
      assert.equal(rows[1].values.Weightmanu, '980');
    },
  );
test('a short development password opens a session only in development', () => {
  const dev = { NODE_ENV: 'development', ADMIN_IMPORT_PASSWORD: '1234' };
  const production = { ...dev, NODE_ENV: 'production' };
  assert.ok(passwordMatches('1234', dev));
  assert.ok(!passwordMatches('1235', dev));
  assert.ok(!passwordMatches('', { ...dev, ADMIN_IMPORT_PASSWORD: '' }));
  const token = issueSession(dev);
  assert.ok(validSession(token, dev));
  assert.ok(!passwordMatches('1234', production));
  assert.ok(!validSession(token, production));
});
test('sessions expire, rotate with password and reject tampering; password attempts are bounded', () => {
  const env = { ADMIN_IMPORT_PASSWORD: 'test-only-import-password' },
    now = Date.now(),
    token = issueSession(env, now);
  assert.ok(validSession(token, env, now));
  assert.ok(!validSession(token, env, now + sessionSeconds * 1000));
  assert.ok(!validSession(token.slice(0, -2) + 'xx', env, now));
  assert.ok(
    !validSession(
      token,
      { ADMIN_IMPORT_PASSWORD: 'another-test-password' },
      now,
    ),
  );
  assert.ok(!passwordMatches('wrong-password', env));
  assert.ok(!passwordMatches('', {}));
  const limiter = loginLimiter();
  for (let i = 0; i < 15; i++) limiter.failed(now);
  assert.ok(limiter.blocked(now));
  assert.ok(!limiter.blocked(now + 300001));
});
test('catalogue credentials enable imports in live mode only', () => {
  const env = { DATA_SOURCE: 'mysql', DB_USER: 'catalogue', DB_PASSWORD: 'fixture' };
  assert.equal(writesConfigured(env), true);
  assert.equal(writesConfigured({ ...env, DATA_SOURCE: 'snapshot' }), false);
  assert.equal(writesConfigured({ ...env, DB_PASSWORD: 'hide' }), false);
  assert.equal(writesConfigured({ ...env, DB_USER: '' }), false);
});
test('write validation rejects private fields, unknown categories, reversed limits, and missing size before connecting', async () => {
  for (const row of [
    { ...wing, category: 'DSGeneric' },
    { ...wing, values: { ...wing.values, Cost: '5' } },
    { ...wing, values: { ...wing.values, Size: '' } },
    { ...wing, values: { ...wing.values, certAUWmn: '100', certAUWmx: '80' } },
  ]) {
    let opened = false;
    await assert.rejects(
      commitImport([row], () => {
        opened = true;
      }),
    );
    assert.equal(opened, false);
  }
});
test('research only sends product identity and missing field names; suggestions require a matching cited excerpt', async () => {
  const cited = 'Test Wing 22: flat area 23.4 m². Cell count 42.';
  const url = 'https://example.org/specs';
  const output = [
    { type: 'web_search_call', status: 'completed' },
    {
      type: 'message',
      content: [
        {
          type: 'output_text',
          text: cited,
          annotations: [
            { type: 'url_citation', start_index: 0, end_index: 12, url },
          ],
        },
      ],
    },
  ];
  const suggestions = [
    {
      field: 'FlatSurf',
      value: '23.4',
      source: 0,
      evidence: 'flat area 23.4 m²',
    },
    { field: 'Gliderwt', value: '4.5', source: 0, evidence: 'invented quote' },
    { field: 'Sell', value: 'Yes', source: 0, evidence: 'Test Wing' },
    { field: 'Cells', value: '42', source: 0, evidence: 'Cell count 42' },
    { field: 'RRP', value: '2799', source: 0, evidence: 'Test Wing' },
    { field: 'Size', value: '23', source: 1, evidence: 'Test Wing' },
  ];
  let calls = 0;
  const res = await researchRow(
    { ...wing, values: { ...wing.values, Cells: '40', Status: 'Past' } },
    { DO_AI_KEY: 'mock' },
    async (u, { body }) => {
      const req = JSON.parse(body);
      calls++;
      if (u.endsWith('/responses')) {
        assert.equal(req.tools[0].type, 'web_search');
        assert.ok(!req.input.includes('"40"') && !req.input.includes('"Past"'));
        return Response.json({ output });
      }
      return Response.json({
        choices: [{ message: { content: JSON.stringify({ suggestions }) } }],
      });
    },
  );
  assert.equal(calls, 2);
  assert.deepEqual(res, {
    FlatSurf: { value: '23.4', url, evidence: 'flat area 23.4 m²' },
  });
});
test('model-only research asks for no size-specific measurements; unsourced results stay blank', async () => {
  const row = {
    category: 'Reserves',
    values: { Make: 'Test', Model: 'Rescue' },
  };
  const res = await researchRow(
    row,
    { DO_AI_KEY: 'mock' },
    async (u, { body }) => {
      const fields = JSON.parse(JSON.parse(body).input).requestedFields;
      assert.ok(
        fields.modelyear &&
          !fields.Loadmax &&
          !fields.Weightmanu &&
          !fields.CertEN,
      );
      return Response.json({
        output: [{ type: 'web_search_call', status: 'completed' }],
      });
    },
  );
  assert.deepEqual(res, {});
  await assert.rejects(researchRow(row, {}), /not configured/);
  await assert.rejects(
    researchRow(row, { DO_AI_KEY: 'mock' }, () =>
      Response.json({ output: [] }),
    ),
    /did not complete a web search/,
  );
});
