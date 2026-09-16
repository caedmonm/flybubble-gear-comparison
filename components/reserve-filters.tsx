'use client';

import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import { MultiSelectFilter } from '@/components/filter-controls';
import { reserveFilterError } from '@/shared/filter.mjs';
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

function NumericPair({
  label,
  unit,
  min,
  max,
  onMin,
  onMax,
  step = 'any',
}: {
  label: string;
  unit: string;
  min: string;
  max: string;
  onMin: (value: string) => void;
  onMax: (value: string) => void;
  step?: string;
}) {
  return (
    <div className="number-filter-pair">
      <label>
        <span>Min ({unit})</span>
        <Input
          aria-label={`${label} minimum in ${unit}`}
          type="number"
          min="0"
          step={step}
          placeholder="Any"
          value={min}
          onChange={(event) => onMin(event.target.value)}
        />
      </label>
      <label>
        <span>Max ({unit})</span>
        <Input
          aria-label={`${label} maximum in ${unit}`}
          type="number"
          min="0"
          step={step}
          placeholder="Any"
          value={max}
          onChange={(event) => onMax(event.target.value)}
        />
      </label>
    </div>
  );
}

export default function ReserveFilterControls({
  value,
  onChange,
}: {
  value: ReserveFilters;
  onChange: (value: ReserveFilters) => void;
}) {
  const set = <Key extends keyof ReserveFilters>(
    key: Key,
    next: ReserveFilters[Key],
  ) => onChange({ ...value, [key]: next });
  const error = reserveFilterError(value);
  return (
    <>
      <section>
        <h3>Type</h3>
        <MultiSelectFilter
          label="Reserve types"
          options={[
            'BASE',
            'Pentagon',
            'Rogallo',
            'Round PDA',
            'Square',
            'Square-Round',
          ]}
          value={value.types}
          onChange={(next) => set('types', next)}
          placeholder="All types"
        />
      </section>
      <section>
        <h3>Steerable</h3>
        <NativeSelect
          aria-label="Steerable"
          value={value.steerable}
          onChange={(event) => set('steerable', event.target.value)}
        >
          <option value="">All</option>
          <option>Yes</option>
          <option>No</option>
        </NativeSelect>
      </section>
      <section className="advanced-filter reserve-auw-filter">
        <h3>All-up weight (kg)</h3>
        <Input
          aria-label="All-up flying weight in kilograms"
          type="number"
          min="1"
          step="any"
          placeholder="e.g. 90"
          value={value.allUpWeight}
          onChange={(event) => set('allUpWeight', event.target.value)}
        />
        <p className="filter-note">
          Pilot + wing + harness + all equipment. Matches the recorded load
          range.
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
                  checked={value.loadPercent === percent}
                  onChange={() => set('loadPercent', percent)}
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
      <section className="advanced-filter">
        <h3>Maximum equipment weight (g)</h3>
        <Input
          aria-label="Maximum reserve weight in grams"
          type="number"
          min="0"
          step="1"
          placeholder="Any weight (g)"
          value={value.maxWeightGrams}
          onChange={(event) => set('maxWeightGrams', event.target.value)}
        />
      </section>
      <section className="advanced-filter reserve-volume-filter">
        <h3>Packed volume</h3>
        <NumericPair
          label="Packed volume"
          unit="L"
          min={value.volumeMin}
          max={value.volumeMax}
          onMin={(next) => set('volumeMin', next)}
          onMax={(next) => set('volumeMax', next)}
        />
        <p className="filter-note">
          The full recorded volume range must fit within these limits. Published
          volumes are approximate and may be understated. Confirm actual packed
          volume and harness fit.
        </p>
      </section>
      <section className="advanced-filter">
        <h3>Minimum flat surface (m²)</h3>
        <Input
          aria-label="Minimum reserve flat surface in square metres"
          type="number"
          min="0"
          step="any"
          placeholder="Any area (m²)"
          value={value.minArea}
          onChange={(event) => set('minArea', event.target.value)}
        />
      </section>
      <section className="advanced-filter reserve-load-filter">
        <h3>Reserve load limits</h3>
        <NumericPair
          label="Reserve load"
          unit="kg"
          min={value.loadMin}
          max={value.loadMax}
          onMin={(next) => set('loadMin', next)}
          onMax={(next) => set('loadMax', next)}
        />
        <p className="filter-note">
          Min excludes reserves with a lower minimum load. Max excludes reserves
          with a higher maximum load, to remove oversized reserves.
        </p>
      </section>
      <section className="advanced-filter">
        <h3>Maximum price (£)</h3>
        <Input
          aria-label="Maximum reserve price in pounds"
          type="number"
          min="0"
          step="any"
          placeholder="Any price (£)"
          value={value.maxPrice}
          onChange={(event) => set('maxPrice', event.target.value)}
        />
      </section>
      {error && (
        <p className="filter-validation" role="alert">
          {error}
        </p>
      )}
    </>
  );
}
