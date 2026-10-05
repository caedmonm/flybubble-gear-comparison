import { filterCatalogue, rangeBounds } from './filter.mjs';

// Ignore only a facet's own selection, so it can be broadened again.
// All other specifications still have to match the same size record.
export function catalogueFacets(products, filters) {
  const facet = (keys, reserveKeys = []) => {
    const next = { ...filters, reserve: { ...filters.reserve } };
    for (const key of keys) delete next[key];
    for (const key of reserveKeys) delete next.reserve[key];
    return filterCatalogue(products, next);
  };
  const values = (items, field) =>
    [
      ...new Set(
        items
          .flatMap((p) => p.variants.map((v) => v[field]))
          .filter((v) => v != null && v !== ''),
      ),
    ].sort((a, b) =>
      String(a).localeCompare(String(b), 'en', { numeric: true }),
    );
  const wings = filters.category === 'Wings';
  const numeric = (key, field, reserveKeys = [], scale = 1) => {
    const items = facet(wings ? [key] : [], wings ? [] : reserveKeys);
    const numbers = values(items, field)
      .filter((v) => typeof v === 'number' && Number.isFinite(v))
      .map((v) => v * scale);
    return numbers.length ? [Math.min(...numbers), Math.max(...numbers)] : null;
  };
  const certifications = facet(['cert', 'certScheme']);
  return {
    brands: [...new Set(facet(['brands']).map((p) => p.brand))].sort((a, b) =>
      String(a).localeCompare(String(b)),
    ),
    statuses: values(facet(['modelStatus']), 'status'),
    forSale: facet(['forSaleOnly']).some((p) =>
      p.variants.some((v) => v.forSale),
    ),
    sizes: values(facet(['sizes']), 'size'),
    colours: [
      ...new Set(facet(['colours']).flatMap((p) => p.colours || [])),
    ].sort((a, b) => String(a).localeCompare(String(b))),
    area: rangeBounds(
      facet(wings ? ['areaRange'] : [], wings ? [] : ['areaRange']),
      'area',
      0.1,
    ),
    aspectRatio: rangeBounds(facet(['aspectRatioRange']), 'aspectRatio', 0.01),
    cells: rangeBounds(facet(['cellsRange']), 'cells', 1),
    certifications: {
      EN: values(certifications, 'certClass'),
      LTF: values(certifications, 'ltfClass'),
      DGAC: certifications.some((p) => p.variants.some((v) => v.dgac)),
      Other: [
        ...new Set(
          certifications.flatMap((p) =>
            p.variants.flatMap((v) => v.otherCertifications || []),
          ),
        ),
      ],
    },
    types: values(facet([], ['types']), 'type'),
    steerable: values(facet([], ['steerable']), 'steerable'),
    price: numeric('maxPrice', 'price', ['maxPrice']),
    weight: numeric(
      'maxWeight',
      'weight',
      ['maxWeightGrams'],
      wings ? 1 : 1000,
    ),
    minArea: numeric('', 'area', ['minArea']),
    loadMin: numeric('allUpWeight', 'minLoad', [
      'allUpWeight',
      'loadPercent',
      'loadMin',
      'loadMax',
    ]),
    loadMax: numeric('allUpWeight', 'maxLoad', [
      'allUpWeight',
      'loadPercent',
      'loadMin',
      'loadMax',
    ]),
    volumeMin: numeric('', 'volumeMin', ['volumeMin', 'volumeMax']),
    volumeMax: numeric('', 'volumeMax', ['volumeMin', 'volumeMax']),
  };
}
