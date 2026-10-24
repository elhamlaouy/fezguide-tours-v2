import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { computeReleaseIdentity } from '../../scripts/cms-release-identity.mjs';

const root = new URL('../../', import.meta.url);
const parse = file => JSON.parse(execFileSync('python3', ['-c', 'import json,sys,tomllib; print(json.dumps(tomllib.load(open(sys.argv[1],"rb"))))', fileURLToPath(new URL(file, root))], { encoding: 'utf8' }));

// Runs after Vite via npm postbuild, never in the generic prebuild test glob.
test('candidate release evidence and both configs match actual source and built artifacts', async () => {
  const actual = await computeReleaseIdentity(fileURLToPath(root));
  const recorded = JSON.parse(readFileSync(new URL('docs/evidence/cms-completion-20261024/final-release-identity.json', root)));
  assert.deepEqual(actual, recorded, 'release evidence must match current source and dist');
  execFileSync(process.execPath, ['--test', '--test-name-pattern=actual release-derived', 'tests/cms-publication-prepare.test.mjs'], {cwd:fileURLToPath(root),env:{...process.env,CMS_ACTUAL_RELEASE_TEST:'1'},stdio:'pipe'});
  for (const file of ['wrangler.cms-candidate-app.toml', 'wrangler.cms-candidate-public.toml']) {
    const config = parse(file);
    for (const key of ['CMS_VALIDATION_POLICY', 'CMS_RENDERER_ID', 'CMS_ASSET_ID', 'CMS_SHELL_ID']) {
      assert.match(actual[key], /^[a-f0-9]{64}$/);
      assert.notEqual(actual[key], '0'.repeat(64), key);
      assert.equal(config.vars[key], actual[key], `${file} ${key}`);
    }
  }
});
