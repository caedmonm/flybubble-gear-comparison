import type { ReserveFilters } from '@/shared/types';

export const emptyReserveFilters = (): ReserveFilters => ({
  areaRange: null,
  types: [],
  steerable: '',
  allUpWeight: '',
  loadPercent: 100,
  maxWeightGrams: '',
  volumeMin: '',
  volumeMax: '',
  minArea: '',
  loadMin: '',
  loadMax: '',
  maxPrice: '',
});
