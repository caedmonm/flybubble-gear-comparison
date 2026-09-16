'use client';

import { NativeSelect } from '@/components/ui/native-select';
import type { CatalogueFilterProps } from './types';

export default function ReserveSteerableFilter({
  reserveFilters,
  setReserveFilters,
}: Pick<CatalogueFilterProps, 'reserveFilters' | 'setReserveFilters'>) {
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
        <option>Yes</option>
        <option>No</option>
      </NativeSelect>
    </section>
  );
}
