/** @returns {import('./types').ReserveFilters} */
export function defaultReserveFilters() {
  return {
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
  };
}

export function defaultUrlFilters() {
  return {
    query: '',
    selectedBrands: /** @type {string[]} */ ([]),
    filterSizes: /** @type {string[]} */ ([]),
    colours: /** @type {string[]} */ ([]),
    areaRange: /** @type {number[] | null} */ (null),
    aspectRatioRange: /** @type {number[] | null} */ (null),
    cellsRange: /** @type {number[] | null} */ (null),
    certScheme: 'EN',
    cert: 'All',
    wingMaxWeight: '',
    maxPrice: '',
    allUpWeight: '',
    modelStatus: 'All',
    forSaleOnly: false,
    sort: 'featured',
    reserveFilters: defaultReserveFilters(),
  };
}

const lists = {
  selectedBrands: 'brand',
  filterSizes: 'size',
  colours: 'colour',
};
const ranges = {
  areaRange: 'area',
  aspectRatioRange: 'aspectRatio',
  cellsRange: 'cells',
};
const strings = [
  'query',
  'certScheme',
  'cert',
  'wingMaxWeight',
  'maxPrice',
  'allUpWeight',
  'modelStatus',
  'sort',
];
const reserveNumbers = [
  'allUpWeight',
  'maxWeightGrams',
  'volumeMin',
  'volumeMax',
  'minArea',
  'loadMin',
  'loadMax',
  'maxPrice',
];
const managedKeys = [
  'selection',
  'item',
  'view',
  'forSale',
  ...Object.values(lists),
  ...Object.values(ranges),
  ...strings,
  'reserve.type',
  'reserve.steerable',
  'reserve.loadPercent',
  ...reserveNumbers.map((key) => `reserve.${key}`),
];

/** @param {URLSearchParams} params */
export function hasCatalogueUrlState(params) {
  return managedKeys.some((key) => params.has(key));
}

/** @param {URLSearchParams} params */
export function readUrlFilters(params) {
  const filters = defaultUrlFilters();
  for (const [key, param] of Object.entries(lists))
    filters[key] = [...new Set(params.getAll(param).filter(Boolean))];
  for (const [key, param] of Object.entries(ranges)) {
    const raw = params.get(param)?.split(',');
    const values = raw?.map(Number);
    if (
      raw?.length === 2 &&
      raw.every((value) => value.trim() !== '') &&
      values.every((value) => Number.isFinite(value) && value >= 0) &&
      values[0] <= values[1]
    )
      filters[key] = values;
  }
  for (const key of strings)
    if (params.has(key)) filters[key] = params.get(key);
  if (!['featured', 'price', 'weight', 'name'].includes(filters.sort))
    filters.sort = 'featured';
  if (!['All', 'Current', 'Past model'].includes(filters.modelStatus))
    filters.modelStatus = 'All';
  if (!['EN', 'LTF', 'DGAC', 'Other'].includes(filters.certScheme))
    filters.certScheme = 'EN';
  const ratings =
    filters.certScheme === 'Other'
      ? ['CCC', 'Load Test Only', 'Uncertified']
      : ['All', 'A', 'B', 'C', 'D'];
  if (!ratings.includes(filters.cert)) filters.cert = ratings[0];
  filters.forSaleOnly = params.get('forSale') === '1';
  filters.reserveFilters.types = [
    ...new Set(params.getAll('reserve.type').filter(Boolean)),
  ];
  const steerable = params.get('reserve.steerable');
  if (['Yes', 'No'].includes(steerable))
    filters.reserveFilters.steerable = steerable;
  for (const key of reserveNumbers)
    if (params.has(`reserve.${key}`))
      filters.reserveFilters[key] = params.get(`reserve.${key}`);
  const percent = Number(params.get('reserve.loadPercent'));
  if ([90, 95, 100].includes(percent))
    filters.reserveFilters.loadPercent = percent;
  return filters;
}

/** Validate public product IDs and exact sizes without trusting URL JSON.
 * @param {string | null} raw
 * @param {import('./types').Product[]} products
 */
export function readUrlSelection(raw, products) {
  try {
    const entries = JSON.parse(raw || '[]');
    if (!Array.isArray(entries)) return [];
    const result = /** @type {{id: string, size: string}[]} */ ([]);
    let category;
    for (const entry of entries) {
      if (
        !entry ||
        typeof entry.id !== 'string' ||
        result.some((item) => item.id === entry.id)
      )
        continue;
      const product = products.find(
        (item) => item.id === entry.id || item.shareId === entry.id,
      );
      if (product && result.some((item) => item.id === product.id)) continue;
      if (
        !product ||
        !product.variants.length ||
        (category && product.category !== category)
      )
        continue;
      category = product.category;
      const variant =
        product.variants.find((item) => item.size === entry.size) ||
        product.variants.find((item) => item.status === 'Current') ||
        product.variants[0];
      result.push({ id: product.id, size: variant.size });
      if (result.length === 4) break;
    }
    return result;
  } catch {
    return [];
  }
}

/** @param {URLSearchParams} params
 * @param {import('./types').Product[]} products
 */
export function readCatalogueSelection(params, products) {
  if (!params.has('item'))
    return readUrlSelection(params.get('selection'), products);
  const entries = params.getAll('item').map((value) => {
    const separator = value.indexOf('~');
    return {
      id: separator < 0 ? value : value.slice(0, separator),
      size: separator < 0 ? undefined : value.slice(separator + 1),
    };
  });
  return readUrlSelection(JSON.stringify(entries), products);
}

/** @param {URLSearchParams} existing
 * @param {ReturnType<typeof defaultUrlFilters>} filters
 * @param {{id: string, size?: string}[]} selection
 * @param {boolean} compareOpen
 */
export function writeCatalogueUrl(existing, filters, selection, compareOpen) {
  const params = new URLSearchParams(existing);
  for (const key of managedKeys) params.delete(key);
  const defaults = defaultUrlFilters();
  for (const [key, param] of Object.entries(lists))
    for (const value of [...new Set(filters[key])].sort((a, b) =>
      a.localeCompare(b),
    ))
      params.append(param, value);
  for (const [key, param] of Object.entries(ranges))
    if (filters[key]) params.set(param, filters[key].join(','));
  for (const key of strings)
    if (filters[key] !== defaults[key]) params.set(key, filters[key]);
  if (filters.forSaleOnly) params.set('forSale', '1');
  const reserve = filters.reserveFilters;
  for (const value of [...new Set(reserve.types)].sort((a, b) =>
    a.localeCompare(b),
  ))
    params.append('reserve.type', value);
  if (reserve.steerable) params.set('reserve.steerable', reserve.steerable);
  for (const key of reserveNumbers)
    if (reserve[key] !== '') params.set(`reserve.${key}`, reserve[key]);
  if (reserve.loadPercent !== 100)
    params.set('reserve.loadPercent', String(reserve.loadPercent));
  if (selection.length) {
    for (const entry of selection)
      params.append('item', `${entry.id}~${entry.size || ''}`);
    params.set('view', compareOpen ? 'compare' : 'search');
  }
  return params;
}
