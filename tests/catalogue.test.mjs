import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { buildCatalogue, safeShopUrl } from '../shared/catalogue.mjs';
import { filterCatalogue } from '../shared/filter.mjs';
import rows from '../data/catalogue-rows.json' with {type:'json'};
import projection from '../shared/projection.json' with {type:'json'};
import { createCatalogueService } from '../server/catalogue-service.mjs';
const products=buildCatalogue(rows);

test('all SQL size records survive grouping without duplicate IDs',()=>{
  assert.equal(rows.WingsData.length,1228);
  assert.equal(rows.ReservesData.length,176);
  assert.equal(products.length,325);
  assert.equal(products.reduce((sum,p)=>sum+p.variants.length,0),1404);
  assert.equal(new Set(products.map(p=>p.id)).size,products.length);
  const ids=products.flatMap(p=>p.variants.map(v=>v.id));assert.equal(new Set(ids).size,ids.length);
});
test('native primary keys and reordered rows preserve shared product and size IDs',()=>{
  const wing={Make:'Example',Model:'Wing',Size:'M',CertEN:'B',RRP:3000};
  const reserve={Make:'Example',Model:'Reserve',Size:'100',Weightmanu:1200};
  const legacy=buildCatalogue({WingsData:[{...wing,_access_row_id:1}],ReservesData:[{...reserve,_access_row_id:2}]});
  const native=buildCatalogue({WingsData:[wing],ReservesData:[{...reserve,ID:999}]});
  assert.deepEqual(native,legacy);
  assert.equal(native.find(p=>p.category==='Wings').id,'wings%3Aexample%3Awing');
  assert.equal(native.find(p=>p.category==='Wings').variants[0].id,'wings%3Aexample%3Awing%3Am');
  const reversed=buildCatalogue(Object.fromEntries(Object.entries(rows).map(([table,records])=>[table,records.toReversed()])));
  const ids=catalogue=>catalogue.flatMap(p=>p.variants.map(v=>v.id)).toSorted();
  assert.deepEqual(ids(reversed),ids(products));
});
test('latest export includes added models and updated public specifications',()=>{
  const added=products.find(p=>p.brand==='Bruce Goldsmith Design'&&p.model==='KISS 2');
  assert.equal(added.variants.length,4);
  const wing=products.find(p=>p.brand==='Advance'&&p.model==='SIGMA 12 DLS').variants.find(v=>v.size==='26');
  assert.equal(wing.type,'Sports Paragliders');
  assert.equal(wing.construction,'Standard');
  const motor=products.find(p=>p.brand==='Bruce Goldsmith Design'&&p.model==='ADAM 2 MOTOR').variants.find(v=>v.size==='XS');
  assert.equal(motor.price,2625);
});
test('reserve manufacturer weights are converted from grams to kg',()=>{
  const p=products.find(p=>p.brand==='Companion'&&p.model==='SQR Classic');
  const v=p.variants.find(v=>v.size==='100');assert.equal(v.weight,1.258);assert.equal(v.maxLoad,100);assert.equal(v.price,679);
});
test('combined filters must match the same size, not different sizes',()=>{
  const p={id:'sample',category:'Wings',brand:'Test',model:'Wing',variants:[
    {size:'S',certClass:'A',minLoad:50,maxLoad:70,weight:2,price:2000,status:'Current'},
    {size:'L',certClass:'B',minLoad:90,maxLoad:110,weight:4,price:3500,status:'Current'},
  ]};
  assert.equal(filterCatalogue([p],{cert:'A',allUpWeight:100}).length,0);
  assert.equal(filterCatalogue([p],{maxWeight:3,maxPrice:3000,allUpWeight:100}).length,0);
  assert.equal(filterCatalogue([p],{cert:'B',allUpWeight:100})[0].variants[0].size,'L');
});
test('export contains only approved tables and columns, never private fields',()=>{
  assert.deepEqual(Object.keys(rows).sort(),['DSGeneric','ReservesData','WingsData']);
  for(const [table,records] of Object.entries(rows))for(const record of records)assert.deepEqual(Object.keys(record).sort(),projection[table].toSorted());
  const payload=JSON.stringify(products);
  for(const field of ['Cost','OurCost','password','email','Owner name','Serial number','supplier'])assert.ok(!payload.includes(`"${field}"`));
});
test('unsafe product URLs cannot reach an outbound link',()=>{
  assert.equal(safeShopUrl('javascript:alert(1)'),null);assert.equal(safeShopUrl('https://flybubble.com.evil.test/x'),null);
  assert.equal(safeShopUrl('https://flybubble.com/products/example'),'https://flybubble.com/products/example');
});
test('mixed certification ratings remain unsimplified',()=>{
  const [p]=buildCatalogue({WingsData:[{Make:'Example',Model:'Mixed',Size:'M',CertEN:'A / B'}]});
  assert.equal(p.variants[0].certClass,null);assert.equal(p.variants[0].certification,'A / B');
});
test('MySQL mode fails closed when the password is redacted',async()=>{
  const service=createCatalogueService({DATA_SOURCE:'mysql',DB_PASSWORD:'hide'});
  await assert.rejects(service.getCatalogue(),/DB_PASSWORD/);
  const source=await readFile(new URL('../server/catalogue-service.mjs',import.meta.url),'utf8');
  assert.match(source,/rejectUnauthorized:true/);assert.match(source,/SET TRANSACTION READ ONLY/);assert.match(source,/multipleStatements:false/);
});
test('snapshot catalogue service returns the public product projection',async()=>{
  const service=createCatalogueService({DATA_SOURCE:'snapshot'});
  const data=await service.getCatalogue();
  assert.equal(data.source,'snapshot');
  assert.equal(data.products.length,products.length);
  assert.equal(data.updatedAt,null);
  await service.close();
});
