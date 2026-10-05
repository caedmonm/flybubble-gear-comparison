/** Expand already-filtered products so each card contains one matching size.
 * @param {import('./types').Product[]} products
 * @param {boolean} showEachSize
 * @param {string} sort
 * @returns {import('./types').Product[]}
 */
export function catalogueItems(products, showEachSize, sort) {
  if (!showEachSize) return products;
  const items = products.flatMap((product) =>
    product.variants.map((variant) => ({ ...product, variants: [variant] })),
  );
  if (sort === 'price' || sort === 'weight') {
    items.sort(
      (a, b) =>
        (a.variants[0][sort] ?? Infinity) - (b.variants[0][sort] ?? Infinity),
    );
  }
  return items;
}
