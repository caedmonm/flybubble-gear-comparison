import { readPhoto } from '@/server/product-photos.mjs';

export const runtime = 'nodejs';
export async function GET(
  _request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const photo = await readPhoto((await ctx.params).id);
    if (!photo) return new Response(null, { status: 404 });
    return new Response(new Uint8Array(photo.image_bytes), {
      headers: {
        'Content-Type': photo.mime_type,
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (e) {
    const missing = (e as { code?: string }).code === 'ER_NO_SUCH_TABLE';
    return new Response(null, {
      status: missing ? 404 : 503,
      headers: { 'Cache-Control': 'no-store' },
    });
  }
}
