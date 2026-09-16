'use client';

import { RangeFilter } from '@/components/filter-controls';
import type { CatalogueFilterProps } from './types';

export default function WingCellsFilter({
  cellsRange,
  wingOptions,
  setCellsRange,
}: Pick<CatalogueFilterProps, 'cellsRange' | 'wingOptions' | 'setCellsRange'>) {
  return (
    <RangeFilter
      label="Number of cells"
      bounds={wingOptions.cells}
      value={cellsRange}
      step={1}
      onChange={setCellsRange}
    />
  );
}
