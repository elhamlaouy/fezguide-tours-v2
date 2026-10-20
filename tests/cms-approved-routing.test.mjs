import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { register } from 'tsx/esm/api';
register();
registerHooks({ load(url, context, next) { return url.endsWith('.css') ? {format:'module',source:'export default ""',shortCircuit:true} : next(url,context); } });
const React = await import('react');
const { renderToStaticMarkup } = await import('react-dom/server');
const { createCmsSeed } = await import('../src/cms/seed.ts');
const { CmsPreviewProvider } = await import('../src/context/CmsContext.tsx');
const { PageRenderer } = await import('../src/cms/PageRenderer.tsx');
await (await import('../src/cms/ApprovedPageRenderer.tsx')).preloadApprovedLayouts();
const noop = () => {};
function render(document, id) {
  return renderToStaticMarkup(React.createElement(CmsPreviewProvider, {document}, React.createElement(PageRenderer, {document,page:document.pages.find(p=>p.id===id),language:'en',onNavigate:noop,onBook:noop})));
}
test('published CMS Medina tour keeps the approved gallery, breadcrumbs and booking sidebar', () => {
  const html=render(createCmsSeed(),'our-fez-tours');
  assert.match(html,/our-fez-tour-gallery/);
  assert.match(html,/our-fez-tour-booking/);
  assert.match(html,/lg:col-span-8/);
  assert.match(html,/lg:col-span-4 lg:sticky/);
  assert.match(html,/Back to list/);
  assert.doesNotMatch(html,/class="cms-page cms-kind-product"/);
});
test('canonical CMS data populates the approved category and featured cards without legacy collections', () => {
  const document=createCmsSeed();
  document.legacy.tours=[];
  const html=render(document,'home');
  assert.match(html,/Chefchaouen Day Trip from Fez/);
  assert.match(html,/Meknes, Volubilis/);
  assert.match(html,/View All Tours/);
});

test('authored category labels survive generic-seed omissions and explicit blank overrides stay blank', () => {
  const document=createCmsSeed();
  for(const [id,label] of [['fez','Living Heritage Gallery'],['day-trips','Scenic Landscapes &amp; Heritage'],['food-tours','Authentic Food Gallery'],['travel-tips','Visual Guide to Fez']]) {
    assert.ok(render(document,id).includes(label),id);
    const gallery=document.pages.find(p=>p.id===id).sections.find(s=>s.id==='gallery');
    gallery.eyebrow={en:'',fr:'',es:''};
    assert.equal(render(document,id).includes(label),false,id);
  }
  const gallery=document.pages.find(p=>p.id==='fez').sections.find(s=>s.id==='gallery');
  gallery.description={en:'',fr:'',es:''};
  assert.equal(render(document,'fez').includes('Authentic photos of craftsman workshops, gates, and quiet corners.'),false);
});

test('original product section headings replace generic seed labels without overwriting owner edits', () => {
  const document=createCmsSeed();
  const page=document.pages.find(p=>p.id==='daytrip-chefchaouen');
  assert.match(render(document,page.id),/The Living Story Behind the Experience/);
  assert.match(render(document,page.id),/What is Included &amp; Excluded/);
  page.sections.find(s=>s.id==='overview').title={en:'OWNER OVERVIEW',fr:'',es:''};
  page.sections.find(s=>s.id==='included').title={en:'OWNER INCLUSIONS',fr:'',es:''};
  const edited=render(document,page.id);
  assert.match(edited,/OWNER OVERVIEW/);assert.match(edited,/OWNER INCLUSIONS/);
});

test('direct blog reader retains its original blog background with one primary heading and reader-only edit markers', () => {
  const document=createCmsSeed(),post=document.blogPosts[0];
  const html=render(document,post.id);
  assert.match(html,/Fez Travel Stories, Heritage &amp; Guides/);
  assert.match(html,/role="dialog"/);
  assert.equal((html.match(/<h1\b/g)||[]).length,1);
  assert.deepEqual([...html.matchAll(/data-section-id="([^"]+)"/g)].map(m=>m[1]),['cover','content']);
});
