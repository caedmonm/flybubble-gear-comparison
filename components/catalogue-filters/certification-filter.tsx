'use client';

import { NativeSelect } from '@/components/ui/native-select';
import type { CatalogueFilterProps } from './types';

export default function CertificationFilter({
  certScheme,
  cert,
  setCertScheme,
  setCert,
}: Pick<
  CatalogueFilterProps,
  'certScheme' | 'cert' | 'setCertScheme' | 'setCert'
>) {
  return (
    <section className="certification-filter">
      <h3>Certification</h3>
      <fieldset
        className="cert-options cert-schemes"
        aria-label="Certification scheme"
      >
        {['EN', 'LTF', 'DGAC', 'Other'].map((scheme) => (
          <button
            key={scheme}
            aria-pressed={scheme === certScheme}
            onClick={() => {
              setCertScheme(scheme);
              setCert(scheme === 'Other' ? 'CCC' : 'All');
            }}
            className={scheme === certScheme ? 'selected' : ''}
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
          {['All', 'A', 'B', 'C', 'D'].map((c) => (
            <button
              key={c}
              onClick={() => setCert(c)}
              aria-pressed={c === cert}
              className={c === cert ? 'selected' : ''}
            >
              {c}
            </button>
          ))}
        </fieldset>
      )}
      {certScheme === 'Other' && (
        <NativeSelect
          aria-label="Other certification"
          value={cert}
          onChange={(event) => setCert(event.target.value)}
        >
          {['CCC', 'Load Test Only', 'Uncertified'].map((c) => (
            <option key={c}>{c}</option>
          ))}
        </NativeSelect>
      )}
      <p className="filter-hint">
        {certScheme === 'DGAC'
          ? 'Wings with recorded DGAC certification.'
          : 'Compare the certification for each size.'}
      </p>
    </section>
  );
}
