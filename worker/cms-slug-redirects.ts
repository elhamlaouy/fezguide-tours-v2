/** Trusted deployment configuration, never accepted from an editor request. */
export function slugRedirects(raw?: string): Readonly<Record<string, string>> {
  if (!raw) return Object.freeze({});
  if (raw.length > 16_000) throw new Error('Oversized slug redirects');
  const aliases: unknown = JSON.parse(raw);
  if (!aliases || typeof aliases !== 'object' || Array.isArray(aliases) || Object.keys(aliases).length > 100 ||
      Object.entries(aliases).some(([from, to]) => !/^[a-z0-9][a-z0-9-]{0,79}$/.test(from) || typeof to !== 'string' || !/^[a-z0-9][a-z0-9-]{0,79}$/.test(to))) throw new Error('Invalid slug redirects');
  return Object.freeze(Object.fromEntries(Object.entries(aliases).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0))) as Readonly<Record<string, string>>;
}

let cached: { signature: string; identity: Promise<string> } | undefined;
/** Pin route configuration in the existing renderer identity; no document/plan read on visitors. */
export async function redirectRendererId(renderer: string, raw?: string): Promise<string> {
  const aliases = slugRedirects(raw);
  if (!Object.keys(aliases).length) return renderer;
  const signature = JSON.stringify(['cms-slug-redirects-v1', renderer, aliases]);
  if (cached?.signature === signature) return cached.identity;
  const identity = crypto.subtle.digest('SHA-256', new TextEncoder().encode(signature)).then(bytes =>
    `redirects-v1:${Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, '0')).join('')}`);
  // ponytail: one server-config entry per isolate, never an unbounded request-key cache.
  cached = { signature, identity };
  return identity;
}
