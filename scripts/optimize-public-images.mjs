// Reproducible derivatives only. Original photos and CMS references remain untouched.
import sharp from 'sharp';
import { readdir, readFile, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
const root = path.resolve(import.meta.dirname, '..');
const images = path.join(root, 'public/images');
const output = path.join(images, 'optimized');
await mkdir(output, { recursive: true });
async function files(directory) {
  const result = [];
  for (const item of await readdir(directory, { withFileTypes: true })) {
    const name = path.join(directory, item.name);
    if (item.isDirectory() && item.name !== 'optimized') result.push(...await files(name));
    else if (item.isFile() && /\.(jpe?g|png|webp)$/i.test(name)) result.push(name);
  }
  return result;
}
// Keep generation serial and memory bounded on the preview host. Never prune older hashes.
sharp.concurrency(1);
sharp.cache(false);
const manifest = {};
const byHash = new Map();
const artifacts = new Map();
let before = 0;
for (const source of (await files(images)).sort()) {
  const original = await readFile(source);
  const sourceHash = createHash('sha256').update(original).digest('hex');
  let entry = byHash.get(sourceHash);
  if (!entry) {
    const metadata = await sharp(original).metadata();
    const { width, height } = metadata.autoOrient;
    const candidates = [];
    for (const target of [...new Set([320, 480, 640, 800, 1200, 1600, width].filter(size => size <= width))].sort((a, b) => a - b)) {
      const { data, info } = await sharp(original).rotate().resize({ width: target, withoutEnlargement: true }).webp({ quality: 78, effort: 5 }).toBuffer({ resolveWithObject: true });
      if (target === width && data.length >= original.length) {
        candidates.push({ src: '/images/' + path.relative(images, source).split(path.sep).join('/'), width: info.width });
        continue;
      }
      const name = createHash('sha256').update(data).digest('hex').slice(0, 20) + '.webp';
      await writeFile(path.join(output, name), data);
      candidates.push({ src: '/images/optimized/' + name, width: info.width });
      artifacts.set(name, data.length);
    }
    entry = { width, height, sourceHash, candidates };
    byHash.set(sourceHash, entry);
  }
  manifest['/images/' + path.relative(images, source).split(path.sep).join('/')] = entry;
  before += original.length;
}
await writeFile(path.join(root, 'src/cms/optimized-images.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(JSON.stringify({ sources: Object.keys(manifest).length, uniqueSources: byHash.size, derivatives: artifacts.size, originalBytes: before, derivativeBytes: [...artifacts.values()].reduce((sum, bytes) => sum + bytes, 0), originalsChanged: false, deleted: [] }));
