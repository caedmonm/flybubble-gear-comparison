export const wingCategoryOrder = [
  'First Paragliders', 'Progression Paragliders', 'XC Paragliders',
  'Sports Paragliders', 'Advanced Paragliders', 'Competition Paragliders',
  'Lightweight Paragliders', 'Single Surface Paragliders', 'Acro Paragliders',
  'Tandem Paragliders', 'Mini Wings & Parakites', 'Speed Wings',
  'Paramotoring Wings', 'Ground Handling Wings',
];

const aliases = new Map([
  ['Advancd Paragliders', 'Advanced Paragliders'],
  ['Tandem', 'Tandem Paragliders'],
  ['Mini Wings', 'Mini Wings & Parakites'],
  ['Paramotor Wings', 'Paramotoring Wings'],
  ['Ground Handling Wing', 'Ground Handling Wings'],
]);

export const wingCategory = value => aliases.get(value) || value;
