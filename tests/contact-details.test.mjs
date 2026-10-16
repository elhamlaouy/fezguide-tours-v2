import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const phone = '212719603009';
const email = 'fezguidetours1@gmail.com';
const googleMaps = 'https://maps.app.goo.gl/5aXiAV7FjS1W3qBj6';

test('contact defaults and generator use the approved phone, email, and Google Maps URL', () => {
  for (const path of ['src/data/translations.ts', 'scripts/generate_translations.py']) {
    const source = read(path);
    assert.match(source, new RegExp(phone));
    assert.match(source, new RegExp(email.replace('.', '\\.')));
    assert.ok(source.includes(googleMaps));
    assert.ok(!source.includes('212661234567'));
    assert.ok(!source.includes('contact@fezguidetours.com'));
  }
});

test('no source fallback can restore the old phone number', () => {
  const root = fileURLToPath(new URL('../src', import.meta.url));
  const files = [];
  const visit = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) visit(path);
      else if (/\.(ts|tsx)$/.test(entry.name)) files.push(path);
    }
  };
  visit(root);
  for (const path of files) assert.ok(!readFileSync(path, 'utf8').includes('212661234567'), path);
});

test('CMS data cannot restore stale public contact details', () => {
  const context = read('src/context/CmsContext.tsx');
  assert.ok(context.includes('phoneNumber: DEFAULT_SITE_SETTINGS.phoneNumber'));
  assert.ok(context.includes('whatsappNumber: DEFAULT_SITE_SETTINGS.whatsappNumber'));
  assert.ok(context.includes('email: DEFAULT_SITE_SETTINGS.email'));
  assert.ok(context.includes('googleMaps: DEFAULT_SITE_SETTINGS.googleMaps'));
});

test('footer exposes clickable email and Google Maps contact links', () => {
  const footer = read('src/components/Footer.tsx');
  assert.ok(footer.includes('const contact = cms?.siteSettings ?? siteSettings'));
  assert.ok(footer.includes('href={`mailto:${contact.email}`}'));
  assert.ok(footer.includes('href={contact.googleMaps}'));
  assert.match(footer, /target="_blank"/);
  assert.match(footer, /rel="noopener noreferrer"/);
});
