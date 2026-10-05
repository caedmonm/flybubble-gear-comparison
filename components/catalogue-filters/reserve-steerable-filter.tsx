'use client';

import { NativeSelect } from '@/components/ui/native-select';
import type { CatalogueFilterProps } from './types';

export default function ReserveSteerableFilter({
  facets,
  reserveFilters,
  setReserveFilters,
}: Pick<
  CatalogueFilterProps,
  'facets' | 'reserveFilters' | 'setReserveFilters'
>) {
  return (
    <section>
      <h3>Steerable</h3>
      <NativeSelect
        aria-label="Steerable"
        value={reserveFilters.steerable}
        onChange={(event) =>
          setReserveFilters({
            ...reserveFilters,
            steerable: event.target.value,
          })
        }
      >
        <option value="">All</option>
        {[
          ...new Set(
            [...facets.steerable, reserveFilters.steerable].filter(Boolean),
          ),
        ].map((value) => (
          <option key={value}>{value}</option>
        ))}
      </NativeSelect>
    </section>
  );
}
