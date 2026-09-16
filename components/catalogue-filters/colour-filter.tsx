'use client';

import { MultiSelectFilter } from '@/components/filter-controls';
import type { CatalogueFilterProps } from './types';

export default function ColourFilter({
  colours,
  wingOptions,
  setColours,
}: Pick<CatalogueFilterProps, 'colours' | 'wingOptions' | 'setColours'>) {
  return (
    <section>
      <h3>Colours</h3>
      <MultiSelectFilter
        label="Colours"
        options={wingOptions.colours}
        value={colours}
        onChange={setColours}
        placeholder="All colours"
      />
    </section>
  );
}
