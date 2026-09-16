'use client';

import {useState} from 'react';
import {Bar,BarChart,CartesianGrid,Cell,LabelList,XAxis,YAxis} from 'recharts';
import {Check,Copy,Download,ExternalLink,X} from 'lucide-react';
import {Dialog,DialogContent,DialogDescription,DialogTitle} from '@/components/ui/dialog';
import {Button} from '@/components/ui/button';
import {Checkbox} from '@/components/ui/checkbox';
import {NativeSelect} from '@/components/ui/native-select';
import {Table,TableBody,TableCell,TableHead,TableHeader,TableRow} from '@/components/ui/table';
import {ChartContainer,type ChartConfig} from '@/components/ui/chart';
import {ProductImage,money,spec} from '@/components/gear-ui';
import type {Product,Variant} from '@/shared/types';

type Field={key?:string;label:string;value:(v:Variant)=>string};
type Metric={label:string;unit:string;domain:number;value:(v:Variant)=>number|null;format?:(value:number)=>string};
type AspectMode='overlay'|'stacked';
const SERIES=['#255b4c','#b3764d','#5f8296','#8b6c9c'];
const range=(min:number|null,max:number|null,unit:string)=>min!=null&&max!=null?`${min}–${max} ${unit}`:max!=null?`Up to ${max} ${unit}`:'—';
const common:Field[]=[
  {label:'Equipment weight',value:v=>spec(v.weight,' kg')},
  {label:'EN certification',value:v=>v.certification||'—'},
  {label:'LTF certification',value:v=>v.ltf||'—'},
  {label:'Load range',value:v=>range(v.minLoad,v.maxLoad,'kg')},
  {label:'Model status in database',value:v=>v.status},
];
const wing:Field[]=[
  {label:'Recommended all-up weight',value:v=>range(v.recommendedMin,v.recommendedMax,'kg')},
  {label:'Flat area',value:v=>spec(v.area,' m²')},
  {label:'Flat aspect ratio',value:v=>spec(v.aspectRatio)},
  {label:'Flat span',value:v=>spec(v.span,' m')},
  {label:'Pilot-to-canopy height',value:v=>spec(v.height,' m')},
  {label:'Projected area',value:v=>spec(v.projectedArea,' m²')},
  {label:'Projected aspect ratio',value:v=>spec(v.projectedAspectRatio)},
  {label:'Projected span',value:v=>spec(v.projectedSpan,' m')},
  {label:'Number of cells',value:v=>spec(v.cells)},
  {label:'Construction',value:v=>v.construction||'—'},
  {label:'Wing type',value:v=>v.type||'—'},
  {label:'Riser configuration',value:v=>v.risers||'—'},
];
const reserve:Field[]=[
  {label:'Canopy area',value:v=>spec(v.area,' m²')},
  {label:'Reserve type',value:v=>v.type||'—'},
  {label:'Steerable',value:v=>v.steerable||'—'},
  {label:'Sink rate',value:v=>spec(v.sinkRate,' m/s')},
  {label:'Opening time',value:v=>spec(v.openingTime,' s')},
  {label:'Pack volume',value:v=>range(v.volumeMin,v.volumeMax,'L')},
];
const wingMetrics:Metric[]=[
  {label:'Equipment weight',unit:'kg',domain:7,value:v=>v.weight},
  {label:'Pilot-to-canopy height',unit:'m',domain:10,value:v=>v.height},
  {label:'Flat span',unit:'m',domain:16,value:v=>v.span},
  {label:'Flat area',unit:'m²',domain:45,value:v=>v.area},
  {label:'Number of cells',unit:'cells',domain:120,value:v=>v.cells,format:v=>String(v)},
  {label:'Recorded RRP',unit:'GBP',domain:6000,value:v=>v.price,format:v=>money(v)},
];
const reserveMetrics:Metric[]=[
  {label:'Equipment weight',unit:'kg',domain:4,value:v=>v.weight},
  {label:'Maximum load',unit:'kg',domain:230,value:v=>v.maxLoad},
  {label:'Canopy area',unit:'m²',domain:70,value:v=>v.area},
  {label:'Sink rate',unit:'m/s',domain:7,value:v=>v.sinkRate},
  {label:'Opening time',unit:'s',domain:8,value:v=>v.openingTime},
  {label:'Recorded retail',unit:'GBP',domain:1800,value:v=>v.price,format:v=>money(v)},
];

