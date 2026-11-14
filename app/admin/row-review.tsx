import { fields, identity, rowErrors } from '@/shared/import-fields.mjs';
import Image from 'next/image';
import { type PhotoReview, type Row, label } from './import-types';

type Props = {
  rows: Row[];
  active: string;
  setActive: (id: string) => void;
  toggle: (id: string) => void;
  selectAll: (v: boolean) => void;
  edit: (key: string, value: string) => void;
  busy: boolean;
  photo?: PhotoReview;
  togglePhoto: (row: Row, include: boolean) => void;
};
export function RowReview({
  rows,
  active,
  setActive,
  toggle,
  selectAll,
  edit,
  busy,
  photo,
  togglePhoto,
}: Props) {
  const row = rows.find((r) => r.id === active) || rows[0];
  const errors = rowErrors(row.category, row.values) as Record<string, string>;
  return (
    <div className="imp-review">
      <aside className="imp-panel imp-rowlist" aria-label="Rows to import">
        <div className="imp-listhead">
          <strong>File rows ({rows.length})</strong>
          <div>
            <button
              type="button"
              disabled={busy}
              onClick={() => selectAll(true)}
            >
              Select all
            </button>{' '}
            ·{' '}
            <button
              type="button"
              disabled={busy}
              onClick={() => selectAll(false)}
            >
              Clear
            </button>
          </div>
        </div>
        <div className="imp-scroll">
          {rows.map((r) => (
            <div
              key={r.id}
              className={'imp-row' + (r.id === row.id ? ' active' : '')}
            >
              <input
                type="checkbox"
                aria-label={'Select ' + r.location}
                checked={r.selected}
                disabled={busy || !!r.result}
                onChange={() => toggle(r.id)}
              />
              <button
                type="button"
                aria-pressed={r.id === row.id}
                onClick={() => setActive(r.id)}
              >
                <strong>
                  {[r.values.Make, r.values.Model, r.values.Size]
                    .filter(Boolean)
                    .join(' · ') || 'Unnamed model'}
                </strong>
                <small>
                  {r.location} ·{' '}
                  {r.result ||
                    (Object.keys(rowErrors(r.category, r.values)).length
                      ? 'Needs review'
                      : r.category)}
                </small>
              </button>
            </div>
          ))}
        </div>
      </aside>
      <section className="imp-panel imp-editor">
        <div className="imp-eyebrow">
          {row.category} / {row.location}
        </div>
        <h2>
          {row.values.Model || 'Model details'}
          {row.values.Size && ' · ' + row.values.Size}
        </h2>
        <p>
          {row.result
            ? 'Import result: ' + row.result + '.'
            : 'Brand, model and size are required. Other fields can stay blank.'}
        </p>
        {photo && (
          <div className="imp-photo">
            {photo.status === 'found' || photo.status === 'existing' ? (
              <>
                <Image
                  unoptimized
                  src={photo.image}
                  width={144}
                  height={100}
                  alt={
                    row.values.Make + ' ' + row.values.Model + ' product photo'
                  }
                />
                <div>
                  <strong>
                    {photo.status === 'found'
                      ? 'Researched product photo'
                      : 'Current catalogue photo'}
                  </strong>
                  {photo.source && (
                    <p>
                      <a
                        href={photo.source}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        View Flybubble source ↗
                      </a>
                    </p>
                  )}
                  {photo.status === 'found' && (
                    <label className="imp-check">
                      <input
                        type="checkbox"
                        checked={photo.include}
                        disabled={busy || !!row.result}
                        onChange={(e) => togglePhoto(row, e.target.checked)}
                      />{' '}
                      Include photo for this model
                    </label>
                  )}
                </div>
              </>
            ) : (
              <p>
                {photo.status === 'missing'
                  ? 'No matching product photo found on Flybubble.'
                  : 'Photo lookup failed. Retry research to check again.'}
              </p>
            )}
          </div>
        )}
        <div className="imp-grid">
          {fields(row.category).map((k) => {
            const source = row.sources[k],
              changed = row.edited[k];
            const state = changed
              ? 'Edited'
              : source
                ? 'Web research'
                : row.values[k]
                  ? 'File'
                  : '';
            return (
              <div
                key={k}
                className={'imp-cell' + (source ? ' researched' : '')}
              >
                <label>
                  <span>
                    {label(k)}
                    {identity.includes(k) && ' *'}
                  </span>
                  <input
                    value={row.values[k] || ''}
                    disabled={busy || !!row.result}
                    aria-invalid={!!errors[k]}
                    placeholder="—"
                    onChange={(e) => edit(k, e.target.value)}
                  />
                </label>
                {state && <small className="imp-origin">{state}</small>}
                {errors[k] && (
                  <small className="imp-field-error">{errors[k]}</small>
                )}
                {source && (
                  <details>
                    <summary>
                      {changed ? 'Original research' : 'View evidence'}
                    </summary>
                    <p>{source.evidence}</p>
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Open source ↗
                    </a>
                  </details>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
