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
const manifest = {};
let before = 0, after = 0;
for (const source of (await files(images)).sort()) {
  const original = await readFile(source);
  const converted = await sharp(original).rotate().resize({ width: 1600, withoutEnlargement: true }).webp({ quality: 78, effort: 5 }).toBuffer();
  if (converted.length >= original.length) continue;
  const name = createHash('sha256').update(converted).digest('hex').slice(0, 20) + '.webp';
  await writeFile(path.join(output, name), converted);
  manifest['/images/' + path.relative(images, source).split(path.sep).join('/')] = '/images/optimized/' + name;
  before += original.length; after += converted.length;
}
await writeFile(path.join(root, 'src/cms/optimized-images.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(JSON.stringify({ derivatives: Object.keys(manifest).length, originalBytes: before, derivativeBytes: after, originalsChanged: false }));
