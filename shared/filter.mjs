// Every active specification filter must match the SAME size variant.
export function matchingVariants(product, filters = {}) {
  return product.variants.filter(v =>
    (!filters.currentOnly || v.status === 'Current') &&
    (!filters.cert || filters.cert === 'All' || v.certClass === filters.cert) &&
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
    `${p.brand} ${p.model}`.toLowerCase().includes(query)
  ).map(p=>({...p, variants:matchingVariants(p,filters)})).filter(p=>p.variants.length);
  if(filters.sort==='price' || filters.sort==='weight') result.sort((a,b)=>(minimum(a,filters.sort)??Infinity)-(minimum(b,filters.sort)??Infinity));
  if(filters.sort==='name') result.sort((a,b)=>`${a.brand} ${a.model}`.localeCompare(`${b.brand} ${b.model}`));
  return result;
}
