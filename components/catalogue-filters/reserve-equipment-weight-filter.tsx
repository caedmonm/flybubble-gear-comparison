'use client';

import { Input } from '@/components/ui/input';
import type { CatalogueFilterProps } from './types';

export default function ReserveEquipmentWeightFilter({
  reserveFilters,
  setReserveFilters,
}: Pick<CatalogueFilterProps, 'reserveFilters' | 'setReserveFilters'>) {
  return (
    <section className="advanced-filter">
      <h3>Maximum equipment weight (g)</h3>
      <Input
        aria-label="Maximum reserve weight in grams"
        type="number"
        min="0"
        step="1"
        placeholder="Any weight (g)"
        value={reserveFilters.maxWeightGrams}
        onChange={(event) =>
          setReserveFilters({
            ...reserveFilters,
            maxWeightGrams: event.target.value,
          })
        }
      />
    </section>
  );
}
