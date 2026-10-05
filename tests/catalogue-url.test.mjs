import test from 'node:test';
import assert from 'node:assert/strict';
import rows from '../data/catalogue-rows.json' with { type: 'json' };
import { buildCatalogue, compactProductId } from '../shared/catalogue.mjs';
import {
  defaultUrlFilters,
  readUrlFilters,
  readUrlSelection,
  readCatalogueSelection,
  writeCatalogueUrl,
  hasCatalogueUrlState,
} from '../shared/catalogue-url.mjs';
import { validateShareTarget } from '../server/share-links.mjs';

const products = buildCatalogue(rows);

test('every filter survives sharing, including decimal ranges and reserve limits', () => {
  const state = {
    ...defaultUrlFilters(),
    query: 'A & B + air',
    selectedBrands: ['Advance', 'Ozone'],
    filterSizes: ['M', 'S'],
    colours: ['Blue / White', 'Red'],
    constructions: ['Lightweight', 'Standard'],
    weightRange: [2.5, 4.1],
    areaRange: [20.1, 28.5],
    aspectRatioRange: [4.5, 6.01],
    cellsRange: [40, 70],
    certScheme: 'LTF',
    cert: 'B',
    wingMaxWeight: '4.5',
    maxPrice: '3000',
    allUpWeight: '85',
    modelStatus: 'Current',
    forSaleOnly: true,
    sort: 'weight',
    reserveFilters: {
      areaRange: [20, 40],
      types: ['Cruciform', 'Round'],
      steerable: 'Yes',
      allUpWeight: '90',
      loadPercent: 95,
      maxWeightGrams: '1500',
      volumeMin: '3',
      volumeMax: '5.5',
      minArea: '25',
      loadMin: '50',
      loadMax: '130',
      maxPrice: '900',
    },
  };
  assert.deepEqual(
    readUrlFilters(writeCatalogueUrl(new URLSearchParams(), state, [], false)),
    state,
  );
});

test('defaults are omitted and reset restores all defaults', () => {
  assert.equal(
    writeCatalogueUrl(
      new URLSearchParams(),
      defaultUrlFilters(),
      [],
      false,
    ).toString(),
    '',
  );
  assert.deepEqual(readUrlFilters(new URLSearchParams()), defaultUrlFilters());
  assert.equal(hasCatalogueUrlState(new URLSearchParams('view=search')), true);
});

test('compact product IDs are unique and stable across row order changes', () => {
  assert.equal(
    new Set(products.map((product) => product.shareId)).size,
    products.length,
  );
  for (const product of products)
    assert.equal(product.shareId, compactProductId(product.id));
  const reordered = buildCatalogue({
    ...rows,
    WingsData: [...rows.WingsData].reverse(),
  });
  for (const product of reordered)
    assert.equal(
      product.shareId,
      products.find((item) => item.id === product.id).shareId,
    );
});

test('compact selections restore exact sizes and column order', () => {
  const wings = products
    .filter((product) => product.category === 'Wings')
    .slice(0, 2);
  const selection = wings.map((product) => ({
    id: product.shareId,
    size: product.variants.at(-1).size,
  }));
  const params = writeCatalogueUrl(
    new URLSearchParams(),
    defaultUrlFilters(),
    selection,
    true,
  );
  assert.equal(params.has('selection'), false);
  assert.equal(params.get('view'), 'compare');
  assert.deepEqual(
    readCatalogueSelection(params, products),
    wings.map((product) => ({
      id: product.id,
      size: product.variants.at(-1).size,
    })),
  );
});

test('legacy links work and malformed, duplicate, mixed and excessive entries are safe', () => {
  const wings = products
    .filter((product) => product.category === 'Wings')
    .slice(0, 6);
  const reserve = products.find((product) => product.category === 'Reserves');
  assert.deepEqual(readUrlSelection('{broken', products), []);
  const entries = [
    null,
    { id: 'missing' },
    { id: wings[0].id, size: wings[0].variants[0].size },
    { id: wings[0].shareId },
    { id: reserve.id },
    ...wings.slice(1).map((product) => ({ id: product.id, size: 'missing' })),
  ];
  const restored = readUrlSelection(JSON.stringify(entries), products);
  assert.equal(restored.length, 4);
  assert.deepEqual(
    restored.map((item) => item.id),
    wings.slice(0, 4).map((product) => product.id),
  );
  assert.equal(restored[0].size, wings[0].variants[0].size);
  assert.ok(
    wings[1].variants.some((variant) => variant.size === restored[1].size),
  );
});

test('malformed ranges and unsupported enumerations fall back to safe defaults', () => {
  for (const range of ['1', ',2', '3,2', '0,Infinity', 'a,2', '-1,2']) {
    assert.equal(
      readUrlFilters(new URLSearchParams({ weight: range })).weightRange,
      null,
    );
  }
  const state = readUrlFilters(
    new URLSearchParams(
      'sort=evil&modelStatus=bad&certScheme=bad&reserve.loadPercent=20',
    ),
  );
  assert.equal(state.sort, 'name');
  assert.equal(state.reserveFilters.loadPercent, 100);
});

test('saved links reject external URLs and non-catalogue paths', () => {
  for (const target of [
    'https://evil.example/wings',
    '//evil.example/wings',
    '/\\evil.example/wings',
    '/api/catalogue',
    '/wings#bad',
    '/reserves/../api/share',
    null,
  ]) {
    assert.throws(() => validateShareTarget(target));
  }
  assert.equal(
    validateShareTarget('/wings?sort=weight&brand=Ozone'),
    '/wings?brand=Ozone&sort=weight',
  );
  assert.throws(() => validateShareTarget(`/wings?query=${'x'.repeat(8192)}`));
});
