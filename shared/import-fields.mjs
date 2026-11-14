import projection from './projection.json' with { type: 'json' };

export const categories = ['Wings', 'Reserves'];
export const maxRows = 2000;
export const identity = ['Make', 'Model', 'Size'];
export const tables = { Wings: 'WingsData', Reserves: 'ReservesData' };
export function fields(category) {
  if (!categories.includes(category))
    throw new Error('Choose Wings or Reserves.');
  return [
    ...projection[tables[category]],
    'modelyear',
    ...(category === 'Wings' ? ['Colours'] : ['ShopURL']),
  ];
}

export const labels = {
  Make: 'Brand',
  Model: 'Model',
  Size: 'Size',
  Cells: 'Cell count',
  Certification: 'Certification',
  CertAllUp: 'Certified weight range (kg)',
  FlatAR: 'Flat aspect ratio',
  FlatSpan: 'Flat span (m)',
  FlatSurf: 'Flat area (m²)',
  Gliderwt: 'Wing weight (kg)',
  ProjectedAR: 'Projected aspect ratio',
  ProjectedSA: 'Projected area (m²)',
  ProjectedSpan: 'Projected span (m)',
  HeightM: 'Height (m)',
  RecAllUP: 'Recommended weight range (kg)',
  RiserNum: 'Risers',
  CertEN: 'EN certification',
  CertLtf: 'LTF certification',
  CertLTF: 'LTF certification',
  CertDGAC: 'DGAC certification',
  certAUWmn: 'Certified minimum load (kg)',
  certAUWmx: 'Certified maximum load (kg)',
  RecAUWmn: 'Recommended minimum load (kg)',
  RecAUWmx: 'Recommended maximum load (kg)',
  Status: 'Model status',
  Modelstatus: 'Model status',
  Sell: 'Sold by Flybubble',
  RRP: 'RRP (GBP)',
  Wtype: 'Wing type',
  SoloTandem: 'Solo / tandem',
  WBuild: 'Construction',
  ShopURL: 'Flybubble product URL',
  Type: 'Reserve type',
  Steerable: 'Steerable',
  Loadmin: 'Minimum load (kg)',
  Loadmax: 'Maximum load (kg)',
  Loadrange: 'Load range (kg)',
  Area: 'Flat area (m²)',
  Opentime: 'Opening time (s)',
  Sinkrate: 'Sink rate (m/s)',
  Weightmanu: 'Reserve weight (g)',
  Volmin: 'Minimum volume (L)',
  Volmax: 'Maximum volume (L)',
  Volrange: 'Volume range (L)',
  Ourprice: 'Recorded price (GBP)',
  FBPrice: 'Flybubble price (GBP)',
  modelyear: 'Model year',
  Colours: 'Colourways (semicolon-separated)',
};
const aliases = {
  Make: ['manufacturer'],
  Model: ['model name', 'product name'],
  Size: ['variant size', 'wing size', 'reserve size'],
  Gliderwt: ['glider weight', 'weight kg', 'weight', 'weight (kg)'],
  Weightmanu: ['weight g', 'weight (g)', 'manufacturer weight g'],
  Cells: ['number of cells'],
  FlatSurf: [
    'surface flat',
    'flat surface',
    'flat surface m2',
    'area flat',
    'area m2',
  ],
  Area: ['surface area', 'surface area m2', 'area m2'],
  CertEN: ['EN rating', 'EN class'],
  CertLtf: ['LTF rating'],
  RRP: ['rrp £', 'retail price gbp'],
  Wtype: ['type'],
  Status: ['status'],
  Modelstatus: ['status'],
  Colours: ['colour', 'colours', 'colourways', 'color', 'colors', 'colorways'],
  ShopURL: ['shop url', 'product url'],
  modelyear: ['year', 'release year'],
  certAUWmn: ['min takeoff weight kg'],
  certAUWmx: ['max takeoff weight kg'],
};
const normal = (value) =>
  String(value)
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
export function matchHeader(category, header) {
  return (
    fields(category).find((key) =>
      [key, labels[key], ...(aliases[key] || [])].some(
        (a) => normal(a) === normal(header),
      ),
    ) || ''
  );
}
const numbers = new Set(
  'Cells FlatAR FlatSpan FlatSurf Gliderwt ProjectedAR ProjectedSA ProjectedSpan HeightM certAUWmn certAUWmx RecAUWmn RecAUWmx RRP Loadmin Loadmax Area Opentime Sinkrate Weightmanu Volmin Volmax Ourprice FBPrice modelyear'.split(
    ' ',
  ),
);
const integers = new Set([
  'Cells',
  'certAUWmn',
  'certAUWmx',
  'RecAUWmn',
  'RecAUWmx',
  'modelyear',
]);
const wingLimits = {
  Make: 50,
  Model: 50,
  Size: 30,
  CertEN: 30,
  CertLtf: 30,
  CertDGAC: 30,
  RiserNum: 50,
  RecAllUP: 40,
  Status: 50,
  Sell: 20,
  SoloTandem: 20,
  Wtype: 50,
  WBuild: 50,
};
export function safeUrl(value) {
  try {
    const u = new URL(value);
    return ['https:', 'http:'].includes(u.protocol) &&
      !u.username &&
      !u.password
      ? u
      : null;
  } catch {
    return null;
  }
}
export function fieldError(category, key, value) {
  if (!value) return identity.includes(key) ? 'Required' : '';
  if (
    typeof value !== 'string' ||
    value.length >
      (key === 'Colours'
        ? 2000
        : (category === 'Wings' && wingLimits[key]) || 255)
  )
    return 'Value is too long';
  if (numbers.has(key)) {
    if (
      !/^\d+(?:\.\d+)?$/.test(value) ||
      !Number.isFinite(+value) ||
      +value <= 0
    )
      return 'Enter a positive number in the units shown';
    if (integers.has(key) && (!Number.isInteger(+value) || +value > 2147483647))
      return 'Enter a whole number';
    if (key === 'modelyear' && !/^\d{4}$/.test(value))
      return 'Enter a four-digit year';
  }
  if (key === 'ShopURL') {
    const url = safeUrl(value);
    if (
      url?.protocol !== 'https:' ||
      !['flybubble.com', 'www.flybubble.com'].includes(url.hostname)
    )
      return 'Enter an HTTPS Flybubble URL';
  }
  if (key === 'Colours' && value.split(';').some((c) => c.trim().length > 255))
    return 'Each colourway must fit in 255 characters';
  if (['Sell', 'Steerable'].includes(key) && !/^(y|yes|n|no)$/i.test(value))
    return 'Use Yes or No';
  if (
    ['Status', 'Modelstatus'].includes(key) &&
    !/^(current|past)$/i.test(value)
  )
    return 'Use Current or Past';
  return '';
}
export function rowErrors(category, values) {
  const errors = {};
  for (const key of fields(category)) {
    const error = fieldError(category, key, values[key]?.trim());
    if (error) errors[key] = error;
  }
  for (const [min, max] of [
    ['certAUWmn', 'certAUWmx'],
    ['RecAUWmn', 'RecAUWmx'],
    ['Loadmin', 'Loadmax'],
    ['Volmin', 'Volmax'],
  ]) {
    if (values[min] && values[max] && +values[min] > +values[max])
      errors[max] = 'Must be at least the minimum';
  }
  return errors;
}
export function researchable(category, values) {
  // Commercial decisions and internal pricing are supplied by staff.
  const modelOnly = [
    'Wtype',
    'WBuild',
    'SoloTandem',
    'Type',
    'Steerable',
    'ShopURL',
    'modelyear',
    'Colours',
  ];
  return fields(category).filter(
    (k) =>
      !identity.includes(k) &&
      !['Sell', 'Ourprice', 'FBPrice', 'Status', 'Modelstatus'].includes(k) &&
      (values.Size?.trim() || modelOnly.includes(k)) &&
      !values[k]?.trim(),
  );
}
