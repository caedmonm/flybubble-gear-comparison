'use client';

import { Input } from '@/components/ui/input';
import type { CatalogueFilterProps } from './types';

export default function WingAllUpWeightFilter({
  allUpWeight,
  setAllUpWeight,
}: Pick<CatalogueFilterProps, 'allUpWeight' | 'setAllUpWeight'>) {
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
      <p className="filter-hint">
        Pilot + wing + harness + all equipment. Matches the recorded load range.
      </p>
    </section>
  );
}
