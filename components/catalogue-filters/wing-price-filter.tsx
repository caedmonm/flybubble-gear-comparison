'use client';

import { Input } from '@/components/ui/input';
import type { CatalogueFilterProps } from './types';

export default function WingPriceFilter({
  maxPrice,
  setMaxPrice,
}: Pick<CatalogueFilterProps, 'maxPrice' | 'setMaxPrice'>) {
  return (
    <section className="advanced-filter">
      <h3>Maximum price (£)</h3>
      <Input
        aria-label="Maximum recorded price in pounds"
        type="number"
        min="1"
        step="100"
        placeholder="Any price (£)"
        value={maxPrice}
        onChange={(e) => setMaxPrice(e.target.value)}
      />
    </section>
  );
}
