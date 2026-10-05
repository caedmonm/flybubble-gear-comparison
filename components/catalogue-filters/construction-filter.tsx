'use client';

import { MultiSelectFilter } from '@/components/filter-controls';
import type { CatalogueFilterProps } from './types';

export default function ConstructionFilter({
  facets,
  constructions,
  setConstructions,
}: Pick<
  CatalogueFilterProps,
  'facets' | 'constructions' | 'setConstructions'
>) {
  return (
    <section>
      <h3>Construction</h3>
      <MultiSelectFilter
        label="Construction"
        options={facets.constructions}
        value={constructions}
        onChange={setConstructions}
        placeholder="Any construction"
      />
    </section>
  );
}
