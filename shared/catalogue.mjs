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
function packedVolume(row) {
  const range = clean(row.Volrange)?.match(/^(\d+(?:\.\d+)?)(?:\s*[-–]\s*(\d+(?:\.\d+)?))?$/);
  const values = [number(row.Volmin) ?? number(range?.[1]), number(row.Volmax) ?? number(range?.[2] || range?.[1])];
  // This source record uses cm³. Manufacturer lists 4,700 ccm for the ST 125:
  // https://finsterwalder-charly.de/en/4-produkte/rettungsgeraete/673-charly-diamondcross-the-steerable-cruciform-canopy-video.html
  if (row.Make === 'Charly' && row.Model === 'DIAMONDcross ST light' && String(row.Size) === '125') return values.map(value => value === 4700 ? 4.7 : value);
  return values;
}
export function buildCatalogue(tables, images = {}) {
  const metadata = new Map((tables.DSGeneric || []).map(r => [key(r.Brand,r.Model),r]));
  const colours = new Map();
  for (const row of tables.DSColours || []) {
    const colour = clean(row.Colour);
    if (!colour) continue;
    const modelKey = key(row.Brand, row.Model);
    if (!colours.has(modelKey)) colours.set(modelKey, new Set());
    colours.get(modelKey).add(colour);
  }
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
        image:images[key(row.Make,row.Model)] || null,
        colours:reserve ? [] : [...(colours.get(key(row.Make,row.Model)) || [])].sort((a,b)=>a.localeCompare(b)), variants:[],
      });
      const product = groups.get(groupKey);
      const [volumeMin, volumeMax] = reserve ? packedVolume(row) : [null, null];
      const certification = clean(reserve ? row.CertEN : row.CertEN || row.Certification);
      // Mixed EN ratings such as A / B must not be simplified to a single class.
      const certClass = !reserve && certification?.match(/^(?:(?:LTF\/EN|EN\/LTF|EN)[\s/-]*)?([ABCD])(?:[*+])?(?:\s*\/\s*LTF\s*[ABCD])?$/i)?.[1]?.toUpperCase() || null;
      const ltf = clean(reserve ? row.CertLTF : row.CertLtf);
      const ltfClass = !reserve && ltf?.match(/^(?:LTF[\s/-]*)?([ABCD])[*+]?$/i)?.[1]?.toUpperCase() || null;
      const certificationText = [row.Certification, row.CertEN, row.CertLtf].filter(Boolean).join(' ');
      const dgac = !reserve && (/^(?:yes|ok|true|1)$/i.test(clean(row.CertDGAC) || '') || /\bDGAC\b/i.test(row.CertDGAC || '') || /\bDGAC\b/i.test(certificationText));
      const otherCertifications = [];
      if (!reserve) {
        if (/\bCCC\b/i.test(certificationText)) otherCertifications.push('CCC');
        if (/\bload\s*test\b/i.test(certificationText) || (!certClass && !ltfClass && /(?:\bEN\s*)?\b926\s*-\s*1\b/i.test(certificationText))) otherCertifications.push('Load Test Only');
        // Missing/dash/pending certification is unknown, not explicitly uncertified.
        if (!certClass && !ltfClass && !dgac && !otherCertifications.length && /^(?:none|uncertified|not certified)$/i.test(clean(row.Certification) || certification || '')) otherCertifications.push('Uncertified');
      }
      product.variants.push({
        id:id(`${groupKey}:${row.Size || 'one-size'}`),size:clean(row.Size) || 'One size',
        status:clean(reserve ? row.Modelstatus : row.Status)?.toLowerCase() === 'current' ? 'Current' : 'Past model',
        forSale:/^(?:y|yes)$/i.test(clean(row.Sell) || ''),
        certification,certClass,ltf,ltfClass,dgac,otherCertifications,
        price:reserve ? number(row.FBPrice) ?? number(row.Ourprice) : number(row.RRP),
        weight:reserve ? number(number(row.Weightmanu) ? Number(row.Weightmanu)/1000 : null) : number(row.Gliderwt),
        minLoad:number(reserve ? row.Loadmin : row.certAUWmn),maxLoad:number(reserve ? row.Loadmax : row.certAUWmx),
        loadRange:clean(reserve ? row.Loadrange : row.CertAllUp),
        recommendedMin:number(row.RecAUWmn),recommendedMax:number(row.RecAUWmx),
        area:number(reserve ? row.Area : row.FlatSurf),aspectRatio:number(row.FlatAR),span:number(row.FlatSpan),height:number(row.HeightM),
        projectedArea:number(row.ProjectedSA),projectedAspectRatio:number(row.ProjectedAR),projectedSpan:number(row.ProjectedSpan),cells:number(row.Cells),
        construction:clean(row.WBuild),type:clean(reserve ? row.Type : row.Wtype),
        risers:clean(row.RiserNum),sinkRate:number(row.Sinkrate),openingTime:number(row.Opentime),
        volumeMin,volumeMax,steerable:clean(row.Steerable),
      });
    }
  }
  return [...groups.values()].sort((a,b) => Number(!!b.image)-Number(!!a.image) || (b.year || 0)-(a.year || 0) || a.brand.localeCompare(b.brand) || a.model.localeCompare(b.model));
}
