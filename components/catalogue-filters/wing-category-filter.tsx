'use client';

import { MultiSelectFilter } from '@/components/filter-controls';
import type { CatalogueFilterProps } from './types';

export default function WingCategoryFilter({
  facets,
  wingCategories,
  setWingCategories,
}: Pick<CatalogueFilterProps, 'facets' | 'wingCategories' | 'setWingCategories'>) {
  return (
    <section>
      <h3>Wing Category</h3>
      <MultiSelectFilter
        label="Wing Category"
        options={facets.wingCategories}
        value={wingCategories}
        onChange={setWingCategories}
        placeholder="All Paragliders"
      />
    </section>
  );
}
