export interface CmsAccessEnv {
  // Team hostname or exact HTTPS issuer; arbitrary JWKS URLs are not accepted.
  ACCESS_TEAM_DOMAIN?: string;
  ACCESS_AUD?: string;
  ACCESS_ALLOWED_SUBJECTS?: string;
  ACCESS_ALLOWED_EMAILS?: string;
}
export interface CmsIdentity { subject: string; email?: string }
export interface AccessVerifierOptions {
  fetch?: typeof globalThis.fetch;
  now?: () => number;
}
export interface PlatformAccess { aud: string; getIdentity(): Promise<unknown> }
export type AccessVerifier = (request: Request, env: CmsAccessEnv, platformAccess?: PlatformAccess) => Promise<CmsIdentity | null>;
const MAX_TOKEN_BYTES = 16_384;
const MAX_JWKS_BYTES = 65_536;
const CACHE_MS = 300_000;
const FAILURE_CACHE_MS = 30_000;
const TIMEOUT_MS = 3_000;

function decode(segment: string): Uint8Array<ArrayBuffer> {
  if (!/^[A-Za-z0-9_-]+$/.test(segment)) throw new Error();
  const binary = atob(segment.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(binary, character => character.charCodeAt(0));
}
function parse(segment: string): Record<string, unknown> {
  const result: unknown = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(decode(segment)));
  if (!result || typeof result !== 'object' || Array.isArray(result)) throw new Error();
  return result as Record<string, unknown>;
}
function issuerFor(value: string | undefined): string | null {
  if (!value) return null;
  const issuer = value.startsWith('https://') ? value : `https://${value}`;
  return /^https:\/\/[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.cloudflareaccess\.com$/.test(issuer) ? issuer : null;
}
function allowlist(value: string | undefined): Set<string> {
  if (!value || value.length > 8192) return new Set();
  return new Set(value.split(',').map(entry => entry.trim()).filter(entry => entry.length > 0 && entry.length <= 256));
}

async function jwksBody(response: Response): Promise<unknown> {
  if (!response.ok || !response.body) throw new Error();
  const declared = response.headers.get('content-length');
  if (declared && (!/^\d+$/.test(declared) || Number(declared) > MAX_JWKS_BYTES)) {
    await response.body.cancel();
    throw new Error();
  }
  const reader = response.body.getReader();
  let length = 0;
  const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > MAX_JWKS_BYTES) { await reader.cancel(); throw new Error(); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
}

export function createAccessVerifier(options: AccessVerifierOptions = {}): AccessVerifier {
  const fetcher = options.fetch ?? globalThis.fetch;
  const now = options.now ?? Date.now;
  // Unknown kids never force a refresh: at most one fetch per issuer per cache window.
  const cache = new Map<string, { expires: number; keys: Promise<Map<string, CryptoKey> | null> }>();
  async function keysFor(issuer: string) {
    const existing = cache.get(issuer);
    if (existing && existing.expires > now()) return existing.keys;
    if (cache.size >= 8 && !cache.has(issuer)) cache.delete(cache.keys().next().value!);
    const entry = { expires: now() + CACHE_MS, keys: Promise.resolve<Map<string, CryptoKey> | null>(null) };
    cache.set(issuer, entry);
    entry.keys = (async () => {
      const controller = new AbortController();
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        const operation = (async () => {
          const response = await fetcher(`${issuer}/cdn-cgi/access/certs`, {
            redirect: 'error', signal: controller.signal, headers: { Accept: 'application/json' },
          });
          const body = await jwksBody(response) as { keys?: unknown };
          if (!body || !Array.isArray(body.keys) || body.keys.length < 1 || body.keys.length > 16) throw new Error();
          const keys = new Map<string, CryptoKey>();
          for (const value of body.keys) {
            if (!value || typeof value !== 'object') throw new Error();
            const key = value as JsonWebKey & { kid?: string };
            if (key.kty !== 'RSA' || (key.alg && key.alg !== 'RS256') || (key.use && key.use !== 'sig')) continue;
            if (typeof key.kid !== 'string' || key.kid.length < 1 || key.kid.length > 128 || keys.has(key.kid) ||
              typeof key.n !== 'string' || typeof key.e !== 'string' || key.d || key.p || key.q) throw new Error();
            const modulus = decode(key.n);
            if (modulus.byteLength < 256 || modulus.byteLength > 512 || key.e !== 'AQAB') throw new Error();
            keys.set(key.kid, await crypto.subtle.importKey('jwk', key,
              { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']));
          }
          if (!keys.size) throw new Error();
          return keys;
        })();
        return await Promise.race([operation, new Promise<never>((_, reject) => {
          timer = setTimeout(() => { controller.abort(); reject(new Error()); }, TIMEOUT_MS);
        })]);
      } catch {
        entry.expires = now() + FAILURE_CACHE_MS;
        return null;
      } finally { if (timer !== undefined) clearTimeout(timer); controller.abort(); }
    })();
    return entry.keys;
  }

  return async (request, env, platformAccess) => {
    try {
      const issuer = issuerFor(env.ACCESS_TEAM_DOMAIN);
      const audience = env.ACCESS_AUD;
      const subjects = allowlist(env.ACCESS_ALLOWED_SUBJECTS);
      const emails = new Set([...allowlist(env.ACCESS_ALLOWED_EMAILS)].map(email => email.toLowerCase()));
      if (!issuer || !audience || audience.length > 256 || (!subjects.size && !emails.size)) return null;
      if (platformAccess) {
        // Only the runtime's third fetch argument supplies this capability. Never trust a request/env field.
        if (platformAccess.aud !== audience || typeof platformAccess.getIdentity !== 'function') return null;
        const identity = await platformAccess.getIdentity();
        if (!identity || typeof identity !== 'object' || Array.isArray(identity)) return null;
        const value = identity as Record<string, unknown>;
        const subject = value.user_uuid ?? value.id;
        const email = typeof value.email === 'string' && value.email.length <= 256 ? value.email : undefined;
        if (typeof subject !== 'string' || !subject.length || subject.length > 256 ||
          (!subjects.has(subject) && !(email && emails.has(email.toLowerCase())))) return null;
        return { subject, ...(email ? { email } : {}) };
      }
      const token = request.headers.get('Cf-Access-Jwt-Assertion');
      if (!token || token.length > MAX_TOKEN_BYTES) return null;
      const segments = token.split('.');
      if (segments.length !== 3) return null;
      const header = parse(segments[0]);
      const claims = parse(segments[1]);
      if (header.alg !== 'RS256' || typeof header.kid !== 'string' || header.kid.length < 1 || header.kid.length > 128 ||
        header.crit !== undefined || (header.typ !== undefined && header.typ !== 'JWT')) return null;
      const time = Math.floor(now() / 1000);
      if (claims.iss !== issuer || !Number.isSafeInteger(claims.exp) || (claims.exp as number) <= time ||
        (claims.nbf !== undefined && (!Number.isSafeInteger(claims.nbf) || (claims.nbf as number) > time))) return null;
      const aud = typeof claims.aud === 'string' ? [claims.aud] : claims.aud;
      if (!Array.isArray(aud) || !aud.length || aud.some(value => typeof value !== 'string') || !aud.includes(audience)) return null;
      if (typeof claims.sub !== 'string' || claims.sub.length < 1 || claims.sub.length > 256) return null;
      const email = typeof claims.email === 'string' && claims.email.length <= 256 ? claims.email : undefined;
      if (!subjects.has(claims.sub) && !(email && emails.has(email.toLowerCase()))) return null;
      const signature = decode(segments[2]);
      const keys = await keysFor(issuer);
      const key = keys?.get(header.kid);
      if (!key || !await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, signature,
        new TextEncoder().encode(`${segments[0]}.${segments[1]}`))) return null;
      // Key retrieval and crypto are asynchronous: initial validity is not completion validity.
      const verifiedTime = Math.floor(now() / 1000);
      if ((claims.exp as number) <= verifiedTime || (claims.nbf !== undefined && (claims.nbf as number) > verifiedTime)) return null;
      return { subject: claims.sub, ...(email ? { email } : {}) };
    } catch { return null; }
  };
}

// No PIN, cookie trust, development flag, or production bypass.
export const verifyAccess = createAccessVerifier();
