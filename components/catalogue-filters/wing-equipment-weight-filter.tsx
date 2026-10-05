'use client';

import NumericAvailability from './numeric-availability';
import { NativeSelect } from '@/components/ui/native-select';
import type { CatalogueFilterProps } from './types';

export default function WingEquipmentWeightFilter({
  facets,
  wingMaxWeight,
  setWingMaxWeight,
}: Pick<
  CatalogueFilterProps,
  'facets' | 'wingMaxWeight' | 'setWingMaxWeight'
>) {
  const thresholds = [1, 1.5, 2, 3, 4, 5, 6];
  const bounds = facets.weight;
  const ceiling = bounds
    ? (thresholds.find((w) => w >= bounds[1]) ?? Math.ceil(bounds[1]))
    : null;
  const options = [
    ...new Set([
      ...thresholds.filter(
        (w) => bounds && w >= bounds[0] && w <= (ceiling ?? bounds[1]),
      ),
      ...(ceiling == null ? [] : [ceiling]),
      ...(wingMaxWeight ? [Number(wingMaxWeight)] : []),
    ]),
  ].sort((a, b) => a - b);
  return (
    <section className="advanced-filter">
      <h3>Maximum gear weight</h3>
      <NativeSelect
        aria-label="Maximum equipment weight"
        value={wingMaxWeight}
        onChange={(event) => setWingMaxWeight(event.target.value)}
      >
        <option value="">Any weight</option>
        {options.map((w) => (
          <option key={w} value={w}>
            Up to {w} kg
          </option>
        ))}
      </NativeSelect>
      <NumericAvailability bounds={facets.weight} unit="kg" />
    </section>
  );
}
