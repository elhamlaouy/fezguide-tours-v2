import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const root = new URL('../', import.meta.url);
const markers = ['WORKERS_CI', 'WORKERS_CI_BUILD_UUID', 'WORKERS_CI_BRANCH', 'WORKERS_CI_COMMIT_SHA'];
function run(values = {}) {
  const env = { ...process.env };
  for (const key of markers) delete env[key];
  return spawnSync(process.execPath, ['scripts/cms-candidate-build-guard.mjs'], {
    cwd: root, env: { ...env, ...values }, encoding: 'utf8', timeout: 10000,
  });
}

test('candidate build guard runs before every inherited build step', () => {
  const pkg = JSON.parse(readFileSync(new URL('package.json', root), 'utf8'));
  assert.match(pkg.scripts.prebuild, /^node scripts\/cms-candidate-build-guard\.mjs && /);
});

test('local and independent GitHub CI verification remain available', () => {
  for (const values of [{}, { CI: 'true', GITHUB_ACTIONS: 'true' }]) {
    const result = run(values);
    assert.equal(result.status, 0, result.stderr);
  }
});

for (const marker of markers) test(`inherited Workers Builds is refused when ${marker} is present`, () => {
  const result = run({ [marker]: 'fixture' });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /isolated candidate/i);
  assert.match(result.stderr, /no deployment/i);
});
