import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { lstat, readdir } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';

const digest = value => createHash('sha256').update(value).digest('hex');

// Only these source trees and build inputs enter the renderer contract.
const buildInputs = ['package.json', 'package-lock.json', 'vite.config.ts', 'tsconfig.json', 'index.html'];
async function fileEntry(root, path) {
  const hash = createHash('sha256');
  let bytes = 0;
  for await (const chunk of createReadStream(join(root, path))) { hash.update(chunk); bytes += chunk.length; }
  return { path, sha256: hash.digest('hex'), bytes };
}
async function manifest(root, paths) {
  const entries = [];
  async function visit(path) {
    const stat = await lstat(join(root, path));
    if (stat.isSymbolicLink()) throw new Error(`Symlink input rejected: ${path || '.'}`);
    if (stat.isDirectory()) {
      for (const name of (await readdir(join(root, path))).sort()) {
        if (name.startsWith('.') || name === 'node_modules') throw new Error(`Unexpected input directory entry: ${path}/${name}`);
        await visit(path ? `${path}/${name}` : name);
      }
    } else if (stat.isFile()) entries.push(await fileEntry(root, path));
    else throw new Error(`Non-regular input rejected: ${path}`);
  }
  for (const path of paths) await visit(path);
  entries.sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
  return entries;
}
function summary(entries) {
  return { files: entries.length, bytes: entries.reduce((sum, entry) => sum + entry.bytes, 0) };
}
function identity(entries) {
  // Version 1: UTF-8 JSON array of [POSIX-relative path, lowercase SHA256].
  return digest(JSON.stringify(entries.map(({ path, sha256 }) => [path, sha256])));
}
export async function computeReleaseIdentity(root = process.cwd()) {
  root = resolve(root);
  if ((await lstat(root)).isSymbolicLink()) throw new Error('Symlink root rejected');
  const sources = await manifest(root, ['src', 'worker', ...buildInputs]);
  const assets = await manifest(root, ['dist']);
  const policy = sources.find(entry => entry.path === 'src/cms/schema.ts');
  if (!policy || !sources.some(entry => entry.path === 'worker/index.ts') || !sources.some(entry => entry.path.startsWith('src/') && entry.path !== policy.path)) throw new Error('Incomplete source inputs');
  if (!assets.some(entry => entry.path === 'dist/index.html' && entry.bytes > 0)) throw new Error('Missing or empty dist/index.html');
  if (!assets.some(entry => entry.path.startsWith('dist/assets/') && entry.bytes > 0)) throw new Error('Incomplete build: missing dist/assets content');
  return { contract: 'cms-release-identity-v1', CMS_VALIDATION_POLICY: policy.sha256, CMS_RENDERER_ID: identity(sources), CMS_ASSET_ID: identity(assets), CMS_SHELL_ID: assets.find(entry => entry.path === 'dist/index.html').sha256, renderer: summary(sources), assets: summary(assets) };
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    if (process.argv.length !== 2) throw new Error('Usage: node scripts/cms-release-identity.mjs (from project root)');
    console.log(JSON.stringify(await computeReleaseIdentity(), null, 2));
  } catch (error) {
    // Avoid leaking absolute filesystem paths from native filesystem errors.
    console.log(JSON.stringify({ error: error.code ? `Input read failed (${error.code})` : error.message }));
    process.exitCode = 1;
  }
}
