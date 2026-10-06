'use client';

import type { CatalogueFilterProps } from './types';

export default function ModelStatusFilter({
  modelStatus,
  setModelStatus,
}: Pick<CatalogueFilterProps, 'modelStatus' | 'setModelStatus'>) {
  return (
    <section>
      <h3>Model status</h3>
      <fieldset
        className="cert-options model-status-options"
        aria-label="Model status"
      >
        {['All', 'Current', 'Past model'].map((status) => (
          <button
            key={status}
            type="button"
            aria-pressed={modelStatus === status}
            className={modelStatus === status ? 'selected' : ''}
            onClick={() => setModelStatus(status)}
          >
            {status === 'Past model' ? 'Past' : status}
          </button>
        ))}
      </fieldset>
    </section>
  );
}
