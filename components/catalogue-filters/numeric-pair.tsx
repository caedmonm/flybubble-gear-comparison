import { Input } from '@/components/ui/input';

export function NumericPair({
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
