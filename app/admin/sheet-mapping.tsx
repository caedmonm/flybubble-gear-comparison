import { fields, matchHeader } from '@/shared/import-fields.mjs';
import { type Category, type Sheet, type Layout, label } from './import-types';

export function SheetMapping({
  sheets,
  layouts,
  setLayout,
}: {
  sheets: Sheet[];
  layouts: Layout[];
  setLayout: (i: number, l: Layout) => void;
}) {
  return (
    <div className="imp-sheets">
      {sheets.map((sheet, i) => {
        const l = layouts[i],
          headers = sheet.data[l.header];
        const remap = (category: Category, header: number) =>
          setLayout(i, {
            ...l,
            category,
            header,
            mapping: sheet.data[header].map((h) => matchHeader(category, h)),
          });
        return (
          <section className="imp-sheet" key={i}>
            <label className="imp-check">
              <input
                type="checkbox"
                checked={l.include}
                onChange={(e) =>
                  setLayout(i, { ...l, include: e.target.checked })
                }
              />
              {sheet.name}
            </label>
            {l.include && (
              <>
                <div className="imp-inline">
                  <label>
                    Catalogue
                    <select
                      value={l.category}
                      onChange={(e) =>
                        remap(e.target.value as Category, l.header)
                      }
                    >
                      <option>Wings</option>
                      <option>Reserves</option>
                    </select>
                  </label>
                  <label>
                    Header row
                    <select
                      value={l.header}
                      onChange={(e) => remap(l.category, +e.target.value)}
                    >
                      {sheet.data.slice(0, 25).map((r, n) => (
                        <option key={n} value={n}>
                          {n + 1} ·{' '}
                          {r
                            .filter(Boolean)
                            .slice(0, 3)
                            .join(' / ')
                            .slice(0, 70) || '(empty)'}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <details>
                  <summary>
                    Column mapping · {l.mapping.filter(Boolean).length} of{' '}
                    {headers.length} matched
                  </summary>
                  <p>
                    Check that the source units match the catalogue units.
                    Unmapped columns stay out of the preview.
                  </p>
                  <div className="imp-grid">
                    {headers.map((h, col) => (
                      <label key={col}>
                        {h || 'Column ' + (col + 1)}
                        <select
                          value={l.mapping[col] || ''}
                          onChange={(e) => {
                            const mapping = [...l.mapping];
                            mapping[col] = e.target.value;
                            setLayout(i, { ...l, mapping });
                          }}
                        >
                          <option value="">Skip column</option>
                          {fields(l.category).map((k) => (
                            <option key={k} value={k}>
                              {label(k)}
                            </option>
                          ))}
                        </select>
                      </label>
                    ))}
                  </div>
                </details>
              </>
            )}
          </section>
        );
      })}
    </div>
  );
}