function ProductLegend({products,variants}:{products:Product[];variants:Variant[]}){
  return <div className="chart-product-legend" aria-label="Product colour key">{products.map((product,index)=><div key={product.id}><i style={{backgroundColor:SERIES[index]}}/><span><b>{index+1}</b>{product.brand} {product.model}</span><small>Size {variants[index].size}</small></div>)}</div>;
}

function MetricBarChart({metric,products,variants}:{metric:Metric;products:Product[];variants:Variant[]}){
  const data=products.map((product,index)=>{
    const value=metric.value(variants[index]);
    return {item:String(index+1),value,display:value==null?'—':metric.format?.(value)??`${value} ${metric.unit}`,name:`${product.brand} ${product.model}`,missing:value==null,index};
  });
  const maximum=Math.max(metric.domain,...data.map(item=>(item.value??0)*1.18));
  const config:ChartConfig={value:{label:metric.label,color:SERIES[0]}};
  return <figure className="overview-chart-card" aria-label={`${metric.label} comparison`}><figcaption><span>{metric.label}</span><small>0–{metric.domain} {metric.unit}</small></figcaption><ChartContainer config={config} className="overview-bar-chart" initialDimension={{width:300,height:116}}><BarChart accessibilityLayer data={data} layout="vertical" margin={{top:2,right:55,bottom:2,left:0}} barCategoryGap={5}><CartesianGrid horizontal={false}/><XAxis type="number" domain={[0,maximum]} hide/><YAxis type="category" dataKey="item" axisLine={false} tickLine={false} width={17}/><Bar dataKey="value" radius={[0,5,5,0]}>{data.map(item=><Cell key={item.item} fill={item.missing?'#d6ddd4':SERIES[item.index]}/>) }<LabelList dataKey="display" position="right" className="overview-chart-label"/></Bar></BarChart></ChartContainer></figure>;
}

function RangeOverview({products,variants}:{products:Product[];variants:Variant[]}){
  const domain=230;
  if(!variants.some(variant=>variant.minLoad!=null&&variant.maxLoad!=null))return null;
  return <figure className="overview-chart-card range-overview" aria-label="Certified load range comparison"><figcaption><span>Certified load range</span><small>0–{domain} kg</small></figcaption><div className="shared-range-chart">{products.map((product,index)=>{const variant=variants[index],min=variant.minLoad,max=variant.maxLoad,missing=min==null||max==null;return <div key={product.id}><b>{index+1}</b><span className="shared-range-track">{!missing&&<i style={{left:`${min/domain*100}%`,width:`${(max-min)/domain*100}%`,backgroundColor:SERIES[index]}}/>}</span><small>{missing?'—':`${min}–${max} kg`}</small></div>;})}</div></figure>;
}

function AspectOverview({label,products,variants,projected=false,mode}:{label:string;products:Product[];variants:Variant[];projected?:boolean;mode:AspectMode}){
  const ratios=variants.map(variant=>projected?variant.projectedAspectRatio:variant.aspectRatio);
  const spans=variants.map(variant=>projected?variant.projectedSpan:variant.span),maximumSpan=Math.max(...spans.map(span=>span??0));
  const width=(index:number,maximum:number)=>spans[index]&&maximumSpan?maximum*spans[index]!/maximumSpan:maximum;
  if(ratios.every(ratio=>ratio==null))return null;
  return <figure className="overview-chart-card aspect-overview" aria-label={`${label} comparison`}><figcaption><span>{label}</span><small>shape + relative span</small></figcaption>{mode==='stacked'?<div className="stacked-aspects">{products.map((product,index)=>{const ratio=ratios[index],visualWidth=width(index,150);return <div key={product.id}><b>{index+1}</b>{ratio?<i style={{width:visualWidth,height:visualWidth/ratio,backgroundColor:SERIES[index]}}><span/></i>:<i className="missing-aspect">not recorded</i>}<small>{ratio??'—'}{spans[index]?` · ${spans[index]}m`:''}</small></div>;})}</div>:<div className="overlay-aspect-wrap"><div className="overlay-aspects" aria-hidden="true">{products.map((product,index)=>{const ratio=ratios[index],visualWidth=width(index,160);return ratio&&<i key={product.id} style={{width:visualWidth,height:visualWidth/ratio,backgroundColor:`${SERIES[index]}38`,borderColor:SERIES[index],zIndex:products.length-index}}><span/></i>;})}</div><div className="overlay-aspect-values">{products.map((product,index)=><span key={product.id}><i style={{backgroundColor:SERIES[index]}}/>{index+1} <b>{ratios[index]??'—'}{spans[index]?` · ${spans[index]}m`:''}</b></span>)}</div></div>}</figure>;
}

