import { databasePool } from './mysql.mjs';
import { cataloguePhotos } from './product-photos.mjs';
import projection from '../shared/projection.json' with { type: 'json' };
import rows from '../data/catalogue-rows.json' with { type: 'json' };
import images from '../data/images.json' with { type: 'json' };
import { buildCatalogue } from '../shared/catalogue.mjs';

export function createCatalogueService(env = process.env) {
  const mode=env.DATA_SOURCE || 'snapshot';
  if (!['snapshot','mysql'].includes(mode)) throw new Error('DATA_SOURCE must be snapshot or mysql.');
  const pool=databasePool(env);
  let cached, expires=0, pending;
  async function refresh() {
    if(mode==='snapshot') return {products:buildCatalogue(rows,images),source:'snapshot',updatedAt:null};
    const connection=await (await pool.get()).getConnection();
    try {
      await connection.query('SET TRANSACTION READ ONLY');
      await connection.beginTransaction();
      const tables={};
      for(const [table,fields] of Object.entries(projection)) {
        // Identifiers come exclusively from the checked-in allowlist, never HTTP input.
        const sql=`SELECT /*+ MAX_EXECUTION_TIME(10000) */ ${fields.map(f=>'`'+f+'`').join(',')} FROM \`${table}\``;
        [tables[table]]=await connection.query({sql,timeout:15000});
      }
      const photos=await cataloguePhotos(connection);
      await connection.commit();
      return {products:buildCatalogue(tables,photos),source:'mysql',updatedAt:new Date().toISOString()};
    } catch(error) {await connection.rollback();throw error;} finally {connection.release();}
  }
  return {
    async getCatalogue() {
      if(cached && Date.now()<expires) return cached;
      pending ||= refresh().then(data=>{cached=data;expires=Date.now()+60000;return data;}).finally(()=>{pending=null;});
      return pending;
    },
    close:()=>pool.close(),
  };
}
