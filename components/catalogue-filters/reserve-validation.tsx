'use client';

import { reserveFilterError } from '@/shared/filter.mjs';
import type { CatalogueFilterProps } from './types';

export default function ReserveValidation({
  reserveFilters,
}: Pick<CatalogueFilterProps, 'reserveFilters'>) {
  const error = reserveFilterError(reserveFilters);
  return error ? (
    <p className="filter-validation" role="alert">
      {error}
    </p>
  ) : null;
}
