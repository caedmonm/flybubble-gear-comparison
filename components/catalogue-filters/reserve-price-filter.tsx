'use client';

import { Input } from '@/components/ui/input';
import type { CatalogueFilterProps } from './types';

export default function ReservePriceFilter({
  reserveFilters,
  setReserveFilters,
}: Pick<CatalogueFilterProps, 'reserveFilters' | 'setReserveFilters'>) {
  return (
    <section className="advanced-filter">
      <h3>Maximum price (£)</h3>
      <Input
        aria-label="Maximum reserve price in pounds"
        type="number"
        min="0"
        step="any"
        placeholder="Any price (£)"
        value={reserveFilters.maxPrice}
        onChange={(event) =>
          setReserveFilters({ ...reserveFilters, maxPrice: event.target.value })
        }
      />
    </section>
  );
}