function VisualOverview({products,variants,aspectMode,onAspectMode}:{products:Product[];variants:Variant[];aspectMode:AspectMode;onAspectMode:(mode:AspectMode)=>void}){
  const wings=products[0].category==='Wings';
  const metrics=(wings?wingMetrics:reserveMetrics).filter(metric=>variants.some(variant=>metric.value(variant)!=null));
  return <section className="visual-overview" aria-labelledby="visual-overview-title"><div className="visual-overview-heading"><div><p>AT A GLANCE</p><h2 id="visual-overview-title">One scale. Every product.</h2></div><div className="visual-overview-actions">{wings&&<div className="aspect-mode" aria-label="Aspect ratio illustration layout"><button aria-pressed={aspectMode==='overlay'} onClick={()=>onAspectMode('overlay')}>Overlay</button><button aria-pressed={aspectMode==='stacked'} onClick={()=>onAspectMode('stacked')}>Stacked</button></div>}<span>Longer and larger show magnitude only, not suitability.</span></div></div><ProductLegend products={products} variants={variants}/><div className="overview-grid">{metrics.map(metric=><MetricBarChart key={metric.label} metric={metric} products={products} variants={variants}/>)}<RangeOverview products={products} variants={variants}/>{wings&&<><AspectOverview label="Flat aspect ratio" products={products} variants={variants} mode={aspectMode}/><AspectOverview label="Projected aspect ratio" products={products} variants={variants} projected mode={aspectMode}/></>}</div></section>;
}

