import test from 'node:test';
import assert from 'node:assert/strict';
import { register } from 'tsx/esm/api';
register();
const { Window } = await import('happy-dom');
const { createElement: h } = await import('react');
const { renderToStaticMarkup } = await import('react-dom/server');
const { CmsPreviewProvider } = await import('../src/context/CmsContext.tsx');
const { ApprovedContentProvider } = await import('../src/cms/approved-content.tsx');
const { EditorialArticlePage } = await import('../src/components/EditorialArticlePage.tsx');
const { approvedEditorial } = await import('../src/cms/approved-data.ts');
const { createCmsSeed } = await import('../src/cms/seed.ts');
const window = new Window();
const id = 'food-tasting-walk';
const copy = value => ({ en: value, fr: value, es: value });
function fixture() {
  const document = createCmsSeed(), page = document.pages.find(page => page.id === id);
  page.sections.find(section => section.id === 'story-1').blocks = [{ type: 'paragraph', text: copy('FIRST STORY MARKER') }];
  page.sections.find(section => section.id === 'photos-1').images[0].alt = copy('FIRST PHOTO MARKER');
  return { document, page };
}
function render({ document, page }) {
  const host = window.document.createElement('div');
  // Only escaped React SSR markup from the local in-memory fixture enters this detached DOM.
  host.innerHTML = renderToStaticMarkup(h(CmsPreviewProvider, { document }, h(ApprovedContentProvider, { document, page, language: 'en' }, h(EditorialArticlePage, {
    article: approvedEditorial(document, page), language: 'en', onBack() {}, onNavigate() {}, onOpenProduct() {},
  }))));
  return host;
}
test('deleting the story retains its enabled standalone gallery with its actual identity', () => {
  const data = fixture();
  data.page.sections = data.page.sections.filter(section => section.id !== 'story-1');
  const host = render(data);
  assert.ok(host.querySelector('[data-section-id="photos-1"] img[alt="FIRST PHOTO MARKER"]'));
  assert.equal(host.querySelector('[data-section-id="story-1"]'), null);
  assert.ok(!host.textContent.includes('FIRST STORY MARKER'));
  assert.ok(host.querySelector('[data-section-id="story-2"]'));
});
test('paired groups and photos before their story follow the enabled CMS order', () => {
  const data = fixture();
  const ids = ['photos-2', 'story-2', 'photos-1', 'story-1'];
  const selected = ids.map(id => data.page.sections.find(section => section.id === id));
  data.page.sections = [...selected, ...data.page.sections.filter(section => !ids.includes(section.id))];
  const host = render(data);
  assert.deepEqual([...host.querySelectorAll('[data-section-id]')].map(node => node.dataset.sectionId).filter(id => ids.includes(id)), ids);
});
test('story and photos independently obey deletion and enabled states without resurrection', () => {
  for (const storyState of ['enabled', 'disabled', 'deleted']) for (const photoState of ['enabled', 'disabled', 'deleted']) {
    const data = fixture();
    for (const [id, state] of [['story-1', storyState], ['photos-1', photoState]]) {
      if (state === 'deleted') data.page.sections = data.page.sections.filter(section => section.id !== id);
      else data.page.sections.find(section => section.id === id).enabled = state === 'enabled';
    }
    const host = render(data), label = `${storyState}/${photoState}`;
    assert.equal(host.textContent.includes('FIRST STORY MARKER'), storyState === 'enabled', label);
    assert.equal(Boolean(host.querySelector('img[alt="FIRST PHOTO MARKER"]')), photoState === 'enabled', label);
    assert.equal(Boolean(host.querySelector('[data-section-id="story-1"]')), storyState === 'enabled', label);
    assert.equal(Boolean(host.querySelector('[data-section-id="photos-1"]')), photoState === 'enabled', label);
    assert.ok(host.querySelector('[data-section-id="story-2"]'), label);
  }
});
test('explicit blank story copy and empty photos stay blank', () => {
  const data = fixture();
  const story = data.page.sections.find(section => section.id === 'story-1');
  story.title = copy(''); story.blocks = [];
  data.page.sections.find(section => section.id === 'photos-1').images = [];
  const host = render(data), slot = host.querySelector('[data-section-id="story-1"]');
  assert.equal(slot.textContent.trim(), '');
  assert.equal(slot.querySelector('img'), null);
  assert.equal(host.querySelector('img[alt="FIRST PHOTO MARKER"]'), null);
});
test.after(() => window.happyDOM.abort());
