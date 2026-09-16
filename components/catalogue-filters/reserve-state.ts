import type { ReserveFilters } from '@/shared/types';

export const emptyReserveFilters = (): ReserveFilters => ({
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
