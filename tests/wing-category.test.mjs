import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCatalogue } from '../shared/catalogue.mjs';
import { filterCatalogue } from '../shared/filter.mjs';
import { catalogueFacets } from '../shared/facets.mjs';

const products = buildCatalogue({ WingsData: [
  {Make: 'Test', Model: 'Mixed', Size: 'S', Wtype: 'Advancd Paragliders', CertEN: 'A'},
  {Make: 'Test', Model: 'Mixed', Size: 'M', Wtype: 'XC Paragliders', CertEN: 'B'},
  {Make: 'Test', Model: 'Advanced', Size: 'S', Wtype: 'Advanced Paragliders', CertEN: 'B'},
  {Make: 'Test', Model: 'Mini', Size: 'S', Wtype: 'Mini Wings', CertEN: 'B'},
  {Make: 'Test', Model: 'Tandem', Size: 'S', Wtype: 'Tandem'},
  {Make: 'Test', Model: 'Motor', Size: 'S', Wtype: 'Paramotor Wings'},
  {Make: 'Test', Model: 'Ground', Size: 'S', Wtype: 'Ground Handling Wing'},
] });

test('wing category multi-select includes aliases and matches the same size as other filters', () => {
  const filters = {category: 'Wings', wingCategories: ['Advanced Paragliders', 'Mini Wings & Parakites'], cert: ['B']};
  assert.deepEqual(filterCatalogue(products, filters).map(p => p.model), ['Advanced', 'Mini']);
  assert.equal(filterCatalogue(products, {category: 'Wings', wingCategories: []}).length, 6);
  for (const category of ['Tandem Paragliders', 'Paramotoring Wings', 'Ground Handling Wings'])
    assert.equal(filterCatalogue(products, {wingCategories: [category]}).length, 1);
});

test('wing category facets normalize duplicates and ignore only their own selection', () => {
  const facets = catalogueFacets(products, {category: 'Wings', wingCategories: ['Mini Wings & Parakites'], cert: ['B']});
  assert.deepEqual(facets.wingCategories, ['XC Paragliders', 'Advanced Paragliders', 'Mini Wings & Parakites']);
  assert.deepEqual(facets.brands, ['Test']);
});
