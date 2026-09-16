export type Variant = {
  id: string; size: string; status: string; forSale: boolean; certification: string | null; certClass: string | null;
  ltf: string | null; ltfClass: string | null; dgac: boolean; otherCertifications: string[];
  price: number | null; weight: number | null; minLoad: number | null; maxLoad: number | null;
  loadRange: string | null; recommendedMin: number | null; recommendedMax: number | null; area: number | null; height: number | null;
  aspectRatio: number | null; span: number | null; projectedArea: number | null; projectedAspectRatio: number | null; projectedSpan: number | null;
  cells: number | null; construction: string | null; type: string | null; risers: string | null;
  sinkRate: number | null; openingTime: number | null; volumeMin: number | null; volumeMax: number | null; steerable: string | null;
};
export type Product = {id: string; brand: string; model: string; category: string; year: number | null; url: string | null; image: string | null; colours: string[]; variants: Variant[]};

export type ReserveFilters = {
  types: string[];
  steerable: string;
  allUpWeight: string;
  loadPercent: number;
  maxWeightGrams: string;
  volumeMin: string;
  volumeMax: string;
  minArea: string;
  loadMin: string;
  loadMax: string;
  maxPrice: string;
};
