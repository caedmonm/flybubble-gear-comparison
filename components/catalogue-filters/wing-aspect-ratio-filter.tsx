'use client';

import { RangeFilter } from '@/components/filter-controls';
import type { CatalogueFilterProps } from './types';

export default function WingAspectRatioFilter({
  aspectRatioRange,
  wingOptions,
  setAspectRatioRange,
}: Pick<
  CatalogueFilterProps,
  'aspectRatioRange' | 'wingOptions' | 'setAspectRatioRange'
>) {
  return (
    <RangeFilter
      label="Flat aspect ratio"
      bounds={wingOptions.aspectRatio}
      value={aspectRatioRange}
      step={0.01}
      onChange={setAspectRatioRange}
    />
  );
}
