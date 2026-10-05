'use client';
import { RangeFilter } from '@/components/filter-controls';
import type { CatalogueFilterProps } from './types';
export default function ReserveSurfaceFilter({
  facets,
  reserveFilters,
  setReserveFilters,
}: CatalogueFilterProps) {
  return (
    <RangeFilter
      label="Flat surface"
      unit="m²"
      bounds={facets.area}
      value={reserveFilters.areaRange}
      step={0.1}
      onChange={(areaRange) =>
        setReserveFilters({ ...reserveFilters, areaRange })
      }
    />
  );
}
