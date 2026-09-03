export const clean = (value) => value == null ? null : String(value).trim() || null;
export const number = (value) => Number.isFinite(Number(value)) && Number(value) > 0 ? Number(Number(value).toFixed(3)) : null;
export function safeShopUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && ['flybubble.com', 'www.flybubble.com'].includes(url.hostname) ? url.href : null;
  } catch { return null; }
}
const key = (brand, model) => `${brand}:${model}`.toLowerCase();
const id = (value) => encodeURIComponent(value.toLowerCase());
export function buildCatalogue(tables, images = {}) {
  const metadata = new Map((tables.DSGeneric || []).map(r => [key(r.Brand,r.Model),r]));
  const groups = new Map();
  for (const [table,category] of [['WingsData','Wings'],['ReservesData','Reserves']]) {
    for (const row of tables[table] || []) {
      if (!clean(row.Make) || !clean(row.Model)) continue;
      const groupKey = `${category}:${key(row.Make,row.Model)}`;
      const meta = metadata.get(key(row.Make,row.Model));
      const reserve = category === 'Reserves';
      if (!groups.has(groupKey)) groups.set(groupKey, {
        id:id(groupKey), brand:clean(row.Make), model:clean(row.Model), category,
        year:number(meta?.modelyear), url:safeShopUrl(row.ShopURL || meta?.shopurl),
        image:images[key(row.Make,row.Model)] || null, variants:[],
      });
      const product = groups.get(groupKey);
      const certification = clean(reserve ? row.CertEN : row.CertEN || row.Certification);
      // Mixed EN ratings such as A / B must not be simplified to a single class.
      const certClass = !reserve && certification?.match(/^(?:(?:LTF\/EN|EN\/LTF|EN)[\s/-]*)?([ABCD])(?:[*+])?(?:\s*\/\s*LTF\s*[ABCD])?$/i)?.[1]?.toUpperCase() || null;
      product.variants.push({
        id:id(`${groupKey}:${row.Size || 'one-size'}`),size:clean(row.Size) || 'One size',
        status:clean(reserve ? row.Modelstatus : row.Status)?.toLowerCase() === 'current' ? 'Current' : 'Past model',
        certification,certClass,ltf:clean(reserve ? row.CertLTF : row.CertLtf),
        price:number(reserve ? row.Ourprice : row.RRP),
        weight:reserve ? number(number(row.Weightmanu) ? Number(row.Weightmanu)/1000 : null) : number(row.Gliderwt),
        minLoad:number(reserve ? row.Loadmin : row.certAUWmn),maxLoad:number(reserve ? row.Loadmax : row.certAUWmx),
        loadRange:clean(reserve ? row.Loadrange : row.CertAllUp),
        recommendedMin:number(row.RecAUWmn),recommendedMax:number(row.RecAUWmx),
        area:number(reserve ? row.Area : row.FlatSurf),aspectRatio:number(row.FlatAR),span:number(row.FlatSpan),height:number(row.HeightM),
        projectedArea:number(row.ProjectedSA),projectedAspectRatio:number(row.ProjectedAR),projectedSpan:number(row.ProjectedSpan),cells:number(row.Cells),
        construction:clean(row.WBuild),type:clean(reserve ? row.Type : row.Wtype),
        risers:clean(row.RiserNum),sinkRate:number(row.Sinkrate),openingTime:number(row.Opentime),
        volumeMin:number(row.Volmin),volumeMax:number(row.Volmax),steerable:clean(row.Steerable),
      });
    }
  }
  return [...groups.values()].sort((a,b) => Number(!!b.image)-Number(!!a.image) || (b.year || 0)-(a.year || 0) || a.brand.localeCompare(b.brand) || a.model.localeCompare(b.model));
}
