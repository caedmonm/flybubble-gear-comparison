'use client';

import { NativeSelect } from '@/components/ui/native-select';
import type { CatalogueFilterProps } from './types';

export default function WingEquipmentWeightFilter({
  wingMaxWeight,
  setWingMaxWeight,
}: Pick<CatalogueFilterProps, 'wingMaxWeight' | 'setWingMaxWeight'>) {
  return (
    <section className="advanced-filter">
      <h3>Maximum equipment weight</h3>
      <NativeSelect
        aria-label="Maximum equipment weight"
        value={wingMaxWeight}
        onChange={(event) => setWingMaxWeight(event.target.value)}
      >
        <option value="">Any weight</option>
        {[1, 1.5, 2, 3, 4, 5, 6].map((w) => (
          <option key={w} value={w}>
            Up to {w} kg
          </option>
        ))}
      </NativeSelect>
    </section>
  );
}
