import { cookies } from 'next/headers';
import {
  configured,
  cookieName,
  issueSession,
  loginLimiter,
  passwordMatches,
  sessionSeconds,
  validSession,
} from '@/server/admin-session.mjs';
import { ImportError } from '@/server/import-validation.mjs';
import { commitImport, writesConfigured } from '@/server/import-store.mjs';
import { researchRow } from '@/server/import-research.mjs';
import { lookupPhoto } from '@/server/product-photos.mjs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 180;
const limiter = loginLimiter();
const reply = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
async function readJson(request: Request, limit: number) {
  if (!request.headers.get('content-type')?.startsWith('application/json'))
    throw new ImportError('JSON required.', 415);
  const reader = request.body?.getReader();
  if (!reader) throw new ImportError('Missing request.');
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > limit) {
      await reader.cancel();
      throw new ImportError('Request is too large.', 413);
    }
    chunks.push(value);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new ImportError('Invalid request.');
  }
}
export async function POST(
  request: Request,
  ctx: { params: Promise<{ action: string }> },
) {
  const { action } = await ctx.params;
  const origin = request.headers.get('origin');
  const siteOrigin = new URL(process.env.SITE_ORIGIN || request.url).origin;
  // Next dev can report localhost in request.url even when the browser used 127.0.0.1.
  const host = request.headers.get('host') || '';
  const sameLocalOrigin =
    process.env.NODE_ENV === 'development' &&
    /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i.test(host) &&
    origin === new URL(request.url).protocol + '//' + host;
  if (origin !== siteOrigin && !sameLocalOrigin)
    return reply({ error: 'The request origin does not match the site.' }, 403);
  const jar = await cookies();
  try {
    if (action === 'login') {
      if (!configured())
        return reply({ error: 'Admin access is not configured.' }, 503);
      if (limiter.blocked())
        return reply(
          { error: 'Too many sign-in attempts. Try again in five minutes.' },
          429,
        );
      const body = await readJson(request, 2048);
      if (!passwordMatches(body?.password)) {
        limiter.failed();
        return reply({ error: 'Incorrect password.' }, 401);
      }
      jar.set(cookieName, issueSession(), {
        httpOnly: true,
        sameSite: 'strict',
        secure:
          origin?.startsWith('https://') === true ||
          process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: sessionSeconds,
      });
      return reply({
        ok: true,
        canResearch: !!process.env.DO_AI_KEY,
        canWrite: writesConfigured(),
      });
    }
    if (action === 'logout') {
      jar.delete(cookieName);
      return reply({ ok: true });
    }
    if (!validSession(jar.get(cookieName)?.value))
      return reply({ error: 'Sign in to continue.' }, 401);
    if (action === 'photo') {
      const input = await readJson(request, 32_768);
      try {
        return reply(await lookupPhoto(input, request.signal));
      } catch (e) {
        if (e instanceof ImportError) throw e;
        return reply(
          { error: 'Photo lookup is temporarily unavailable.' },
          502,
        );
      }
    }
    if (action === 'research')
      return reply({
        suggestions: await researchRow(
          await readJson(request, 32_768),
          process.env,
          fetch,
          request.signal,
        ),
      });
    if (action === 'commit')
      return reply(
        await commitImport((await readJson(request, 3_000_000))?.rows),
      );
    return reply({ error: 'Unknown import action.' }, 404);
  } catch (error) {
    if (error instanceof ImportError)
      return reply({ error: error.message }, error.status);
    return reply(
      {
        error:
          'The import service is unavailable. Check the database connection and import permissions, then retry.',
      },
      503,
    );
  }
}
