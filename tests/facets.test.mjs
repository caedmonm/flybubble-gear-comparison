import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCatalogue } from '../shared/catalogue.mjs';
import { catalogueFacets } from '../shared/facets.mjs';
import { filterCatalogue } from '../shared/filter.mjs';
import { canCheckShopPrice } from '../shared/shop-links.mjs';
import {
  defaultUrlFilters,
  readUrlFilters,
  writeCatalogueUrl,
} from '../shared/catalogue-url.mjs';

const products = buildCatalogue({
  WingsData: [
    {
      Make: 'Alpha',
      Model: 'Mixed',
      Size: 'S',
      CertEN: 'A',
      FlatAR: 4,
      FlatSurf: 20,
      Cells: 30,
      RRP: 2000,
      Status: 'Current',
      Sell: 'Y',
    },
    {
      Make: 'Alpha',
      Model: 'Mixed',
      Size: 'L',
      CertEN: 'B',
      FlatAR: 6,
      FlatSurf: 30,
      Cells: 60,
      RRP: 4000,
      Status: 'Past',
    },
    {
      Make: 'Beta',
      Model: 'Wing',
      Size: 'M',
      CertEN: 'B',
      FlatAR: 5,
      FlatSurf: 25,
      Cells: 50,
      RRP: 3000,
      Status: 'Current',
    },
  ],
  DSColours: [
    { Brand: 'Alpha', Model: 'Mixed', Colour: 'Red' },
    { Brand: 'Beta', Model: 'Wing', Colour: 'Blue' },
  ],
});

test('EN A dynamically narrows sizes, brands, colours, ranges and price to matching sizes', () => {
  const facets = catalogueFacets(products, { category: 'Wings', cert: 'A' });
  assert.deepEqual(facets.brands, ['Alpha']);
  assert.deepEqual(facets.sizes, ['S']);
  assert.deepEqual(facets.colours, ['Red']);
  assert.deepEqual(facets.aspectRatio, [4, 4.01]);
  assert.deepEqual(facets.cells, [30, 31]);
  assert.deepEqual(facets.price, [2000, 2000]);
  assert.deepEqual(facets.certifications.EN, ['A', 'B']);
});

test('each facet ignores itself while respecting the other filters and same-size matching', () => {
  const facets = catalogueFacets(products, {
    category: 'Wings',
    brands: ['Alpha'],
    cert: 'B',
    cellsRange: [55, 65],
  });
  assert.deepEqual(facets.brands, ['Alpha']);
  assert.deepEqual(facets.cells, [60, 61]);
  assert.deepEqual(facets.sizes, ['L']);
  assert.deepEqual(facets.price, [4000, 4000]);
  const broaden = catalogueFacets(products, {
    category: 'Wings',
    brands: ['Alpha'],
    cert: 'B',
  });
  assert.deepEqual(broaden.brands, ['Alpha', 'Beta']);
  assert.deepEqual(broaden.certifications.EN, ['A', 'B']);
  const empty = catalogueFacets(products, {
    category: 'Wings',
    cert: 'A',
    sizes: ['L'],
  });
  assert.equal(empty.price, null);
  assert.deepEqual(empty.sizes, ['S']);
});

test('reserve area range, type and numeric facets narrow independently', () => {
  const reserves = buildCatalogue({
    ReservesData: [
      {
        Make: 'Alpha',
        Model: 'One',
        Size: '100',
        Type: 'Square',
        Area: 25,
        FBPrice: 500,
        Steerable: 'No',
        Weightmanu: 1000,
      },
      {
        Make: 'Beta',
        Model: 'Two',
        Size: '120',
        Type: 'Rogallo',
        Area: 35,
        FBPrice: 800,
        Steerable: 'Yes',
        Weightmanu: 1500,
      },
    ],
  });
  const filters = {
    category: 'Reserves',
    reserve: { types: ['Square'], areaRange: [20, 30] },
  };
  assert.equal(filterCatalogue(reserves, filters).length, 1);
  const facets = catalogueFacets(reserves, filters);
  assert.deepEqual(facets.brands, ['Alpha']);
  assert.deepEqual(facets.price, [500, 500]);
  assert.deepEqual(facets.weight, [1000, 1000]);
  assert.deepEqual(facets.steerable, ['No']);
  assert.deepEqual(facets.area, [25, 25.1]);
  assert.equal(
    filterCatalogue(reserves, { reserve: { areaRange: [26, 34] } }).length,
    0,
  );
});

