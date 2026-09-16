// Every active specification filter must match the SAME size variant.
const matchesAny = (values, value) => !values?.length || values.includes(value);
const inRange = (value, range) => !range || (typeof value === 'number' && Number.isFinite(value) && value >= range[0] && value <= range[1]);
function specificationValue(product, variant, field) {
  // Known source decimal errors must not stretch the surface slider to 3,074 m².
  // Keep the original value for display; corrected source records work automatically.
  if (field === 'area' && product.brand === 'Skywalk' && ['ARAK AIR', 'MESCAL6'].includes(product.model) && variant.area > 100) return null;
  return variant[field];
}
function matchesCertification(variant, filters) {
  const rating = filters.cert;
  switch (filters.certScheme || 'EN') {
    case 'LTF': return !rating || rating === 'All' ? !!variant.ltf && !/^(?:none|[-–])$/i.test(variant.ltf) : variant.ltfClass === rating;
    case 'DGAC': return variant.dgac === true;
    case 'Other': return variant.otherCertifications?.includes(rating) || false;
    default: return !rating || rating === 'All' || variant.certClass === rating;
  }
}
export function matchingVariants(product, filters = {}) {
  return product.variants.filter(v =>
    (!filters.modelStatus || filters.modelStatus === 'All' || v.status === filters.modelStatus) &&
    (product.category !== 'Wings' || (
      (!filters.forSaleOnly || v.forSale === true) &&
      matchesCertification(v, filters) &&
      matchesAny(filters.sizes, v.size) &&
      inRange(specificationValue(product, v, 'area'), filters.areaRange) &&
      inRange(v.aspectRatio, filters.aspectRatioRange) &&
      inRange(v.cells, filters.cellsRange)
    )) &&
    (!filters.maxWeight || (v.weight != null && v.weight <= Number(filters.maxWeight))) &&
    (!filters.maxPrice || (v.price != null && v.price <= Number(filters.maxPrice))) &&
    (!filters.allUpWeight || (v.minLoad != null && v.maxLoad != null && v.minLoad <= Number(filters.allUpWeight) && v.maxLoad >= Number(filters.allUpWeight)))
  );
}
export function minimum(product, field) {
  const values=product.variants.map(v=>v[field]).filter(n=>typeof n==='number' && Number.isFinite(n));
  return values.length ? Math.min(...values) : null;
}
export function filterCatalogue(products, filters = {}) {
  const query=String(filters.query || '').trim().toLowerCase();
  const result=products.filter(p =>
    (!filters.category || p.category === filters.category) &&
    (!filters.brand || filters.brand === 'All brands' || p.brand === filters.brand) &&
    matchesAny(filters.brands, p.brand) &&
    (p.category !== 'Wings' || !filters.colours?.length || filters.colours.some(colour => p.colours?.includes(colour))) &&
    `${p.brand} ${p.model}`.toLowerCase().includes(query)
  ).map(p=>({...p, variants:matchingVariants(p,filters)})).filter(p=>p.variants.length);
  if(filters.sort==='price' || filters.sort==='weight') result.sort((a,b)=>(minimum(a,filters.sort)??Infinity)-(minimum(b,filters.sort)??Infinity));
  if(filters.sort==='name') result.sort((a,b)=>`${a.brand} ${a.model}`.localeCompare(`${b.brand} ${b.model}`));
  return result;
}

// Stable bounds use the complete wing catalogue, independent of active filters.
export function rangeBounds(products, field, step = 1) {
  const values = products.filter(p => p.category === 'Wings').flatMap(p => p.variants.map(v => specificationValue(p, v, field)))
    .filter(n => typeof n === 'number' && Number.isFinite(n));
  if (!values.length) return null;
  const min = Number((Math.floor(Math.min(...values) / step) * step).toFixed(3));
  const max = Number((Math.ceil(Math.max(...values) / step) * step).toFixed(3));
  return [min, Math.max(max, Number((min + step).toFixed(3)))];
}
