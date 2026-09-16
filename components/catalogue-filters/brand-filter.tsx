'use client';

import { MultiSelectFilter } from '@/components/filter-controls';
import type { CatalogueFilterProps } from './types';

export default function BrandFilter({
  brands,
  selectedBrands,
  setSelectedBrands,
}: Pick<
  CatalogueFilterProps,
  'brands' | 'selectedBrands' | 'setSelectedBrands'
>) {
  return (
    <section>
      <h3>Brand</h3>
      <MultiSelectFilter
        label="Brands"
        options={brands}
        value={selectedBrands}
        onChange={setSelectedBrands}
        placeholder="All brands"
      />
    </section>
  );
}
