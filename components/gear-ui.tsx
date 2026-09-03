'use client';
import {useState} from 'react';
import {Wind} from 'lucide-react';
import type {Product} from '@/shared/types';
export const money=(n:number|null)=>n?new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP',maximumFractionDigits:0}).format(n):'Not recorded';
export const spec=(n:number|null,unit='')=>n==null?'—':`${n}${unit}`;
export function ProductImage({product}:{product:Product}){
  const [failed,setFailed]=useState(false);
  return product.image&&!failed?<img src={product.image} alt={`${product.brand} ${product.model}`} loading="lazy" onError={()=>setFailed(true)}/>:<div className="no-photo"><Wind size={35}/><span>Product photo unavailable</span></div>;
}
