'use client';

import NumericAvailability from './numeric-availability';
import { Input } from '@/components/ui/input';
import type { CatalogueFilterProps } from './types';

export default function WingAllUpWeightFilter({
  facets,
  allUpWeight,
  setAllUpWeight,
}: Pick<CatalogueFilterProps, 'facets' | 'allUpWeight' | 'setAllUpWeight'>) {
  return (
    <section className="advanced-filter">
      <h3>All-up weight (kg)</h3>
      <Input
        aria-label="All-up flying weight in kilograms"
        type="number"
        min="1"
        max="400"
        placeholder="e.g. 90"
        value={allUpWeight}
        onChange={(e) => setAllUpWeight(e.target.value)}
      />
      <NumericAvailability
        bounds={
          facets.loadMin && facets.loadMax
            ? [facets.loadMin[0], facets.loadMax[1]]
            : null
        }
        unit="kg"
      />
      <p className="filter-hint">
        Pilot + wing + harness + all equipment. Matches the recorded load range.
      </p>
    </section>
  );
}
