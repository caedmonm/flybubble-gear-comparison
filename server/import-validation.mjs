import {
  categories,
  fields,
  labels,
  maxRows,
  rowErrors,
} from '../shared/import-fields.mjs';
export class ImportError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}
export function readRow(row, { research = false } = {}) {
  if (
    !row ||
    !categories.includes(row.category) ||
    !row.values ||
    typeof row.values !== 'object' ||
    Array.isArray(row.values)
  )
    throw new ImportError('Invalid catalogue row.');
  const allowed = fields(row.category),
    values = {};
  for (const [key, value] of Object.entries(row.values)) {
    if (
      !allowed.includes(key) ||
      typeof value !== 'string' ||
      value.length > 2000
    )
      throw new ImportError('Invalid catalogue field.');
    if (value.trim()) values[key] = value.trim();
  }
  const errors = rowErrors(row.category, values);
  const first = Object.entries(errors).find(
    ([key]) =>
      !research ||
      ['Make', 'Model'].includes(key) ||
      (key === 'Size' && values.Size),
  );
  if (first) throw new ImportError(labels[first[0]] + ': ' + first[1] + '.');
  return { category: row.category, values };
}
export function readBatch(input) {
  if (!Array.isArray(input) || !input.length || input.length > maxRows)
    throw new ImportError(`Select 1–${maxRows.toLocaleString('en-GB')} rows.`);
  return input.map((row, i) => {
    try {
      return readRow(row);
    } catch (e) {
      if (e instanceof ImportError)
        throw new ImportError('Selected row ' + (i + 1) + ': ' + e.message);
      throw e;
    }
  });
}
