'use client';

import NumericAvailability from './numeric-availability';
import { NumericPair } from './numeric-pair';
import type { CatalogueFilterProps } from './types';

export default function ReserveVolumeFilter({
  facets,
  reserveFilters,
  setReserveFilters,
}: Pick<
  CatalogueFilterProps,
  'facets' | 'reserveFilters' | 'setReserveFilters'
>) {
  return (
    <section className="advanced-filter reserve-volume-filter">
      <h3>Packed volume</h3>
      <NumericPair
        label="Packed volume"
        unit="L"
        min={reserveFilters.volumeMin}
        max={reserveFilters.volumeMax}
        onMin={(next) =>
          setReserveFilters({ ...reserveFilters, volumeMin: next })
        }
        onMax={(next) =>
          setReserveFilters({ ...reserveFilters, volumeMax: next })
        }
      />
      <NumericAvailability
        bounds={
          facets.volumeMin && facets.volumeMax
            ? [facets.volumeMin[0], facets.volumeMax[1]]
            : null
        }
        unit="L"
      />
      <p className="filter-note">
        The full recorded volume range must fit within these limits. Published
        volumes are approximate and may be understated. Confirm actual packed
        volume and harness fit.
      </p>
    </section>
  );
}
