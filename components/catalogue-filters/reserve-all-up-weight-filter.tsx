'use client';

import { Input } from '@/components/ui/input';
import type { CatalogueFilterProps } from './types';

export default function ReserveAllUpWeightFilter({
  reserveFilters,
  setReserveFilters,
}: Pick<CatalogueFilterProps, 'reserveFilters' | 'setReserveFilters'>) {
  return (
    <section className="advanced-filter reserve-auw-filter">
      <h3>All-up weight (kg)</h3>
      <Input
        aria-label="All-up flying weight in kilograms"
        type="number"
        min="1"
        step="any"
        placeholder="e.g. 90"
        value={reserveFilters.allUpWeight}
        onChange={(event) =>
          setReserveFilters({
            ...reserveFilters,
            allUpWeight: event.target.value,
          })
        }
      />
      <p className="filter-note">
        Pilot + wing + harness + all equipment. Matches the recorded load range.
      </p>
      <fieldset className="reserve-load-percentage">
        <legend>AUW limit as % of maximum load</legend>
        <div>
          {[90, 95, 100].map((percent) => (
            <label key={percent}>
              <input
                type="radio"
                name="reserve-load-percentage"
                value={percent}
                checked={reserveFilters.loadPercent === percent}
                onChange={() =>
                  setReserveFilters({ ...reserveFilters, loadPercent: percent })
                }
              />
              {percent}%
            </label>
          ))}
        </div>
        <p className="filter-note">
          Applies when AUW is entered. At 90%, a 100 kg reserve permits an AUW
          of up to 90 kg.
        </p>
      </fieldset>
    </section>
  );
}
