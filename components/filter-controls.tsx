'use client';

import { useId, useState } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTitle,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Slider } from '@/components/ui/slider';

export function MultiSelectFilter({
  label,
  options,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  options: string[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder: string;
}) {
  const [search, setSearch] = useState('');
  const visible = options.filter((option) =>
    option.toLowerCase().includes(search.trim().toLowerCase()),
  );
  return (
    <Popover onOpenChange={() => setSearch('')}>
      <PopoverTrigger
        className="multi-filter-trigger"
        aria-label={`Filter by ${label.toLowerCase()}`}
      >
        <span>
          {value.length === 0
            ? placeholder
            : value.length === 1
              ? value[0]
              : `${value.length} selected`}
        </span>
        <ChevronDown size={14} />
      </PopoverTrigger>
      <PopoverContent className="multi-filter-popup" align="start">
        <div className="multi-filter-heading">
          <PopoverTitle>{label}</PopoverTitle>
          <button
            type="button"
            disabled={!value.length}
            onClick={() => onChange([])}
          >
            Clear
          </button>
        </div>
        <div className="multi-filter-search">
          <Search size={14} />
          <Input
            aria-label={`Search ${label.toLowerCase()}`}
            placeholder={`Search ${label.toLowerCase()}…`}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <div className="multi-filter-options">
          {visible.map((option) => (
            <label key={option}>
              <Checkbox
                checked={value.includes(option)}
                onCheckedChange={(checked) =>
                  onChange(
                    checked
                      ? [...value, option]
                      : value.filter((item) => item !== option),
                  )
                }
              />
              <span>{option}</span>
            </label>
          ))}
          {!visible.length && (
            <p>
              {options.length ? 'No matching options.' : 'No options recorded.'}
            </p>
          )}
        </div>
        <p className="multi-filter-summary">
          {value.length ? `${value.length} selected` : placeholder}
        </p>
      </PopoverContent>
    </Popover>
  );
}

export function RangeFilter({
  label,
  unit = '',
  bounds,
  value,
  step,
  onChange,
}: {
  label: string;
  unit?: string;
  bounds: number[] | null;
  value: number[] | null;
  step: number;
  onChange: (value: number[] | null) => void;
}) {
  const id = useId();
  const current = value || bounds;
  return (
    <section className="range-filter">
      <h3 id={id}>
        {label}
        {unit && ` (${unit})`}
      </h3>
      {bounds && current ? (
        <>
          <div className="range-filter-values">
            <span>
              Min <strong>{current[0]}</strong>
            </span>
            <span>
              Max <strong>{current[1]}</strong>
            </span>
          </div>
          <Slider
            aria-labelledby={id}
            thumbLabels={[
              `Minimum ${label.toLowerCase()}`,
              `Maximum ${label.toLowerCase()}`,
            ]}
            min={bounds[0]}
            max={bounds[1]}
            step={step}
            value={current}
            thumbCollisionBehavior="none"
            onValueChange={(next) => {
              if (Array.isArray(next))
                onChange(
                  next[0] === bounds[0] && next[1] === bounds[1] ? null : next,
                );
            }}
          />
          {value && (
            <button
              className="range-filter-clear"
              onClick={() => onChange(null)}
              aria-label={`Clear ${label.toLowerCase()} range`}
            >
              Any {label.toLowerCase()}
            </button>
          )}
        </>
      ) : (
        <p className="filter-hint">No specifications recorded.</p>
      )}
    </section>
  );
}