export default function Comparison({products,open,onClose,sizes,onSize,onRemove}:{products:Product[];open:boolean;onClose:()=>void;sizes:Record<string,string>;onSize:(id:string,size:string)=>void;onRemove?:(id:string)=>void}){
  const [differences,setDifferences]=useState(false),[copied,setCopied]=useState(false),[shareUrl,setShareUrl]=useState(''),[aspectMode,setAspectMode]=useState<AspectMode>('overlay');
  if(!products.length)return null;
  const variants=products.map(product=>product.variants.find(variant=>variant.size===sizes[product.id])||product.variants.find(variant=>variant.status==='Current')||product.variants[0]);
  const wings=products[0].category==='Wings';
  const fields:Field[]=[{key:'price',label:wings?'Recorded RRP (GBP)':'Recorded retail price (GBP)',value:v=>money(v.price)},...common,...(wings?wing:reserve)];
  const visible=fields.filter(field=>!differences||products.length===1||new Set(variants.map(field.value)).size>1);
  async function share(){
    const url=new URL(window.location.href);url.pathname=wings?'/wings':'/reserves';url.search='';url.hash='';url.searchParams.set('selection',JSON.stringify(products.map((product,index)=>({id:product.id,size:variants[index].size}))));
    try{await navigator.clipboard.writeText(url.href);setCopied(true);setTimeout(()=>setCopied(false),2500);}catch{setShareUrl(url.href);}
  }
  function exportCsv(){
    const safe=(value:string)=>`"${(/^[=+\-@\t\r]/.test(value)?"'"+value:value).replaceAll('"','""')}"`;
    const lines=[['Specification',...products.map((product,index)=>`${product.brand} ${product.model} (${variants[index].size})`)],...fields.map(field=>[field.label,...variants.map(field.value)])];
    const blob=new Blob(['\ufeff'+lines.map(row=>row.map(safe).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8;'});
    const anchor=document.createElement('a');anchor.href=URL.createObjectURL(blob);anchor.download='flybubble-comparison.csv';anchor.click();setTimeout(()=>URL.revokeObjectURL(anchor.href),1000);
  }
  return <Dialog open={open} onOpenChange={value=>{if(!value)onClose();}}><DialogContent className="comparison-dialog"><div className="comparison-heading"><div className="eyebrow">{products.length===1?'PRODUCT DETAILS':'YOUR GEAR, SIDE BY SIDE'}</div><DialogTitle className="comparison-title">{products.length===1?'A closer look.':'The details make the difference.'}</DialogTitle><DialogDescription>{products.length===1?'Choose a size to see its exact recorded specifications.':'Choose a size for each product. Each colour stays with the same product across every chart.'}</DialogDescription></div><div className="comparison-tools"><label><Checkbox checked={differences} onCheckedChange={value=>setDifferences(!!value)} disabled={products.length===1}/>Show differences only</label><div><Button variant="outline" onClick={exportCsv}><Download/> CSV</Button><Button variant="outline" onClick={share}>{copied?<Check/>:<Copy/>}{copied?'Copied':'Copy link'}</Button></div></div>{shareUrl&&<label className="share-fallback">Copy this comparison link<input readOnly value={shareUrl} onFocus={event=>event.target.select()}/></label>}<div className="comparison-scroll">{products.length>1&&<VisualOverview products={products} variants={variants} aspectMode={aspectMode} onAspectMode={setAspectMode}/>}<Table className="comparison-table"><TableHeader><TableRow><TableHead className="spec-column"><span>Exact specifications.</span><small>{products.length>1&&<>Charts show the overview.<br/></>}“—” means not recorded.</small></TableHead>{products.map((product,index)=><TableHead key={product.id}><div className="compare-product-photo"><ProductImage product={product}/>{onRemove&&<button aria-label={`Remove ${product.model}`} onClick={()=>onRemove(product.id)}><X size={15}/></button>}</div><div className="brand-name">{product.brand}</div><h3>{product.model}</h3><label className="size-picker">Size<NativeSelect aria-label={`Size for ${product.brand} ${product.model}`} value={variants[index].size} onChange={event=>onSize(product.id,event.target.value)}>{product.variants.map(variant=><option key={variant.id} value={variant.size}>{variant.size}{variant.status==='Past model'?' (past)':''}</option>)}</NativeSelect></label>{product.url&&<div className="shop-cta"><a className="shop-link" href={product.url} target="_blank" rel="noreferrer">See the latest Flybubble price <ExternalLink size={13}/></a><small>{wings?'Often less than the recorded RRP.':'Check the current price and availability.'}</small></div>}</TableHead>)}</TableRow></TableHeader><TableBody>{visible.map(field=>{const values=variants.map(field.value);return <TableRow key={field.label} className={new Set(values).size>1?'different-row':''}><TableHead scope="row">{field.label}</TableHead>{values.map((value,index)=><TableCell key={products[index].id}>{field.key==='price'?<div className="price-with-cta"><strong>{value}</strong>{products[index].url&&<><a href={products[index].url!} target="_blank" rel="noreferrer">Check Flybubble price <ExternalLink size={12}/></a>{wings&&<small>Often less than RRP</small>}</>}</div>:value}</TableCell>)}</TableRow>;})}</TableBody></Table>{visible.length===0&&<p className="identical-note">No recorded differences for these sizes. Turn off the filter to see all specifications.</p>}</div><div className="comparison-note">Chart lengths show magnitude, not which product is better. Wing prices are recorded RRP; Flybubble’s current selling price may be lower. Reserve prices are recorded retail prices. Confirm current price, availability, certification, compatibility and loading before flying.</div></DialogContent></Dialog>;
}
