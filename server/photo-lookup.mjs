import { ImportError } from './import-validation.mjs';

const shop = 'https://flybubble.com';
const maxImageBytes = 2 * 1024 * 1024;
function productPage(value) {
  try {
    const url = new URL(value, shop);
    if (
      !['https://flybubble.com', 'https://www.flybubble.com'].includes(
        url.origin,
      ) ||
      url.username ||
      url.password ||
      !/^\/products\/[a-z0-9][a-z0-9-]*\/?$/i.test(url.pathname)
    )
      return null;
    return shop + url.pathname.replace(/\/$/, '');
  } catch {
    return null;
  }
}
function imageAddress(value) {
  try {
    const url = new URL(value, shop);
    if (url.username || url.password) return null;
    const shopFile =
      url.origin === 'https://cdn.shopify.com' &&
      url.pathname.startsWith('/s/files/');
    const localFile =
      url.origin === shop && url.pathname.startsWith('/cdn/shop/');
    if (!shopFile && !localFile) return null;
    const version = url.searchParams.get('v');
    url.search = '';
    if (version) url.searchParams.set('v', version);
    url.searchParams.set('width', '700');
    url.hash = '';
    return url.href;
  } catch {
    return null;
  }
}
const normal = (s) =>
  String(s || '')
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9+]/g, '');
function candidate(product, brand, model) {
  const make = normal(brand),
    name = normal(model);
  const brands =
    make === 'brucegoldsmithdesign' || make === 'bgd'
      ? ['bgd', 'brucegoldsmithdesign']
      : [make];
  const title = normal(product?.title);
  if (
    !make ||
    !name ||
    !brands.includes(normal(product?.vendor)) ||
    !(title === name || brands.some((b) => title === b + name))
  )
    return null;
  const source = productPage(product.url || '/products/' + product.handle);
  const image = imageAddress(
    product.featured_image?.url || product.featured_image,
  );
  return source && image ? { source, image } : null;
}
async function readLimited(response, limit) {
  if (Number(response.headers.get('content-length')) > limit) {
    await response.body?.cancel();
    throw new Error('Response too large.');
  }
  const reader = response.body.getReader(),
    chunks = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) return Buffer.concat(chunks, size);
    size += value.byteLength;
    if (size > limit) {
      await reader.cancel();
      throw new Error('Response too large.');
    }
    chunks.push(value);
  }
}
async function publicGet(url, send, signal) {
  const timeout = AbortSignal.timeout(8000);
  return send(url, {
    redirect: 'error',
    signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
  });
}
async function json(url, send, signal) {
  const response = await publicGet(url, send, signal);
  if (response.status === 404) {
    await response.body?.cancel();
    return null;
  }
  if (!response.ok) {
    await response.body?.cancel();
    throw new Error('Shop lookup failed.');
  }
  return JSON.parse(
    (await readLimited(response, 1024 * 1024)).toString('utf8'),
  );
}
export async function findShopPhoto(values, send = fetch, signal) {
  const { Make, Model, ShopURL } = values;
  const page = productPage(ShopURL);
  if (page) {
    try {
      const match = candidate(
        await json(page + '.js', send, signal),
        Make,
        Model,
      );
      if (match) return match;
    } catch (error) {
      if (signal?.aborted) throw error;
      // A stale product link may redirect or return HTML; try the shop search.
    }
  }
  const search = new URL('/search/suggest.json', shop);
  search.searchParams.set('q', Make + ' ' + Model);
  search.searchParams.set('resources[type]', 'product');
  search.searchParams.set('resources[limit]', '8');
  const results = await json(search.href, send, signal);
  for (const product of results?.resources?.results?.products || []) {
    const match = candidate(product, Make, Model);
    if (match) return match;
  }
  return null;
}
export function validPhotoChoice(choice) {
  return (
    typeof choice?.source === 'string' &&
    choice.source.length <= 2048 &&
    typeof choice.image === 'string' &&
    choice.image.length <= 2048 &&
    productPage(choice.source) === choice.source &&
    imageAddress(choice.image) === choice.image
  );
}
export async function downloadReviewedPhoto(values, choice, send = fetch) {
  const label = values.Make + ' ' + values.Model;
  try {
    if (!validPhotoChoice(choice)) throw new Error();
    const product = await json(choice.source + '.js', send);
    const current = candidate(product, values.Make, values.Model);
    if (current?.source !== choice.source || current.image !== choice.image)
      throw new Error();
    const res = await publicGet(current.image, send);
    if (!res.ok) {
      await res.body?.cancel();
      throw new Error();
    }
    const bytes = await readLimited(res, maxImageBytes);
    // Only store and serve raster content. MIME comes from the bytes, not the URL.
    let mime;
    if (bytes.subarray(0, 3).equals(Buffer.from([255, 216, 255])))
      mime = 'image/jpeg';
    else if (
      bytes
        .subarray(0, 8)
        .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    )
      mime = 'image/png';
    else if (
      bytes.toString('ascii', 0, 4) === 'RIFF' &&
      bytes.toString('ascii', 8, 12) === 'WEBP'
    )
      mime = 'image/webp';
    if (!mime) throw new Error();
    return { bytes, mime };
  } catch {
    throw new ImportError(
      'Could not save the reviewed photo for ' +
        label +
        '. Retry the lookup or uncheck its photo and add the rows.',
      409,
    );
  }
}
