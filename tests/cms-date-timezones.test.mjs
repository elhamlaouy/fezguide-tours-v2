import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const probe = `
  import assert from 'node:assert/strict';
  import { createCmsSeed } from './src/cms/seed.ts';
  import { validateCmsDocument } from './src/cms/schema.ts';
  const document = createCmsSeed();
  const original = validateCmsDocument(document);
  assert.equal(original.valid, true, JSON.stringify(original.errors));
  for (const date of ['September 20, 2025', 'February 29, 2024', '2000-02-29', '2026-10-16T23:59:59.999Z']) {
    document.reviews[0].date = date;
    const result = validateCmsDocument(document);
    assert.equal(result.valid, true, date + ': ' + JSON.stringify(result.errors));
  }
  for (const date of ['February 29, 2025', 'February 29, 1900', 'June 31, 2026', 'Smarch 1, 2026', '2026-02-30', '2026-10-16T25:00:00Z']) {
    document.reviews[0].date = date;
    assert.equal(validateCmsDocument(document).valid, false, date);
  }
`;

for (const timezone of ['UTC', 'Africa/Casablanca', 'Europe/Madrid', 'America/New_York', 'Asia/Tokyo']) {
  test(`approved CMS dates validate independently of timezone: ${timezone}`, () => {
    const result = spawnSync(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', probe], {
      cwd: root, env: { ...process.env, TZ: timezone }, encoding: 'utf8', timeout: 30_000,
    });
    assert.equal(result.error, undefined);
    assert.equal(result.status, 0, result.stderr || result.stdout);
  });
}
