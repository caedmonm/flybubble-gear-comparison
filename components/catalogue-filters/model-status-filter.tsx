'use client';

import { NativeSelect } from '@/components/ui/native-select';
import type { CatalogueFilterProps } from './types';

export default function ModelStatusFilter({
  modelStatus,
  setModelStatus,
}: Pick<CatalogueFilterProps, 'modelStatus' | 'setModelStatus'>) {
  return (
    <section>
      <h3>Model status</h3>
      <NativeSelect
        aria-label="Model status"
        value={modelStatus}
        onChange={(event) => setModelStatus(event.target.value)}
      >
        <option value="All">All</option>
        <option value="Current">Current</option>
        <option value="Past model">Past</option>
      </NativeSelect>
    </section>
  );
}
