import rows from '@/data/catalogue-rows.json';
import images from '@/data/images.json';
import { buildCatalogue } from '@/shared/catalogue.mjs';
import { createCatalogueService } from '@/server/catalogue-service.mjs';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const catalogueService=createCatalogueService();

export async function GET() {
  try {
    const data=await catalogueService.getCatalogue();
    return Response.json(data,{headers:{'Cache-Control':'private, max-age=30'}});
  } catch {
    return Response.json({products:buildCatalogue(rows,images),source:'snapshot',updatedAt:null,warning:'Live data is unavailable. Showing the SQL snapshot.'},{headers:{'Cache-Control':'no-store'}});
  }
}
