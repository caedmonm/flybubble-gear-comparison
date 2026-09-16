'use client';

import type { ComponentType } from 'react';
import type { CatalogueFilterProps } from './types';
import BrandFilter from './brand-filter';
import SizeFilter from './size-filter';
import ColourFilter from './colour-filter';
import CertificationFilter from './certification-filter';
import WingAllUpWeightFilter from './wing-all-up-weight-filter';
import WingEquipmentWeightFilter from './wing-equipment-weight-filter';
import WingAreaFilter from './wing-area-filter';
import WingAspectRatioFilter from './wing-aspect-ratio-filter';
import WingCellsFilter from './wing-cells-filter';
import WingPriceFilter from './wing-price-filter';
import ModelStatusFilter from './model-status-filter';
import ForSaleFilter from './for-sale-filter';
import ReserveTypeFilter from './reserve-type-filter';
import ReserveSteerableFilter from './reserve-steerable-filter';
import ReserveAllUpWeightFilter from './reserve-all-up-weight-filter';
import ReserveEquipmentWeightFilter from './reserve-equipment-weight-filter';
import ReserveVolumeFilter from './reserve-volume-filter';
import ReserveAreaFilter from './reserve-area-filter';
import ReserveLoadFilter from './reserve-load-filter';
import ReservePriceFilter from './reserve-price-filter';
import ReserveValidation from './reserve-validation';

const filters = {
  Wings: [
    BrandFilter,
    WingAllUpWeightFilter,
    CertificationFilter,
    WingEquipmentWeightFilter,
    SizeFilter,
    ColourFilter,
    WingAreaFilter,
    WingAspectRatioFilter,
    WingCellsFilter,
    WingPriceFilter,
    ModelStatusFilter,
    ForSaleFilter,
  ],
  Reserves: [
    BrandFilter,
    ReserveAllUpWeightFilter,
    ReserveTypeFilter,
    ReserveSteerableFilter,
    ReserveEquipmentWeightFilter,
    ReserveVolumeFilter,
    ReserveAreaFilter,
    ReserveLoadFilter,
    ReservePriceFilter,
    ReserveValidation,
    ModelStatusFilter,
    ForSaleFilter,
  ],
} satisfies Record<'Wings' | 'Reserves', ComponentType<CatalogueFilterProps>[]>;

export default function CatalogueFilters({
  category,
  ...props
}: CatalogueFilterProps & { category: keyof typeof filters }) {
  return (
    <>
      {filters[category].map((Filter, index) => (
        <Filter key={index} {...props} />
      ))}
    </>
  );
}
