'use client';

import { MultiSelectFilter } from '@/components/filter-controls';
import type { CatalogueFilterProps } from './types';

export default function ReserveTypeFilter({
  reserveFilters,
  setReserveFilters,
}: Pick<CatalogueFilterProps, 'reserveFilters' | 'setReserveFilters'>) {
  return (
    <section>
      <h3>Type</h3>
      <MultiSelectFilter
        label="Reserve types"
        options={[
          'BASE',
          'Pentagon',
          'Rogallo',
          'Round PDA',
          'Square',
          'Square-Round',
        ]}
        value={reserveFilters.types}
        onChange={(next) =>
          setReserveFilters({ ...reserveFilters, types: next })
        }
        placeholder="All types"
      />
    </section>
  );
}
