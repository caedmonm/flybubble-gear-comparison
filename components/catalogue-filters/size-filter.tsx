'use client';

import { MultiSelectFilter } from '@/components/filter-controls';
import type { CatalogueFilterProps } from './types';

export default function SizeFilter({
  filterSizes,
  wingOptions,
  setFilterSizes,
}: Pick<
  CatalogueFilterProps,
  'filterSizes' | 'wingOptions' | 'setFilterSizes'
>) {
  return (
    <section>
      <h3>Sizes</h3>
      <MultiSelectFilter
        label="Sizes"
        options={wingOptions.sizes}
        value={filterSizes}
        onChange={setFilterSizes}
        placeholder="All sizes"
      />
    </section>
  );
}
