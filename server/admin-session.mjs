import {
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';

export const cookieName = 'fb_import_session';
export const sessionSeconds = 4 * 60 * 60;
export function configured(env = process.env) {
  const password = env.ADMIN_IMPORT_PASSWORD || '';
  const minimumLength = env.NODE_ENV === 'development' ? 1 : 16;
  return password.trim().length >= minimumLength;
}
function equal(a, b) {
  const digest = (s) => createHash('sha256').update(s).digest();
  return timingSafeEqual(digest(a), digest(b));
}
export function passwordMatches(input, env = process.env) {
  return (
    configured(env) &&
    typeof input === 'string' &&
    equal(input, env.ADMIN_IMPORT_PASSWORD)
  );
}
const sign = (body, env) =>
  createHmac('sha256', env.ADMIN_IMPORT_PASSWORD)
    .update('import-v1:' + body)
    .digest('base64url');
export function issueSession(env = process.env, now = Date.now()) {
  if (!configured(env)) throw new Error('Import password is not configured.');
  const body =
    now + sessionSeconds * 1000 + '.' + randomBytes(18).toString('base64url');
  return body + '.' + sign(body, env);
}
export function validSession(token, env = process.env, now = Date.now()) {
  if (
    !configured(env) ||
    typeof token !== 'string' ||
    !/^\d{13}\.[\w-]{24}\.[\w-]{43}$/.test(token)
  )
    return false;
  const [expiry, nonce, mac] = token.split('.');
  return +expiry > now && equal(mac, sign(expiry + '.' + nonce, env));
}
// One shared password, so attempts are bounded per process regardless of claimed client IP.
export function loginLimiter() {
  let failures = 0,
    reset = 0;
  return {
    blocked(now = Date.now()) {
      if (now >= reset) failures = 0;
      return failures >= 15;
    },
    failed(now = Date.now()) {
      if (now >= reset) {
        failures = 0;
        reset = now + 5 * 60_000;
      }
      failures++;
    },
  };
}
