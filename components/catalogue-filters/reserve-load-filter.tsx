'use client';

import { NumericPair } from './numeric-pair';
import type { CatalogueFilterProps } from './types';

export default function ReserveLoadFilter({
  reserveFilters,
  setReserveFilters,
}: Pick<CatalogueFilterProps, 'reserveFilters' | 'setReserveFilters'>) {
  return (
    <section className="advanced-filter reserve-load-filter">
      <h3>Reserve load limits</h3>
      <NumericPair
        label="Reserve load"
        unit="kg"
        min={reserveFilters.loadMin}
        max={reserveFilters.loadMax}
        onMin={(next) =>
          setReserveFilters({ ...reserveFilters, loadMin: next })
        }
        onMax={(next) =>
          setReserveFilters({ ...reserveFilters, loadMax: next })
        }
      />
      <p className="filter-note">
        Min excludes reserves with a lower minimum load. Max excludes reserves
        with a higher maximum load, to remove oversized reserves.
      </p>
    </section>
  );
}
