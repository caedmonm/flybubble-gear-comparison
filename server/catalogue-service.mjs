import { readFile } from 'node:fs/promises';
import mysql from 'mysql2/promise';
import projection from '../shared/projection.json' with { type: 'json' };
import rows from '../data/catalogue-rows.json' with { type: 'json' };
import images from '../data/images.json' with { type: 'json' };
import { buildCatalogue } from '../shared/catalogue.mjs';

export function createCatalogueService(env = process.env) {
  const mode=env.DATA_SOURCE || 'snapshot';
  if (!['snapshot','mysql'].includes(mode)) throw new Error('DATA_SOURCE must be snapshot or mysql.');
  let cached, expires=0, pending, pool;
  async function refresh() {
    if(mode==='snapshot') return {products:buildCatalogue(rows,images),source:'snapshot',updatedAt:null};
    if(!env.DB_PASSWORD || env.DB_PASSWORD==='hide') throw new Error('Set DB_PASSWORD securely before enabling MySQL.');
    const ca=env.DB_CA_CERT || (env.DB_CA_PATH?await readFile(env.DB_CA_PATH,'utf8'):undefined);
    pool ||= mysql.createPool({
      host:env.DB_HOST,port:Number(env.DB_PORT || 25060),database:env.DB_NAME || 'defaultdb',
      user:env.DB_USER,password:env.DB_PASSWORD,connectionLimit:3,queueLimit:10,connectTimeout:10000,
      multipleStatements:false,ssl:{rejectUnauthorized:true,...(ca?{ca}:{})},
    });
    const connection=await pool.getConnection();
    try {
      await connection.query('SET TRANSACTION READ ONLY');
      await connection.beginTransaction();
      const tables={};
      for(const [table,fields] of Object.entries(projection)) {
        // Identifiers come exclusively from the checked-in allowlist, never HTTP input.
        const sql=`SELECT /*+ MAX_EXECUTION_TIME(10000) */ ${fields.map(f=>'`'+f+'`').join(',')} FROM \`${table}\``;
        [tables[table]]=await connection.query({sql,timeout:15000});
      }
      await connection.commit();
      return {products:buildCatalogue(tables,images),source:'mysql',updatedAt:new Date().toISOString()};
    } catch(error) {await connection.rollback();throw error;} finally {connection.release();}
  }
  return {
    async getCatalogue() {
      if(cached && Date.now()<expires) return cached;
      pending ||= refresh().then(data=>{cached=data;expires=Date.now()+60000;return data;}).finally(()=>{pending=null;});
      return pending;
    },
    async close(){await pool?.end();},
  };
}
