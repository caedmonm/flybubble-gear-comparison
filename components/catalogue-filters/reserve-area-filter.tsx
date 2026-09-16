'use client';

import { Input } from '@/components/ui/input';
import type { CatalogueFilterProps } from './types';

export default function ReserveAreaFilter({
  reserveFilters,
  setReserveFilters,
}: Pick<CatalogueFilterProps, 'reserveFilters' | 'setReserveFilters'>) {
  return (
    <section className="advanced-filter">
      <h3>Minimum flat surface (m²)</h3>
      <Input
        aria-label="Minimum reserve flat surface in square metres"
        type="number"
        min="0"
        step="any"
        placeholder="Any area (m²)"
        value={reserveFilters.minArea}
        onChange={(event) =>
          setReserveFilters({ ...reserveFilters, minArea: event.target.value })
        }
      />
    </section>
  );
}
