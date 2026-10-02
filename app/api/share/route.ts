import {
  shareLinkService,
  validateShareTarget,
} from '@/server/share-links.mjs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  let target: string;
  try {
    // Limit request bodies before buffering them, including chunked requests.
    const reader = request.body?.getReader();
    if (!reader) throw new Error();
    const chunks: Uint8Array[] = [];
    let length = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > 16384) {
        await reader.cancel();
        throw new Error();
      }
      chunks.push(value);
    }
    target = validateShareTarget(
      JSON.parse(Buffer.concat(chunks).toString('utf8')).target,
    );
  } catch {
    return Response.json({ error: 'Invalid catalogue link.' }, { status: 400 });
  }
  try {
    const id = await shareLinkService.create(target);
    return Response.json(
      { path: `/s/${id}` },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch {
    return Response.json(
      { error: 'Short links are temporarily unavailable.' },
      { status: 503 },
    );
  }
}
