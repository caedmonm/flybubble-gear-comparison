'use client';

import { Checkbox } from '@/components/ui/checkbox';
import type { CatalogueFilterProps } from './types';

export default function ForSaleFilter({
  forSaleOnly,
  setForSaleOnly,
}: Pick<CatalogueFilterProps, 'forSaleOnly' | 'setForSaleOnly'>) {
  return (
    <label className="current-toggle for-sale-toggle">
      <Checkbox
        checked={forSaleOnly}
        onCheckedChange={(value) => setForSaleOnly(!!value)}
      />{' '}
      Sold by Flybubble
    </label>
  );
}
