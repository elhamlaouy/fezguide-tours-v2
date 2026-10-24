import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm, cp, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), 'cms-identity-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  for (const dir of ['src/cms', 'worker', 'dist/assets']) await mkdir(join(root, dir), { recursive: true });
  for (const [path, body] of Object.entries({ 'src/cms/schema.ts': 'predicate', 'src/main.ts': 'renderer', 'worker/index.ts': 'worker', 'package.json': '{}', 'package-lock.json': '{}', 'vite.config.ts': 'config', 'tsconfig.json': '{}', 'index.html': '<html/>', 'dist/index.html': '<html/>', 'dist/assets/body.bin': 'asset' })) await writeFile(join(root, path), body);
  return root;
}
test('rejects symlink roots before traversing inputs', async t => {
  const { computeReleaseIdentity } = await import('../scripts/cms-release-identity.mjs');
  const root = await fixture(t);
  const link = `${root}-link`;
  t.after(() => rm(link, { force: true }));
  await symlink(root, link);
  await assert.rejects(computeReleaseIdentity(link), /Symlink/);
});
test('rejects missing builds, indexes, required sources and nested symlinks', async t => {
  const { computeReleaseIdentity } = await import('../scripts/cms-release-identity.mjs');
  for (const missing of ['dist', 'dist/index.html', 'dist/assets', 'src/cms/schema.ts', 'worker/index.ts', 'package-lock.json']) {
    const root = await fixture(t);
    await rm(join(root, missing), { recursive: true });
    await assert.rejects(computeReleaseIdentity(root));
  }
  for (const target of ['dist/assets/link', 'src/link', 'worker/link']) {
    const root = await fixture(t);
    await symlink(join(root, 'index.html'), join(root, target));
    await assert.rejects(computeReleaseIdentity(root), /Symlink/);
  }
});
test('stable identities bind policy, renderer and complete asset bodies across relocation', async t => {
  const { computeReleaseIdentity } = await import('../scripts/cms-release-identity.mjs');
  const root = await fixture(t);
  const first = await computeReleaseIdentity(root);
  assert.deepEqual(await computeReleaseIdentity(root), first);
  assert.equal(first.CMS_VALIDATION_POLICY, createHash('sha256').update('predicate').digest('hex'));
  assert.equal(first.assets.files, 2);
  assert.equal(first.CMS_SHELL_ID, createHash('sha256').update('<html/>').digest('hex'));
  assert.notEqual(first.CMS_ASSET_ID, first.CMS_SHELL_ID);
  const relocated = await fixture(t);
  await cp(root, relocated, { recursive: true });
  assert.deepEqual(await computeReleaseIdentity(relocated), first);
  await writeFile(join(root, 'src/main.ts'), 'new renderer');
  assert.notEqual((await computeReleaseIdentity(root)).CMS_RENDERER_ID, first.CMS_RENDERER_ID);
  await writeFile(join(root, 'src/cms/schema.ts'), 'new predicate');
  assert.notEqual((await computeReleaseIdentity(root)).CMS_VALIDATION_POLICY, first.CMS_VALIDATION_POLICY);
  await writeFile(join(root, 'dist/assets/body.bin'), 'changed asset');
  assert.notEqual((await computeReleaseIdentity(root)).CMS_ASSET_ID, first.CMS_ASSET_ID);
  assert.equal((await computeReleaseIdentity(root)).CMS_SHELL_ID, first.CMS_SHELL_ID);
  await writeFile(join(root, 'dist/index.html'), '<html>changed shell</html>');
  assert.notEqual((await computeReleaseIdentity(root)).CMS_SHELL_ID, first.CMS_SHELL_ID);
});
