import test from 'node:test';
import assert from 'node:assert/strict';
import {
  findShopPhoto,
  downloadReviewedPhoto,
} from '../server/photo-lookup.mjs';
import { lookupPhoto } from '../server/product-photos.mjs';
const values = { Make: 'AirDesign', Model: 'Eazy 4' };
const product = {
  vendor: 'AirDesign',
  title: 'AirDesign Eazy 4',
  handle: 'airdesign-eazy-4',
  featured_image: '//cdn.shopify.com/s/files/1/photo.jpg?v=12',
};
const photo = {
  source: 'https://flybubble.com/products/airdesign-eazy-4',
  image: 'https://cdn.shopify.com/s/files/1/photo.jpg?v=12&width=700',
};
test('uses an exact model and vendor for both file links and store search', async () => {
  const near = { ...product, title: 'AirDesign Eazy 4 light' };
  const send = async (url) =>
    url.includes('/search/')
      ? Response.json({
          resources: {
            results: {
              products: [near, { ...product, vendor: 'Other' }, product],
            },
          },
        })
      : Response.json(near);
  assert.deepEqual(
    await findShopPhoto(
      { ...values, ShopURL: 'https://flybubble.com/products/wrong' },
      send,
    ),
    photo,
  );
  assert.equal(
    await findShopPhoto(values, async () =>
      Response.json({ resources: { results: { products: [near] } } }),
    ),
    null,
  );
  assert.deepEqual(
    await findShopPhoto({ ...values, ShopURL: photo.source }, async (url) => {
      assert.equal(url, photo.source + '.js');
      return Response.json(product);
    }),
    photo,
  );
});
test('a stale link falls back to search without confusing a plus variant', async () => {
  const send = async (url) =>
    url.includes('/search/')
      ? Response.json({
          resources: {
            results: {
              products: [
                { ...product, title: product.title + '+', handle: 'plus' },
                product,
              ],
            },
          },
        })
      : new Response('<html>Moved</html>');
  assert.deepEqual(
    await findShopPhoto(
      { ...values, ShopURL: 'https://flybubble.com/products/old' },
      send,
    ),
    photo,
  );
});
test('a reviewed choice downloads only the same product image from the storefront', async () => {
  const jpeg = Buffer.from([255, 216, 255, 217]);
  assert.deepEqual(
    await downloadReviewedPhoto(values, photo, async (url, options) => {
      assert.equal(options.redirect, 'error');
      return url === photo.source + '.js'
        ? Response.json(product)
        : new Response(jpeg);
    }),
    { bytes: jpeg, mime: 'image/jpeg' },
  );
  for (const item of [
    { ...photo, source: 'https://example.com/products/x' },
    { ...photo, image: 'http://localhost/test' },
  ]) {
    let sent = false;
    await assert.rejects(
      downloadReviewedPhoto(values, item, async () => {
        sent = true;
      }),
    );
    assert.ok(!sent);
  }
  await assert.rejects(
    downloadReviewedPhoto(values, photo, async () =>
      Response.json({
        ...product,
        featured_image: '//cdn.shopify.com/s/files/1/new.jpg',
      }),
    ),
    /reviewed photo/,
  );
  await assert.rejects(
    downloadReviewedPhoto(values, photo, async (url) =>
      url === photo.image ? new Response('<svg/>') : Response.json(product),
    ),
    /reviewed photo/,
  );
});
test('a bundled photo takes precedence without downloading a second copy', async () => {
  const result = await lookupPhoto({
    category: 'Wings',
    values: { Make: 'Nova', Model: 'CODEX' },
  });
  assert.equal(result.status, 'existing');
  assert.match(result.image, /^\/products\/.*\.jpg$/);
});
