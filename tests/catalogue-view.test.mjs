import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCatalogue } from '../shared/catalogue.mjs';
import { filterCatalogue } from '../shared/filter.mjs';
import { catalogueItems } from '../shared/catalogue-view.mjs';

for (const category of ['Wings', 'Reserves']) {
  const wings = category === 'Wings';
  const products = buildCatalogue({
    [wings ? 'WingsData' : 'ReservesData']: [
      {
        Make: 'Test',
        Model: 'Gear',
        Size: 'S',
        [wings ? 'Gliderwt' : 'Weightmanu']: wings ? 3 : 1200,
        [wings ? 'RRP' : 'FBPrice']: 800,
      },
      {
        Make: 'Test',
        Model: 'Gear',
        Size: 'M',
        [wings ? 'Gliderwt' : 'Weightmanu']: wings ? 4 : 1500,
        [wings ? 'RRP' : 'FBPrice']: 600,
      },
      { Make: 'Test', Model: 'Unknown', Size: 'L' },
    ],
  });
  test(`${category}: size cards retain exact specifications and only matching variants`, () => {
    assert.equal(catalogueItems(products, false, 'name'), products);
    const items = catalogueItems(products, true, 'name');
    assert.equal(items.length, 3);
    assert.ok(items.every((item) => item.variants.length === 1));
    const gear = items.filter((item) => item.model === 'Gear');
    assert.deepEqual(
      gear.map((item) => item.variants[0].size),
      ['S', 'M'],
    );
    assert.deepEqual(
      gear.map((item) => item.variants[0].price),
      [800, 600],
    );
    assert.equal(gear[0].id, gear[1].id);
    assert.notEqual(gear[0].variants[0].id, gear[1].variants[0].id);
    const filtered = filterCatalogue(products, {
      weightRange: wings ? [4, 4] : [1.5, 1.5],
    });
    assert.deepEqual(
      catalogueItems(filtered, true, 'name').map(
        (item) => item.variants[0].size,
      ),
      ['M'],
    );
    assert.equal(
      products.find((item) => item.model === 'Gear').variants.length,
      2,
    );
  });
  test(`${category}: price and weight sort individual sizes with unknown values last`, () => {
    assert.deepEqual(
      catalogueItems(products, true, 'price').map(
        (item) => item.variants[0].size,
      ),
      ['M', 'S', 'L'],
    );
    assert.deepEqual(
      catalogueItems(products, true, 'weight').map(
        (item) => item.variants[0].size,
      ),
      ['S', 'M', 'L'],
    );
  });
}