test('PHI unreleased reserves are excluded without removing other PHI equipment', () => {
  const catalogue = buildCatalogue({
    ReservesData: [
      { Make: 'PHI', Model: 'POP', Size: '100' },
      { Make: 'PHI', Model: 'POP light', Size: '100' },
      { Make: 'PHI', Model: 'Other', Size: '100' },
    ],
    WingsData: [{ Make: 'PHI', Model: 'POP', Size: 'S' }],
  });
  assert.deepEqual(
    catalogue
      .map((p) => [p.category, p.model])
      .sort((a, b) => String(a).localeCompare(String(b))),
    [
      ['Reserves', 'Other'],
      ['Wings', 'POP'],
    ],
  );
});

test('shop price links follow the selected variant status, including mixed models', () => {
  const product = { url: 'https://flybubble.com/products/test' };
  assert.equal(canCheckShopPrice(product, { status: 'Current' }), true);
  for (const status of ['Past', 'Past model', '', undefined])
    assert.equal(canCheckShopPrice(product, { status }), false);
  assert.equal(canCheckShopPrice({ url: null }, { status: 'Current' }), false);
});

test('new searches sort by name, explicit older sorts still survive sharing', () => {
  assert.equal(readUrlFilters(new URLSearchParams()).sort, 'name');
  const state = { ...defaultUrlFilters(), sort: 'featured' };
  assert.equal(
    readUrlFilters(writeCatalogueUrl(new URLSearchParams(), state, [], false))
      .sort,
    'featured',
  );
  assert.deepEqual(
    filterCatalogue(products, { sort: 'name' }).map((p) => p.brand),
    ['Alpha', 'Beta'],
  );
});

test('malformed reserve surface ranges fall back to unrestricted', () => {
  for (const range of ['30,20', ',20', 'nan,20', '-1,20', '20']) {
    assert.equal(
      readUrlFilters(new URLSearchParams({ 'reserve.area': range }))
        .reserveFilters.areaRange,
      null,
    );
  }
});

test('construction and weight facets can broaden their selection and respect other specifications', () => {
  const catalogue = buildCatalogue({
    WingsData: [
      {
        Make: 'Test',
        Model: 'Wing',
        Size: 'S',
        WBuild: 'Lightweight',
        Gliderwt: 2.15,
        CertEN: 'A',
      },
      {
        Make: 'Test',
        Model: 'Wing',
        Size: 'M',
        WBuild: 'Standard',
        Gliderwt: 3.5,
        CertEN: 'A',
      },
      {
        Make: 'Test',
        Model: 'Wing',
        Size: 'L',
        WBuild: 'Heavy-duty',
        Gliderwt: 5,
        CertEN: 'B',
      },
    ],
  });
  const facets = catalogueFacets(catalogue, {
    category: 'Wings',
    cert: 'A',
    constructions: ['Standard'],
    weightRange: [3, 4],
  });
  assert.deepEqual(facets.constructions, ['Standard']);
  assert.deepEqual(facets.gearWeight, [3.5, 3.6]);
  const broader = catalogueFacets(catalogue, {
    category: 'Wings',
    cert: 'A',
    constructions: ['Standard'],
  });
  assert.deepEqual(broader.constructions, ['Lightweight', 'Standard']);
  assert.deepEqual(broader.gearWeight, [3.5, 3.6]);
  const reserves = buildCatalogue({
    ReservesData: [
      { Make: 'Test', Model: 'Reserve', Size: 'S', Weightmanu: 1258 },
    ],
  });
  assert.deepEqual(
    catalogueFacets(reserves, { category: 'Reserves' }).gearWeight,
    [1.258, 1.259],
  );
  assert.deepEqual(
    catalogueFacets(reserves, { category: 'Reserves' }).constructions,
    [],
  );
});
