'use client';

import { RangeFilter } from '@/components/filter-controls';
import type { CatalogueFilterProps } from './types';

export default function WingAreaFilter({
  areaRange,
  wingOptions,
  setAreaRange,
}: Pick<CatalogueFilterProps, 'areaRange' | 'wingOptions' | 'setAreaRange'>) {
  return (
    <RangeFilter
      label="Flat surface"
      unit="m²"
      bounds={wingOptions.area}
      value={areaRange}
      step={0.1}
      onChange={setAreaRange}
    />
  );
}
