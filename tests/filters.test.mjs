import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCatalogue } from '../shared/catalogue.mjs';
import { filterCatalogue, rangeBounds } from '../shared/filter.mjs';
import rows from '../data/catalogue-rows.json' with {type:'json'};
const products = buildCatalogue(rows);

test('brand selections are a union for wings and reserves, with empty selections unrestricted',()=>{
  for (const category of ['Wings','Reserves']) {
    const brands=[...new Set(products.filter(p=>p.category===category).map(p=>p.brand))].slice(0,2);
    const actual=filterCatalogue(products,{category,brands});
    assert.deepEqual(new Set(actual.map(p=>p.brand)),new Set(brands));
    assert.equal(actual.length,products.filter(p=>p.category===category&&brands.includes(p.brand)).length);
    assert.equal(filterCatalogue(products,{category,brands:[]}).length,products.filter(p=>p.category===category).length);
  }
});

test('size and colour unions intersect other filters on a single variant',()=>{
  const [p]=buildCatalogue({WingsData:[
    {Make:'Test',Model:'Wing',Size:'S',FlatSurf:20,FlatAR:5,Cells:40,Gliderwt:3,CertEN:'A'},
    {Make:'Test',Model:'Wing',Size:'M',FlatSurf:24,FlatAR:5.5,Cells:50,Gliderwt:4,CertEN:'B'},
    {Make:'Test',Model:'Wing',Size:'L',FlatSurf:28,FlatAR:6,Cells:60,Gliderwt:5,CertEN:'C'},
  ],DSColours:[{Brand:'Test',Model:'Wing',Colour:'Red'},{Brand:'Test',Model:'Wing',Colour:'Blue'}]});
  assert.deepEqual(filterCatalogue([p],{sizes:['S','M'],colours:['Green','Blue']})[0].variants.map(v=>v.size),['S','M']);
  assert.equal(filterCatalogue([p],{colours:['Green']}).length,0);
  assert.equal(filterCatalogue([p],{sizes:['S'],areaRange:[24,28]}).length,0);
  assert.equal(filterCatalogue([p],{areaRange:[20,24],aspectRatioRange:[6,7]}).length,0);
  assert.equal(filterCatalogue([p],{areaRange:[20,24],cellsRange:[60,70]}).length,0);
  assert.equal(filterCatalogue([p],{areaRange:[24,28],maxWeight:3}).length,0);
  assert.deepEqual(filterCatalogue([p],{sizes:['M','L'],areaRange:[24,28],aspectRatioRange:[5.5,6],cellsRange:[50,60],maxWeight:4})[0].variants.map(v=>v.size),['M']);
});

test('range bounds are inclusive and missing specifications only disappear for active ranges',()=>{
  const [p]=buildCatalogue({WingsData:[
    {Make:'Test',Model:'Wing',Size:'S',FlatSurf:20.05,FlatAR:5.5,Cells:50},
    {Make:'Test',Model:'Wing',Size:'M'},
  ]});
  assert.equal(filterCatalogue([p],{})[0].variants.length,2);
  for (const filter of [{areaRange:[20.05,20.05]},{aspectRatioRange:[5.5,5.5]},{cellsRange:[50,50]}]) {
    assert.deepEqual(filterCatalogue([p],filter)[0].variants.map(v=>v.size),['S']);
  }
  assert.deepEqual(rangeBounds([p],'area',0.1),[20,20.1]);
  assert.equal(rangeBounds([p],'weight'),null);
});

test('wing-only filters never exclude reserves',()=>{
  const expected=filterCatalogue(products,{category:'Reserves'});
  const actual=filterCatalogue(products,{category:'Reserves',sizes:['Nonexistent'],colours:['Nonexistent'],certScheme:'Other',cert:'CCC',areaRange:[0,1],aspectRatioRange:[1,2],cellsRange:[1,2]});
  assert.deepEqual(actual,expected);
});

test('known surface outliers cannot distort bounds and remain visible without a surface filter',()=>{
  const catalogue=buildCatalogue({WingsData:[
    {Make:'Skywalk',Model:'MESCAL6',Size:'L',FlatSurf:3074},
    {Make:'Skywalk',Model:'MESCAL6',Size:'S',FlatSurf:26.45},
    {Make:'Skywalk',Model:'ARAK AIR',Size:'L',FlatSurf:286},
  ]});
  assert.deepEqual(rangeBounds(catalogue,'area',0.1),[26.4,26.5]);
  assert.equal(filterCatalogue(catalogue,{}).length,2);
  assert.deepEqual(filterCatalogue(catalogue,{areaRange:[20,40]})[0].variants.map(v=>v.size),['S']);
  assert.equal(catalogue.find(p=>p.model==='MESCAL6').variants[0].area,3074);
});

