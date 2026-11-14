'use client';

import { useRef, useState, type SubmitEvent } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  identity,
  maxRows,
  researchable,
  rowErrors,
} from '@/shared/import-fields.mjs';
import { photoKey } from '@/shared/model-photo.mjs';
import {
  guessLayout,
  maxFileBytes,
  previewRows,
} from '@/shared/import-workbook.mjs';
import { SheetMapping } from './sheet-mapping';
import { RowReview } from './row-review';
import {
  type Layout,
  type PhotoReview,
  type Row,
  type Sheet,
  type Source,
} from './import-types';

type Props = {
  initialSession: boolean;
  enabled: boolean;
  canResearch: boolean;
  canWrite: boolean;
};
const message = (e: unknown) =>
  e instanceof Error ? e.message : 'The request did not finish.';
function readFile(file: File): Promise<Sheet[]> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./read.worker.ts', import.meta.url));
    const done = () => {
      clearTimeout(timer);
      worker.terminate();
    };
    const timer = setTimeout(() => {
      done();
      reject(
        new Error(
          'This file took too long to read. Split it into smaller sheets.',
        ),
      );
    }, 30_000);
    worker.onerror = () => {
      done();
      reject(
        new Error(
          'Could not open the spreadsheet. Try re-saving it as XLSX or UTF-8 CSV.',
        ),
      );
    };
    worker.onmessage = ({ data }) => {
      done();
      if (data.error) reject(new Error(data.error));
      else resolve(data.sheets);
    };
    file
      .arrayBuffer()
      .then((bytes) => worker.postMessage({ name: file.name, bytes }, [bytes]))
      .catch((e) => {
        done();
        reject(e);
      });
  });
}
export function ImportDesk(props: Props) {
  const [session, setSession] = useState(props.initialSession),
    [password, setPassword] = useState('');
  const [canResearch, setCanResearch] = useState(props.canResearch),
    [canWrite, setCanWrite] = useState(props.canWrite);
  const [fileName, setFileName] = useState(''),
    [sheets, setSheets] = useState<Sheet[]>([]),
    [layouts, setLayouts] = useState<Layout[]>([]);
  const [rows, setRows] = useState<Row[]>([]),
    [active, setActive] = useState(''),
    [busy, setBusy] = useState('');
  const [error, setError] = useState(''),
    [note, setNote] = useState(''),
    [progress, setProgress] = useState('');
  const controller = useRef<AbortController | null>(null);
  const [photos, setPhotos] = useState<Record<string, PhotoReview>>({});
  const modelKey = (r: Row) => photoKey(r.values.Make, r.values.Model);
  const needsPhoto = (key: string) =>
    !photos[key] || ['missing', 'error'].includes(photos[key].status);
  const selected = rows.filter((r) => r.selected && !r.result);
  const invalid = selected.filter(
    (r) => Object.keys(rowErrors(r.category, r.values)).length,
  );
  const targets = rows.filter(
    (r) =>
      !r.result &&
      r.values.Make?.trim() &&
      r.values.Model?.trim() &&
      (needsPhoto(modelKey(r)) ||
        (canResearch && researchable(r.category, r.values).length)),
  );
  async function api(action: string, body: unknown, signal?: AbortSignal) {
    let res: Response;
    try {
      res = await fetch('/api/admin/' + action, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal,
      });
    } catch (e) {
      if (signal?.aborted) throw e;
      throw new Error(
        'Could not reach the import service. You can retry with this preview.',
      );
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      if (res.status === 401 && action !== 'login') setSession(false);
      throw Object.assign(
        new Error(data.error || 'The request failed. Please retry.'),
        { status: res.status },
      );
    }
    return data;
  }
  function reset() {
    setPhotos({});
    setRows([]);
    setSheets([]);
    setLayouts([]);
    setFileName('');
    setActive('');
    setNote('');
    setError('');
  }
  async function login(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy('login');
    setError('');
    try {
      const d = await api('login', { password });
      setPassword('');
      setSession(true);
      setCanResearch(d.canResearch);
      setCanWrite(d.canWrite);
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy('');
    }
  }
  async function open(file?: File) {
    if (!file) return;
    setBusy('file');
    setError('');
    setNote('');
    try {
      if (file.size > maxFileBytes)
        throw new Error('Choose a file of 5 MB or less.');
      const loaded = await readFile(file);
      setSheets(loaded);
      setLayouts(loaded.map(guessLayout) as Layout[]);
      setFileName(file.name);
      setRows([]);
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy('');
    }
  }
  function preview() {
    try {
      const next = previewRows(sheets, layouts) as Row[];
      setRows(next);
      setActive(next[0].id);
      setError('');
      setNote('');
    } catch (e) {
      setError(message(e));
    }
  }
  function edit(k: string, v: string) {
    setRows((old) =>
      old.map((r) => {
        if (r.id !== active || r.result) return r;
        const values = { ...r.values, [k]: v },
          sources = { ...r.sources },
          edited = { ...r.edited, [k]: true };
        // A citation for a different size or generation is no longer evidence for this row.
        if (identity.includes(k))
          for (const field of Object.keys(sources)) {
            if (!edited[field]) delete values[field];
            delete sources[field];
          }
        return { ...r, values, sources, edited };
      }),
    );
  }
  async function research() {
    const ctrl = new AbortController();
    controller.current = ctrl;
    setBusy('research');
    setNote('');
    setError('');
    let total = 0,
      done = 0;
    let foundPhotos = 0,
      specsEnabled = canResearch;
    const checkedModels = new Set<string>();
    try {
      for (const r of targets) {
        if (ctrl.signal.aborted) break;
        setProgress(
          'Searching ' +
            (done + 1) +
            ' of ' +
            targets.length +
            ' · ' +
            [r.values.Make, r.values.Model, r.values.Size].join(' '),
        );
        const key = modelKey(r);
        if (needsPhoto(key) && !checkedModels.has(key)) {
          checkedModels.add(key);
          const { Make, Model, ShopURL } = r.values;
          try {
            const photo = (await api(
              'photo',
              { category: r.category, values: { Make, Model, ShopURL } },
              ctrl.signal,
            )) as PhotoReview;
            if (photo.status === 'found') foundPhotos++;
            setPhotos((old) => ({
              ...old,
              [key]:
                photo.status === 'found' ? { ...photo, include: true } : photo,
            }));
          } catch (e) {
            if (
              ctrl.signal.aborted ||
              (e as { status?: number }).status === 401
            )
              throw e;
            setPhotos((old) => ({ ...old, [key]: { status: 'error' } }));
          }
        }
        if (!specsEnabled || !researchable(r.category, r.values).length) {
          done++;
          continue;
        }
        let suggestions: Record<string, Source>;
        try {
          ({ suggestions } = await api(
            'research',
            { category: r.category, values: r.values },
            ctrl.signal,
          ));
        } catch (e) {
          if (ctrl.signal.aborted || (e as { status?: number }).status === 401)
            throw e;
          setError(message(e));
          specsEnabled = false;
          done++;
          continue;
        }
        total += Object.keys(suggestions).length;
        done++;
        setRows((old) =>
          old.map((cur) => {
            if (cur.id !== r.id) return cur;
            const values = { ...cur.values },
              sources = { ...cur.sources },
              edited = { ...cur.edited };
            for (const [key, source] of Object.entries(suggestions))
              if (!values[key]?.trim()) {
                values[key] = source.value;
                sources[key] = source;
                delete edited[key];
              }
            return { ...cur, values, sources, edited };
          }),
        );
      }
    } catch (e) {
      if (!ctrl.signal.aborted) setError(message(e));
    } finally {
      setNote(
        (ctrl.signal.aborted ? 'Stopped. ' : '') +
          'Reviewed ' +
          done +
          ' of ' +
          targets.length +
          ' rows. ' +
          total +
          ' cited field' +
          (total === 1 ? '' : 's') +
          ' filled. ' +
          foundPhotos +
          ' model photo' +
          (foundPhotos === 1 ? '' : 's') +
          ' found.',
      );
      setBusy('');
      setProgress('');
      controller.current = null;
    }
  }
  async function commit() {
    setBusy('commit');
    setError('');
    setNote('');
    try {
      const { results, photosSaved, photoPaths } = (await api('commit', {
        rows: selected.map((r) => {
          const p = photos[modelKey(r)];
          return {
            category: r.category,
            values: r.values,
            ...(p?.status === 'found' && p.include
              ? { photo: { source: p.source, image: p.image } }
              : {}),
          };
        }),
      })) as {
        results: ('added' | 'already exists')[];
        photosSaved: number;
        photoPaths: Record<string, string>;
      };
      setPhotos((old) => {
        const next = { ...old };
        for (const [key, image] of Object.entries(photoPaths))
          next[key] = { status: 'existing', image };
        return next;
      });
      const outcomes = new Map(selected.map((r, i) => [r.id, results[i]]));
      setRows((old) =>
        old.map((r) =>
          outcomes.has(r.id)
            ? { ...r, result: outcomes.get(r.id), selected: false }
            : r,
        ),
      );
      const added = results.filter((r) => r === 'added').length;
      setNote(
        added +
          ' added to MySQL. ' +
          (results.length - added) +
          ' already existed and were skipped. ' +
          photosSaved +
          ' model photo' +
          (photosSaved === 1 ? '' : 's') +
          ' saved.',
      );
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy('');
    }
  }
  return (
    <main className="imp">
      <header className="imp-header">
        <Link href="/wings" prefetch={false}>
          <Image
            src="/flybubble-logo-white.avif"
            width={660}
            height={139}
            alt="Flybubble"
            unoptimized
          />
        </Link>
        <div>
          <Link href="/wings" prefetch={false}>
            View catalogue ↗
          </Link>
          {session && (
            <button
              disabled={!!busy}
              onClick={async () => {
                setBusy('logout');
                try {
                  await api('logout', {});
                  reset();
                  setSession(false);
                } catch (e) {
                  setError(message(e));
                } finally {
                  setBusy('');
                }
              }}
            >
              Sign out
            </button>
          )}
        </div>
      </header>
      <div className="imp-body">
        <div className="imp-eyebrow">Catalogue administration</div>
        <h1>{session ? 'Import gear' : 'Staff sign-in'}</h1>
        {error && (
          <div role="alert" className="imp-alert">
            {error}
          </div>
        )}
        {note && session && <output className="imp-note">{note}</output>}
        {!session ? (
          <form onSubmit={login} className="imp-panel imp-login">
            <h2>Catalogue access</h2>
            <p>
              {props.enabled
                ? 'Enter the staff password to review and import gear.'
                : 'Admin access has not been configured on this site.'}
            </p>
            <label>
              Password
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </label>
            <button className="imp-primary" disabled={!props.enabled || !!busy}>
              Sign in
            </button>
          </form>
        ) : (
          <>
            <p className="imp-lead">
              Bring wing and reserve specifications into the catalogue. Review
              each size before adding it.
            </p>
            {!rows.length ? (
              <section className="imp-panel">
                <div className="imp-eyebrow">Step 1 / File</div>
                <h2>Choose your spreadsheet</h2>
                <p>
                  Use one row per size, with a header row. CSV, XLSX or XLS · up
                  to 5 MB and {maxRows.toLocaleString('en-GB')} data rows.
                </p>
                <label className="imp-upload">
                  Spreadsheet
                  <input
                    type="file"
                    accept=".csv,.xls,.xlsx"
                    disabled={!!busy}
                    onChange={(e) => {
                      void open(e.target.files?.[0]);
                      e.target.value = '';
                    }}
                  />
                </label>
                {busy === 'file' && <output>Reading spreadsheet…</output>}
                {!!sheets.length && (
                  <>
                    <h3>{fileName}</h3>
                    <p>
                      Check the catalogue and column mapping for each sheet.
                    </p>
                    <SheetMapping
                      sheets={sheets}
                      layouts={layouts}
                      setLayout={(i, l) =>
                        setLayouts((old) =>
                          old.map((v, n) => (n === i ? l : v)),
                        )
                      }
                    />
                    <button
                      className="imp-primary"
                      disabled={!!busy}
                      onClick={preview}
                    >
                      Preview rows →
                    </button>
                  </>
                )}
              </section>
            ) : (
              <>
                <section className="imp-panel">
                  <div className="imp-eyebrow">Step 2 / Review</div>
                  <h2>{fileName}</h2>
                  <p>
                    Research specifications by size and look for a Flybubble
                    product photo by brand and model. Review each suggestion
                    before saving your selection.
                  </p>
                  <div className="imp-actions">
                    <button
                      className="imp-secondary"
                      disabled={!!busy || !targets.length}
                      onClick={research}
                    >
                      Research missing fields ({targets.length} rows)
                    </button>
                    {busy === 'research' && (
                      <button
                        className="imp-secondary"
                        onClick={() => controller.current?.abort()}
                      >
                        Stop search
                      </button>
                    )}
                    <button
                      className="imp-link"
                      disabled={!!busy}
                      onClick={reset}
                    >
                      Start a new file
                    </button>
                  </div>
                  {!canResearch && (
                    <p>
                      Photo lookup is available. Specification research requires
                      a DigitalOcean key.
                    </p>
                  )}
                  {progress && <output>{progress}</output>}
                </section>
                <RowReview
                  rows={rows}
                  active={active}
                  setActive={setActive}
                  busy={!!busy}
                  edit={edit}
                  photo={
                    photos[
                      modelKey(rows.find((r) => r.id === active) || rows[0])
                    ]
                  }
                  togglePhoto={(r, include) =>
                    setPhotos((old) => {
                      const key = modelKey(r),
                        p = old[key];
                      return p?.status === 'found'
                        ? { ...old, [key]: { ...p, include } }
                        : old;
                    })
                  }
                  toggle={(id) =>
                    setRows((old) =>
                      old.map((r) =>
                        r.id === id ? { ...r, selected: !r.selected } : r,
                      ),
                    )
                  }
                  selectAll={(v) =>
                    setRows((old) =>
                      old.map((r) => ({ ...r, selected: !r.result && v })),
                    )
                  }
                />
                <section className="imp-panel imp-commit">
                  <div>
                    <div className="imp-eyebrow">Step 3 / Add to catalogue</div>
                    <h2>
                      {selected.length} of {rows.length} rows selected
                    </h2>
                    <p>
                      {!canWrite
                        ? 'Database imports are not configured on this site.'
                        : invalid.length
                          ? invalid.length +
                            ' selected rows need corrections. Edit or deselect them to continue.'
                          : 'Existing sizes will be skipped. Only selected rows will be added.'}
                    </p>
                  </div>
                  <button
                    className="imp-primary"
                    onClick={commit}
                    disabled={
                      !!busy ||
                      !canWrite ||
                      !selected.length ||
                      !!invalid.length
                    }
                  >
                    {busy === 'commit' ? 'Adding…' : 'Add selected to MySQL'}
                  </button>
                </section>
              </>
            )}
          </>
        )}
      </div>
    </main>
  );
}
