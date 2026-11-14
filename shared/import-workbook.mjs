import { read, utils } from 'xlsx';
import { categories, matchHeader, maxRows } from './import-fields.mjs';

export const maxFileBytes = 5 * 1024 * 1024;

function decodeCsv(bytes) {
  const data = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let encoding = 'utf-8';
  if (data[0] === 0xff && data[1] === 0xfe) encoding = 'utf-16le';
  if (data[0] === 0xfe && data[1] === 0xff) encoding = 'utf-16be';
  let text;
  try {
    text = new TextDecoder(encoding, { fatal: true }).decode(data);
  } catch {
    const utf8Bom = data[0] === 0xef && data[1] === 0xbb && data[2] === 0xbf;
    if (encoding !== 'utf-8' || utf8Bom)
      throw new Error('The CSV contains invalid Unicode text. Export it again as UTF-8 CSV.');
    // Older Excel and Access exports often use the Windows Western European code page.
    text = new TextDecoder('windows-1252').decode(data);
  }
  if (text.includes('\u0000'))
    throw new Error('Could not read this CSV as text. Export it as UTF-8 CSV or choose the original Excel workbook.');
  return text;
}

export function readWorkbook(bytes, filename) {
  if (!/\.(csv|xlsx|xls)$/i.test(filename))
    throw new Error('Choose a CSV, XLSX or XLS file.');
  if (!bytes.byteLength || bytes.byteLength > maxFileBytes)
    throw new Error('Choose a non-empty file of 5 MB or less.');
  const csv = /\.csv$/i.test(filename);
  const book = read(
    csv ? decodeCsv(bytes) : bytes,
    {
      type: csv ? 'string' : 'array',
      raw: true,
      dense: true,
      sheetRows: maxRows + 26,
      cellHTML: false,
      cellFormula: false,
    },
  );
  const result = [];
  for (const [index, name] of book.SheetNames.entries()) {
    if (book.Workbook?.Sheets?.[index]?.Hidden) continue;
    const sheet = book.Sheets[name];
    if (!sheet?.['!ref']) continue;
    const range = utils.decode_range(sheet['!fullref'] || sheet['!ref']);
    if (range.e.c >= 128 || range.e.r >= maxRows + 25 || result.length >= 20)
      throw new Error(
        `Split this workbook into smaller files (up to 20 sheets, 128 columns and ${maxRows.toLocaleString('en-GB')} data rows per import).`,
      );
    const data = utils
      .sheet_to_json(sheet, {
        header: 1,
        defval: '',
        blankrows: true,
        raw: true,
        range: 0,
      })
      .map((cells) => cells.map((v) => String(v ?? '').trim()));
    if (data.some((line) => line.some(Boolean))) result.push({ name, data });
  }
  if (!result.length) throw new Error('No visible sheet contains data.');
  return result;
}

export function guessLayout(sheet) {
  const hint = /reserv|rescue|parachute/i.test(sheet.name)
    ? 'Reserves'
    : 'Wings';
  let best = { category: hint, header: 0, score: -1 };
  sheet.data.slice(0, 25).forEach((line, header) => {
    for (const category of categories) {
      const matches = new Set(
        line.map((h) => matchHeader(category, h)).filter(Boolean),
      );
      const score =
        matches.size +
        (matches.has('Model') ? 2 : 0) +
        (category === hint ? 0.1 : 0);
      if (score > best.score) best = { category, header, score };
    }
  });
  return {
    category: best.category,
    header: best.header,
    include: true,
    mapping: sheet.data[best.header].map((h) => matchHeader(best.category, h)),
  };
}

export function previewRows(sheets, layouts) {
  const rows = [];
  for (const [i, sheet] of sheets.entries()) {
    const { include, category, header, mapping } = layouts[i];
    if (!include) continue;
    const keys = mapping.filter(Boolean);
    if (!keys.length)
      throw new Error('Map at least one column on ' + sheet.name + '.');
    if (new Set(keys).size !== keys.length)
      throw new Error(
        'Two columns on ' +
          sheet.name +
          ' map to the same field. Choose one or skip it.',
      );
    sheet.data.slice(header + 1).forEach((line, offset) => {
      if (!line.some(Boolean)) return;
      const values = {};
      mapping.forEach((key, col) => {
        if (key && line[col]) values[key] = line[col];
      });
      if (!Object.keys(values).length) return;
      rows.push({
        id: i + ':' + (header + offset + 2),
        location: sheet.name + ' · row ' + (header + offset + 2),
        category,
        values,
        sources: {},
        edited: {},
        selected: true,
      });
    });
  }
  if (!rows.length || rows.length > maxRows)
    throw new Error(`Select sheets with 1–${maxRows.toLocaleString('en-GB')} data rows in total.`);
  return rows;
}
