import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCatalogue } from '../shared/catalogue.mjs';
import { filterCatalogue, reserveFilterError } from '../shared/filter.mjs';

const catalogue = buildCatalogue({ ReservesData: [
  {Make:'Test',Model:'Reserve',Size:'S',Type:'Square ',Steerable:'No',Loadmin:50,Loadmax:100,Weightmanu:1258,Volmin:3,Volmax:5,Area:25,Ourprice:679,FBPrice:659,Sell:'YES',Modelstatus:'Past'},
  {Make:'Test',Model:'Reserve',Size:'M',Type:'Rogallo',Steerable:'Yes',Loadmin:70,Loadmax:120,Weightmanu:1400,Volrange:'4-6',Area:30,Ourprice:800,Sell:'NO',Modelstatus:'Current'},
  {Make:'Test',Model:'Reserve',Size:'L',Type:'Round PDA',Steerable:'No',Loadmin:80,Loadmax:150,Weightmanu:2000,Volrange:'5–8',Area:35,FBPrice:1000,Sell:'yes',Modelstatus:'Current'},
  {Make:'Test',Model:'Reserve',Size:'Unknown'},
] });
const sizes = (reserve = {}, common = {}) => filterCatalogue(catalogue, { ...common, reserve }).flatMap(p => p.variants.map(v => v.size));

test('reserve type multiselect and steerability intersect on the same size', () => {
  assert.deepEqual(sizes(), ['S','M','L','Unknown']);
  assert.deepEqual(sizes({types:['Square','Rogallo']}), ['S','M']);
  assert.deepEqual(sizes({types:['Square','Rogallo'],steerable:'No'}), ['S']);
  assert.deepEqual(sizes({types:['Square'],steerable:'Yes'}), []);
  assert.deepEqual(sizes({steerable:'Yes'}), ['M']);
});

test('one pilot AUW must fit within one reserve size, with inclusive limits', () => {
  assert.deepEqual(sizes({allUpWeight:'50'}), ['S']);
  assert.deepEqual(sizes({allUpWeight:'70'}), ['S','M']);
  assert.deepEqual(sizes({allUpWeight:'100'}), ['S','M','L']);
  assert.deepEqual(sizes({allUpWeight:'49'}), []);
  assert.deepEqual(sizes({allUpWeight:'121'}), ['L']);
  assert.deepEqual(sizes({allUpWeight:'151'}), []);
  assert.deepEqual(sizes({allUpWeight:'110',maxWeightGrams:'1258'}), []);
});

test('90%, 95% and 100% loading thresholds use pilot AUW and include exact boundaries', () => {
  const single = buildCatalogue({ReservesData:[{Make:'Test',Model:'Reserve',Size:'100',Loadmin:50,Loadmax:100}]});
  for (const percent of [90,95,100]) {
    assert.equal(filterCatalogue(single,{reserve:{allUpWeight:String(percent),loadPercent:percent}}).length,1);
    assert.equal(filterCatalogue(single,{reserve:{allUpWeight:String(percent+0.01),loadPercent:percent}}).length,0);
  }
  assert.deepEqual(sizes({loadPercent:90}), ['S','M','L','Unknown']);
  assert.deepEqual(sizes({allUpWeight:'100',loadPercent:90}), ['M','L']);
  assert.deepEqual(sizes({allUpWeight:'108',loadPercent:90,loadMax:'120'}), ['M']);
  assert.deepEqual(sizes({allUpWeight:'108.01',loadPercent:90,loadMax:'120'}), []);
});

test('reserve load limits remove underloaded and oversized candidates independently of AUW', () => {
  assert.deepEqual(sizes({loadMin:'70'}), ['M','L']);
  assert.deepEqual(sizes({loadMax:'120'}), ['S','M']);
  assert.deepEqual(sizes({loadMin:'70',loadMax:'120'}), ['M']);
  assert.deepEqual(sizes({allUpWeight:'110',loadMax:'110'}), []);
});

test('reserve weight is filtered in grams and budget uses public Flybubble price with retail fallback', () => {
  assert.deepEqual(sizes({maxWeightGrams:'1258'}), ['S']);
  assert.deepEqual(sizes({maxWeightGrams:'1257'}), []);
  assert.deepEqual(sizes({maxPrice:'659'}), ['S']);
  assert.deepEqual(sizes({maxPrice:'658'}), []);
  assert.deepEqual(sizes({minArea:'30'}), ['M','L']);
  assert.deepEqual(sizes({minArea:'30',maxWeightGrams:'1258'}), []);
});

test('full packed-volume range must be contained within active limits', () => {
  assert.deepEqual(sizes({volumeMin:'3',volumeMax:'5'}), ['S']);
  assert.deepEqual(sizes({volumeMin:'4',volumeMax:'6'}), ['M']);
  assert.deepEqual(sizes({volumeMin:'4',volumeMax:'5'}), []);
  assert.deepEqual(sizes({volumeMin:'5'}), ['L']);
  assert.deepEqual(sizes({volumeMax:'6'}), ['S','M']);
});

test('single recorded volumes, ranges, and the verified Charly cm³ record become litres', () => {
  const items = buildCatalogue({ReservesData:[
    {Make:'Test',Model:'Single',Size:'S',Volrange:'3.5'},
    {Make:'Test',Model:'Range',Size:'S',Volrange:'2.5-4'},
    {Make:'Charly',Model:'DIAMONDcross ST light',Size:'125',Volrange:'4700'},
    {Make:'Test',Model:'Missing',Size:'S',Volrange:'unknown'},
  ]});
  const volume = model => {const v=items.find(p=>p.model===model).variants[0];return [v.volumeMin,v.volumeMax];};
  assert.deepEqual(volume('Single'),[3.5,3.5]);
  assert.deepEqual(volume('Range'),[2.5,4]);
  assert.deepEqual(volume('DIAMONDcross ST light'),[4.7,4.7]);
  assert.deepEqual(volume('Missing'),[null,null]);
});

test('Sold by Flybubble normalizes reserve YES/NO and is independent of model status', () => {
  assert.deepEqual(sizes({}, {forSaleOnly:true}), ['S','L']);
  assert.deepEqual(sizes({}, {forSaleOnly:true,modelStatus:'Past model'}), ['S']);
  assert.deepEqual(sizes({}, {forSaleOnly:true,modelStatus:'Current'}), ['L']);
  assert.deepEqual(sizes({types:['Rogallo']}, {forSaleOnly:true}), []);
});

test('active reserve filters exclude unknown values; empty filters retain them', () => {
  for (const reserve of [{allUpWeight:'90'},{maxWeightGrams:'3000'},{volumeMin:'0'},{volumeMax:'10'},{minArea:'0'},{maxPrice:'1000'},{loadMin:'0'},{loadMax:'200'}]) assert.ok(!sizes(reserve).includes('Unknown'));
  assert.ok(sizes().includes('Unknown'));
});

test('invalid or reversed limits give an explanation and no misleading matches', () => {
  for (const reserve of [{volumeMin:'6',volumeMax:'3'},{loadMin:'130',loadMax:'100'},{maxWeightGrams:'-1'},{allUpWeight:'not a number'}]) {
    assert.ok(reserveFilterError(reserve));
    assert.deepEqual(sizes(reserve),[]);
  }
});

test('reserve-only filters do not affect wings', () => {
  const wings=buildCatalogue({WingsData:[{Make:'Test',Model:'Wing',Size:'M'}]});
  assert.equal(filterCatalogue(wings,{reserve:{types:['BASE'],steerable:'Yes',allUpWeight:'50',maxWeightGrams:'0',minArea:'100',maxPrice:'0'}}).length,1);
});
