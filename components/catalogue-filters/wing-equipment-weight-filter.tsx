'use client';

import { RangeFilter } from '@/components/filter-controls';
import type { CatalogueFilterProps } from './types';

export default function WingEquipmentWeightFilter({
  facets,
  weightRange,
  setWeightRange,
}: Pick<CatalogueFilterProps, 'facets' | 'weightRange' | 'setWeightRange'>) {
  return (
    <RangeFilter
      label="Gear weight"
      unit="kg"
      bounds={
        facets.gearWeight?.map((weight: number) =>
          Number((weight * 1).toFixed(3)),
        ) ?? null
      }
      value={
        weightRange?.map((weight) => Number((weight * 1).toFixed(3))) ?? null
      }
      step={0.1}
      onChange={(range) =>
        setWeightRange(range?.map((weight) => weight / 1) ?? null)
      }
    />
  );
}
