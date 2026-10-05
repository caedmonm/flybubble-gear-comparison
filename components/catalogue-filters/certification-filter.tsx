'use client';

import { MultiSelectFilter } from '@/components/filter-controls';
import type { CatalogueFilterProps } from './types';

export default function CertificationFilter({
  facets,
  certScheme,
  cert,
  dgac,
  setCertScheme,
  setCert,
  setDgac,
}: Pick<
  CatalogueFilterProps,
  | 'facets'
  | 'certScheme'
  | 'cert'
  | 'dgac'
  | 'setCertScheme'
  | 'setCert'
  | 'setDgac'
>) {
  return (
    <section className="certification-filter">
      <h3>Certification</h3>
      <fieldset
        className="cert-options cert-schemes"
        aria-label="Certification scheme"
      >
        {['EN', 'LTF', 'Other']
          .filter(
            (scheme) =>
              scheme === certScheme ||
              facets.certifications[scheme as 'EN' | 'LTF' | 'Other'].length >
                0,
          )
          .map((scheme) => (
            <button
              key={scheme}
              aria-pressed={scheme === certScheme}
              className={scheme === certScheme ? 'selected' : ''}
              onClick={() => {
                setCertScheme(scheme);
                setCert([]);
              }}
            >
              {scheme}
            </button>
          ))}
      </fieldset>
      {(certScheme === 'EN' || certScheme === 'LTF') && (
        <fieldset
          className="cert-options"
          aria-label={`${certScheme} certification class`}
        >
          {['All', 'A', 'B', 'C', 'D']
            .filter(
              (rating) =>
                rating === 'All' ||
                cert.includes(rating) ||
                facets.certifications[certScheme as 'EN' | 'LTF'].includes(
                  rating,
                ),
            )
            .map((rating) => (
              <button
                key={rating}
                aria-pressed={
                  rating === 'All' ? !cert.length : cert.includes(rating)
                }
                className={
                  (rating === 'All' ? !cert.length : cert.includes(rating))
                    ? 'selected'
                    : ''
                }
                onClick={() =>
                  setCert(
                    rating === 'All'
                      ? []
                      : cert.includes(rating)
                        ? cert.filter((value) => value !== rating)
                        : [...cert, rating],
                  )
                }
              >
                {rating}
              </button>
            ))}
        </fieldset>
      )}
      {certScheme === 'Other' && (
        <MultiSelectFilter
          label="Other certifications"
          options={facets.certifications.Other}
          value={cert}
          onChange={setCert}
          placeholder="All other certifications"
        />
      )}
      <h3 style={{ marginTop: '13px' }}>DGAC (Paramotor)</h3>
      <fieldset className="cert-options" aria-label="DGAC certification">
        {['', 'Yes', 'No'].map((value) => (
          <button
            key={value}
            aria-pressed={dgac === value}
            className={dgac === value ? 'selected' : ''}
            onClick={() => setDgac(value)}
          >
            {value || 'Any'}
          </button>
        ))}
      </fieldset>
    </section>
  );
}
