'use client';

import type { ComponentType } from 'react';
import type { CatalogueFilterProps } from './types';
import ConstructionFilter from './construction-filter';
import BrandFilter from './brand-filter';
import WingCategoryFilter from './wing-category-filter';
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
import ReserveSurfaceFilter from './reserve-surface-filter';
import ReserveAreaFilter from './reserve-area-filter';
import ReserveLoadFilter from './reserve-load-filter';
import ReservePriceFilter from './reserve-price-filter';
import ReserveValidation from './reserve-validation';

const filters = {
  Wings: [
    WingCategoryFilter,
    ModelStatusFilter,
    ForSaleFilter,
    CertificationFilter,
    WingAspectRatioFilter,
    WingAllUpWeightFilter,
    WingAreaFilter,
    WingEquipmentWeightFilter,
    ConstructionFilter,
    WingCellsFilter,
    BrandFilter,
    SizeFilter,
    ColourFilter,
    WingPriceFilter,
  ],
  Reserves: [
    ModelStatusFilter,
    ForSaleFilter,
    ReserveAllUpWeightFilter,
    ReserveTypeFilter,
    ReserveSteerableFilter,
    ReserveSurfaceFilter,
    ReserveEquipmentWeightFilter,
    ReserveAreaFilter,
    ReserveLoadFilter,
    ReserveVolumeFilter,
    BrandFilter,
    ReservePriceFilter,
    ReserveValidation,
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