test('sale status uses the recorded flag independently of model status or shop links, on the same size',()=>{
  const catalogue=buildCatalogue({WingsData:[
    {Make:'Test',Model:'Wing',Size:'S',Status:'Past',Sell:'Y'},
    {Make:'Test',Model:'Wing',Size:'M',Status:'current',Sell:'N',ShopURL:'https://flybubble.com/products/wing'},
    {Make:'Test',Model:'Wing',Size:'L',Status:'current',Sell:null},
    {Make:'Test',Model:'Wing',Size:'XL',Status:'current',Sell:' y '},
  ]});
  const sizes=filters=>filterCatalogue(catalogue,filters).flatMap(p=>p.variants.map(v=>v.size));
  assert.deepEqual(sizes({}),['S','M','L','XL']);
  assert.deepEqual(sizes({forSaleOnly:true}),['S','XL']);
  assert.deepEqual(sizes({modelStatus:'Current'}),['M','L','XL']);
  assert.deepEqual(sizes({forSaleOnly:true,modelStatus:'Current'}),['XL']);
  assert.deepEqual(sizes({forSaleOnly:true,modelStatus:'Past model'}),['S']);
  assert.deepEqual(sizes({forSaleOnly:true,sizes:['M']}),[]);
});

test('all, current and past model filters work for wings and reserves on the matching size',()=>{
  for (const table of ['WingsData','ReservesData']) {
    const statusField=table==='WingsData'?'Status':'Modelstatus';
    const priceField=table==='WingsData'?'RRP':'Ourprice';
    const catalogue=buildCatalogue({[table]:[
      {Make:'Test',Model:'Equipment',Size:'S',[statusField]:'current',[priceField]:500},
      {Make:'Test',Model:'Equipment',Size:'L',[statusField]:'Past',[priceField]:1000},
    ]});
    const sizes=filters=>filterCatalogue(catalogue,filters).flatMap(p=>p.variants.map(v=>v.size));
    assert.deepEqual(sizes({}),['S','L']);
    assert.deepEqual(sizes({modelStatus:'All'}),['S','L']);
    assert.deepEqual(sizes({modelStatus:'Current'}),['S']);
    assert.deepEqual(sizes({modelStatus:'Past model'}),['L']);
    assert.deepEqual(sizes({modelStatus:'Past model',maxPrice:500}),[]);
  }
});

test('certification schemes use separate fields and preserve general certification evidence',()=>{
  const catalogue=buildCatalogue({WingsData:[
    {Make:'Test',Model:'Mixed schemes',Size:'M',CertEN:'EN C / LTF D',CertLtf:'LTF D'},
    {Make:'Test',Model:'Motor',Size:'M',CertEN:'A',Certification:'EN/LTF A & DGAC'},
    {Make:'Test',Model:'DGAC field',Size:'M',CertDGAC:'Yes'},
    {Make:'Test',Model:'Competition',Size:'M',CertEN:'-',Certification:'CCC'},
    {Make:'Test',Model:'Load',Size:'M',CertEN:'None',Certification:'LOAD test only'},
    {Make:'Test',Model:'926',Size:'M',CertEN:'EN 926-1'},
    {Make:'Test',Model:'Uncertified',Size:'M',Certification:'None'},
    {Make:'Test',Model:'Unknown',Size:'M'},
    {Make:'Test',Model:'Pending',Size:'M',CertDGAC:'i.p.',CertEN:'-'},
  ]});
  const names=filters=>filterCatalogue(catalogue,filters).map(p=>p.model).sort();
  assert.deepEqual(names({certScheme:'LTF',cert:'D'}),['Mixed schemes']);
  assert.deepEqual(names({certScheme:'EN',cert:'C'}),['Mixed schemes']);
  assert.deepEqual(names({certScheme:'DGAC'}),['DGAC field','Motor']);
  assert.deepEqual(names({certScheme:'Other',cert:'CCC'}),['Competition']);
  assert.deepEqual(names({certScheme:'Other',cert:'Load Test Only'}),['926','Load']);
  assert.deepEqual(names({certScheme:'Other',cert:'Uncertified'}),['Uncertified']);
});

test('database colourways are matched by model, deduplicated and limited to wings',()=>{
  const catalogue=buildCatalogue({WingsData:[{Make:'Test',Model:'Wing',Size:'S'},{Make:'Test',Model:'Wing',Size:'M'}],ReservesData:[{Make:'Test',Model:'Reserve',Size:'100'}],DSColours:[
    {Brand:'TEST',Model:'WING',Colour:' Red '},{Brand:'Test',Model:'Wing',Colour:'Red'},
    {Brand:'Test',Model:'Wing',Colour:'Blue'},{Brand:'Test',Model:'Wing',Colour:null},
    {Brand:'Test',Model:'Reserve',Colour:'Orange'},
  ]});
  assert.deepEqual(catalogue.find(p=>p.category==='Wings').colours,['Blue','Red']);
  assert.deepEqual(catalogue.find(p=>p.category==='Reserves').colours,[]);
  assert.ok(products.some(p=>p.colours.length));
});
