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
  assert.equal(products.reduce((sum,p)=>sum+p.variants.length,0),1115);
  assert.equal(new Set(products.map(p=>p.id)).size,products.length);
  const ids=products.flatMap(p=>p.variants.map(v=>v.id));assert.equal(new Set(ids).size,ids.length);
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
