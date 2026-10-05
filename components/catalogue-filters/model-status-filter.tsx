'use client';

import { NativeSelect } from '@/components/ui/native-select';
import type { CatalogueFilterProps } from './types';

export default function ModelStatusFilter({
  facets,
  modelStatus,
  setModelStatus,
}: Pick<CatalogueFilterProps, 'facets' | 'modelStatus' | 'setModelStatus'>) {
  return (
    <section>
      <h3>Model status</h3>
      <NativeSelect
        aria-label="Model status"
        value={modelStatus}
        onChange={(event) => setModelStatus(event.target.value)}
      >
        <option value="All">All</option>
        {(facets.statuses.includes('Current') || modelStatus === 'Current') && (
          <option value="Current">Current</option>
        )}
        {(facets.statuses.includes('Past model') ||
          modelStatus === 'Past model') && (
          <option value="Past model">Past</option>
        )}
      </NativeSelect>
    </section>
  );
}
