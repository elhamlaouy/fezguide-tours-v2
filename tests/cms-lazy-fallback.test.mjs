import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { registerHooks } from 'node:module';
import { register } from 'tsx/esm/api';
import { build } from 'esbuild';
register();
registerHooks({ load(url, context, next) { return url.endsWith('.css') ? { format: 'module', source: 'export default "";', shortCircuit: true } : next(url, context); } });

// This is an import-graph contract, not a Lighthouse score or transfer-size claim.
test('public startup excludes legacy-only catalogs without deleting the source fallback', async () => {
  const result = await build({ absWorkingDir: fileURLToPath(new URL('../', import.meta.url)), entryPoints: ['src/main.tsx'], bundle: true, write: false, metafile: true, minify: true, platform: 'browser', format: 'esm', splitting: true, outdir: 'unused-import-graph', loader: { '.css': 'empty' }, define: { 'process.env.NODE_ENV': '"production"' }, logLevel: 'silent' });
  const outputs = result.metafile.outputs;
  const visited = new Set();
  function walk(key) {
    if (visited.has(key) || !outputs[key]) return;
    visited.add(key);
    for (const item of outputs[key].imports) if (item.kind === 'import-statement') walk(item.path);
  }
  walk(Object.keys(outputs).find(key => outputs[key].entryPoint === 'src/main.tsx'));
  const startup = new Set([...visited].flatMap(key => Object.keys(outputs[key].inputs)));
  for (const file of ['src/data/translations.ts', 'src/data/experienceDetails.ts', 'src/context/legacy-public-data.ts']) {
    assert.equal(startup.has(file), false, `${file} should load only when source fallback is needed`);
    assert.ok(Object.values(outputs).some(output => file in output.inputs), `${file} remains available in a lazy chunk`);
  }
});


test('lazy source fallback preserves original tours and protected contacts for missing invalid and failed documents', async () => {
  const { Window } = await import('happy-dom');
  const window = new Window({ url: 'https://example.test/es/' });
  for (const [key, value] of Object.entries({ window, document: window.document, navigator: window.navigator })) Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const { createElement, act } = await import('react');
  const { createRoot } = await import('react-dom/client');
  const { CmsProvider, useCms } = await import('../src/context/CmsContext.tsx');
  const { createCmsSeed } = await import('../src/cms/seed.ts');
  const { DEFAULT_SITE_SETTINGS } = await import('../src/data/shared-ui.ts');
  const originalFetch = globalThis.fetch;
  try {
    for (const mode of ['missing', 'invalid', 'failed', 'valid-api', 'valid-snapshot']) {
      document.body.innerHTML = '<div id="host"></div>';
      const seed = createCmsSeed();
      if (mode === 'valid-snapshot') {
        const embedded = document.createElement('script'); embedded.id = 'cms-published-document'; embedded.type = 'application/json'; embedded.textContent = JSON.stringify(seed); document.body.append(embedded);
      }
      const requested = [];
      globalThis.fetch = async input => {
        requested.push(String(input));
        if (String(input) === '/api/cms/document') {
          if (mode === 'failed') throw new Error('Synthetic unavailable API');
          return Response.json({ document: mode === 'valid-api' ? seed : mode === 'invalid' ? { schemaVersion: 0 } : null });
        }
        return Response.json({ siteSettings: { phoneNumber: 'UNTRUSTED', whatsappNumber: 'UNTRUSTED', email: 'untrusted@example.test', googleMaps: 'https://untrusted.example.test' } });
      };
      let value;
      function Probe() { value = useCms(); return createElement('output', null, value.publishedDocument ? 'published' : value.tours.map(tour => tour.title.es).join('|')); }
      const root = createRoot(document.getElementById('host'));
      try {
        await act(async () => { root.render(createElement(CmsProvider, null, createElement(Probe))); await new Promise(resolve => setTimeout(resolve, 20)); });
        for (let retry = 0; retry < 100 && !(value?.publishedDocument || value?.tours.length); retry++) await act(async () => { await new Promise(resolve => setTimeout(resolve, 10)); });
        if (mode.startsWith('valid')) {
          assert.deepEqual(value.publishedDocument, seed);
          assert.ok(!requested.includes('/api/cms'), 'valid document does not request compatibility content');
          if (mode === 'valid-snapshot') assert.deepEqual(requested, [], 'valid HTML snapshot needs no public API request');
        } else {
          assert.equal(value.publishedDocument, null);
          assert.ok(value.tours.length >= 16, mode + ': original source tours remain usable');
          assert.ok(value.tours.every(tour => typeof tour.title.es === 'string' && tour.title.es.length));
          for (const key of ['phoneNumber', 'whatsappNumber', 'email', 'googleMaps']) assert.equal(value.siteSettings[key], DEFAULT_SITE_SETTINGS[key], 'source fallback protects ' + key);
          assert.ok(requested.includes('/api/cms'));
        }
      } finally { await act(async () => root.unmount()); }
    }
  } finally { globalThis.fetch = originalFetch; window.happyDOM.abort(); }
});
