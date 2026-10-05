'use client';

import { MultiSelectFilter } from '@/components/filter-controls';
import type { CatalogueFilterProps } from './types';

export default function ReserveTypeFilter({
  facets,
  reserveFilters,
  setReserveFilters,
}: Pick<
  CatalogueFilterProps,
  'facets' | 'reserveFilters' | 'setReserveFilters'
>) {
  return (
    <section>
      <h3>Type</h3>
      <MultiSelectFilter
        label="Reserve types"
        options={facets.types}
        value={reserveFilters.types}
        onChange={(next) =>
          setReserveFilters({ ...reserveFilters, types: next })
        }
        placeholder="All types"
      />
    </section>
  );
}
