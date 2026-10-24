import test from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';
import { register as registerTsx } from 'tsx/esm/api';

const loaderDirectory = mkdtempSync(join(tmpdir(), 'cms-admin-loader-'));
const loaderPath = join(loaderDirectory, 'css-loader.mjs');
process.once('exit', () => rmSync(loaderDirectory, { recursive: true, force: true }));
writeFileSync(loaderPath, `export async function load(url, context, nextLoad) {
  if (url.endsWith('.css')) return { format: 'module', source: 'export default {};', shortCircuit: true };
  return nextLoad(url, context);
}
`);
registerTsx();
register(pathToFileURL(loaderPath));

const { Window } = await import('happy-dom');
let window = new Window({ url: 'https://fez.example/admin', settings: { enableIframePageLoading: true } });
const assign = (key, value) => {
  try { globalThis[key] = value; }
  catch { Object.defineProperty(globalThis, key, { configurable: true, writable: true, value }); }
};
assign('window', window);
assign('document', window.document);
assign('navigator', window.navigator);
for (const key of Object.getOwnPropertyNames(window)) {
  if (key in globalThis) continue;
  if (typeof window[key] === 'function' && /^[A-Z]/.test(key)) assign(key, window[key]);
}
assign('getComputedStyle', window.getComputedStyle.bind(window));
assign('requestAnimationFrame', window.requestAnimationFrame.bind(window));
assign('cancelAnimationFrame', window.cancelAnimationFrame.bind(window));
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const React = await import('react');
const { createRoot } = await import('react-dom/client');
const { act, createElement } = React;
const { AdminApp } = await import('../src/admin/AdminApp.tsx');
const { validateCmsDocument } = await import('../src/cms/schema.ts');
const { StructuredFields } = await import('../src/admin/StructuredFields.tsx');
const { createCmsSeed } = await import('../src/cms/seed.ts');
await (await import('../src/cms/ApprovedPageRenderer.tsx')).preloadApprovedLayouts();
const { setEditorPath } = await import('../src/cms/editor-controls.ts');

const text = (en = '') => ({ en, fr: Array.isArray(en) ? [...en] : en, es: Array.isArray(en) ? [...en] : en });
const content = (doc, version = 2) => ({ version, draftRevision: version, publishedRevision: 1, document: doc });

let root;
let calls;
test.afterEach(async () => {
  if (root) { await act(async () => root.unmount()); root = null; }
  await window.happyDOM.close();
  // Isolate each mounted editor and its iframe lifecycle, not just its React root.
  window = new Window({ url: 'https://fez.example/admin', settings: { enableIframePageLoading: true } });
  assign('window', window); assign('document', window.document); assign('navigator', window.navigator);
  assign('getComputedStyle', window.getComputedStyle.bind(window));
  assign('requestAnimationFrame', window.requestAnimationFrame.bind(window));
  assign('cancelAnimationFrame', window.cancelAnimationFrame.bind(window));
});
test.after(async () => {
  await window.happyDOM.close();
});
function installFetch(handler) {
  calls = [];
  const fetchMock = async (input, init = {}) => {
    const url = String(input);
    const method = init.method ?? 'GET';
    const body = typeof init.body === 'string' ? JSON.parse(init.body) : init.body;
    calls.push({ url, method, body, credentials: init.credentials });
    const result = await handler({ url, method, body });
    return new Response(JSON.stringify(result.body ?? {}), { status: result.status ?? 200, headers: { 'Content-Type': 'application/json' } });
  };
  assign('fetch', fetchMock);
  window.fetch = fetchMock;
}
async function settle() {
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)); });
}
async function render(language = 'en') {
  if (root) await act(async () => root.unmount());
  document.body.replaceChildren();
  const host = window.document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => { root.render(createElement(AdminApp, { language, onClose() {} })); });
  await settle();
}
async function waitFor(predicate) {
  const start = Date.now();
  while (Date.now() - start < 2000) {
    const found = predicate();
    if (found) return found;
    await settle();
  }
  throw new Error(`timed out: ${window.document.body.textContent?.slice(0, 400)}`);
}
async function typeInto(selector, value) {
  const el = await waitFor(() => window.document.querySelector(selector));
  const proto = el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
  await act(async () => {
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value);
    el.dispatchEvent(new window.Event('input', { bubbles: true }));
  });
}
async function click(selector) {
  const el = await waitFor(() => window.document.querySelector(selector));
  await act(async () => { el.click(); });
  await settle();
}
async function choose(selector, value) {
  const el = await waitFor(() => window.document.querySelector(selector));
  const proto = window.HTMLSelectElement.prototype;
  await act(async () => {
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value);
    el.dispatchEvent(new window.Event('change', { bubbles: true }));
  });
  await settle();
}
// Preview content lives in a real browsing context, not hidden duplicate editor DOM.
function previewQuery(selector) {
  const frame = document.querySelector('[data-preview] iframe');
  assert.ok(frame, 'isolated live preview iframe missing');
  assert.ok(frame.contentDocument, 'same-origin preview document missing');
  return selector ? frame.contentDocument.querySelector(selector) : frame.contentDocument.body;
}
const puts = () => calls.filter(call => call.method === 'PUT');
let tail = Promise.resolve();
const serial = (name, fn) => test(name, async () => {
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  const previous = tail;
  tail = gate;
  await previous;
  try { await fn(); }
  finally { release(); }
});

serial('optional numbers keep the input while clearing and retyping; only Remove unsets', async () => {
 const doc=createCmsSeed(); let latest;
 function Harness() {
  const [value,setValue]=React.useState(170); latest=value;
  return createElement(StructuredFields,{spec:{type:'number',optional:true,min:0,max:1000000},value,path:'priceEUR',document:doc,language:'en',locale:'en',onChange:setValue});
 }
 if(root) await act(async()=>root.unmount()); document.body.replaceChildren();
 const host=document.createElement('div');document.body.append(host);root=createRoot(host);
 await act(async()=>root.render(createElement(Harness)));
 await typeInto('[data-path="priceEUR"]','');
 assert.ok(document.querySelector('[data-path="priceEUR"]'),'clearing must not remove the field');
 assert.equal(latest,'');
 const invalid=structuredClone(doc);invalid.products[0].practicalInfo.priceEUR=latest;
 assert.equal(validateCmsDocument(invalid).valid,false);
 await typeInto('[data-path="priceEUR"]','203');assert.equal(latest,203);
 await click('[data-unset="priceEUR"]');assert.equal(latest,undefined);
 assert.ok(document.querySelector('[data-enable="priceEUR"]'));
 await click('[data-enable="priceEUR"]');assert.ok(document.querySelector('[data-path="priceEUR"]'));
});

serial('canonical price edits synchronise only the same currency and existing numeric price facts', async () => {
 const before=createCmsSeed(); const id='our-fez-tours';
 const page=before.pages.find(p=>p.productId===id);const rows=page.sections.find(s=>s.id==='facts').items;
 rows.push({title:text('Price (EUR)'),description:text('170 EUR')});
 rows.push({title:text('Lunch budget'),description:text('Allow 170 EUR for lunch')});
 const snapshot=JSON.stringify(before);
 const after=setEditorPath(before,['products',id,'price','amount'],211);
 const product=after.products.find(p=>p.id===id);
 assert.equal(product.practicalInfo.priceEUR,211);
 assert.equal(product.practicalInfo.priceMAD,1900);assert.equal(product.practicalInfo.priceUSD,191);
 const facts=after.pages.find(p=>p.productId===id).sections.find(s=>s.id==='facts').items;
 assert.deepEqual(facts.at(-2).description,text('211 EUR'));
 assert.deepEqual(facts.at(-1),rows.at(-1));assert.equal(facts.length,rows.length);
 assert.deepEqual(after.products.filter(p=>p.id!==id),before.products.filter(p=>p.id!==id));
 assert.deepEqual(after.pages.filter(p=>p.productId!==id),before.pages.filter(p=>p.productId!==id));
 assert.deepEqual(after.reviews,before.reviews);assert.equal(JSON.stringify(before),snapshot);
 assert.equal(validateCmsDocument(after).valid,true);
 const noRows=createCmsSeed();const noAppend=setEditorPath(noRows,['products',id,'price','amount'],211);
 assert.deepEqual(noAppend.pages.find(p=>p.productId===id).sections.find(s=>s.id==='facts').items,noRows.pages.find(p=>p.productId===id).sections.find(s=>s.id==='facts').items);
});

serial('pre-existing same-currency conflicts are not silently normalised by an edit', async () => {
 const before=createCmsSeed();const id='our-fez-tours';before.products.find(p=>p.id===id).practicalInfo.priceEUR=203;
 const after=setEditorPath(before,['products',id,'price','amount'],211);
 assert.equal(after.products.find(p=>p.id===id).practicalInfo.priceEUR,203);
 assert.equal(before.products.find(p=>p.id===id).price.amount,170);
});

function pricingDocument() {
 const doc=createCmsSeed();
 doc.pages=doc.pages.map(page=>({...page,sections:page.kind==='product'?page.sections.filter(s=>s.id==='facts'||s.type==='cta'):[]}));
 for(const p of doc.products) p.galleryImages=[];
 doc.editorialEntries=[];doc.blogPosts=[];doc.teamMembers=[];doc.faqs=[];doc.reviews=[];
 doc.legacy={...doc.legacy,tours:[],customPages:[],blogPosts:[],teamMembers:[],faqs:[]};
 const used=new Set(doc.products.map(p=>p.image));doc.media=doc.media.filter(m=>used.has(m.src));
 assert.equal(validateCmsDocument(doc).valid,true);
 return doc;
}
serial('selected-page Pricing edits the canonical product, previews and saves one deliberate change', async () => {
 const doc=pricingDocument();let saved;
 installFetch(({url,method,body})=>method==='PUT'?(saved=body.document,{body:{version:3,draftRevision:3,published:false}}):url.endsWith('/revisions')?{body:{revisions:[]}}:{body:content(doc)});
 await render();await choose('[name="current-page"]','our-fez-tours');
 await click('[name="edit-page-pricing"]');
 assert.ok(document.querySelector('[data-price-editor="our-fez-tours"]'));
 assert.equal(document.querySelector('[name="price-amount"]').value,'170');
 assert.equal(puts().length,0);
 await typeInto('[name="price-amount"]','211');
 assert.equal(document.querySelector('[name="save-draft"]').disabled,false,'a valid price must be saveable without an extra estimate choice');
 assert.ok(previewQuery('[data-price-product-id="our-fez-tours"]').textContent.includes('211'));
 await click('[name="save-draft"]');
 assert.equal(saved.products.find(p=>p.id==='our-fez-tours').price.amount,211);
 assert.equal(saved.products.find(p=>p.id==='our-fez-tours').practicalInfo.priceEUR,211);
 assert.equal(saved.products.find(p=>p.id==='our-fez-tours').practicalInfo.priceMAD,1900);
 assert.equal(validateCmsDocument(saved).valid,true);
 assert.deepEqual(saved.products.filter(p=>p.id!=='our-fez-tours'),doc.products.filter(p=>p.id!=='our-fez-tours'));
});

serial('Pricing changes currency and basis, explicitly removes approximate equivalents', async () => {
 const doc=pricingDocument();let saved;
 installFetch(({url,method,body})=>method==='PUT'?(saved=body.document,{body:{version:3,draftRevision:3,published:false}}):url.endsWith('/revisions')?{body:{revisions:[]}}:{body:content(doc)});
 await render();await choose('[name="current-page"]','our-fez-tours');await click('[name="edit-page-pricing"]');
 await choose('[name="price-currency"]','USD');await choose('[name="price-basis"]','vehicle');await typeInto('[name="price-amount"]','225.5');
 await choose('[name="price-estimates-decision"]','remove');await click('[name="apply-price"]');
 assert.match(previewQuery('[data-price-product-id="our-fez-tours"]').textContent,/\$225.5 per vehicle/);
 await click('[name="save-draft"]');const p=saved.products.find(p=>p.id==='our-fez-tours');
 assert.deepEqual(p.price,{amount:225.5,currency:'USD',basis:'vehicle'});
 assert.equal(p.practicalInfo.priceUSD,225.5);assert.equal(p.practicalInfo.priceEUR,undefined);assert.equal(p.practicalInfo.priceMAD,undefined);
});

serial('Pricing preserves a conflict on load and requires an explicit choice of the two values', async () => {
 const doc=pricingDocument();doc.products.find(p=>p.id==='our-fez-tours').practicalInfo.priceEUR=203;let saved;
 installFetch(({url,method,body})=>method==='PUT'?(saved=body.document,{body:{version:3,draftRevision:3,published:false}}):url.endsWith('/revisions')?{body:{revisions:[]}}:{body:content(doc)});
 await render();await choose('[name="current-page"]','our-fez-tours');await click('[name="edit-page-pricing"]');
 const conflict=document.querySelector('[data-price-conflict]');assert.ok(conflict);
 assert.match(conflict.textContent,/170 EUR/);assert.match(conflict.textContent,/203 EUR/);
 assert.equal(document.querySelector('[name="price-amount"]').disabled,true);
 await click('[name="save-draft"]');assert.equal(puts().length,0);assert.equal(doc.products.find(p=>p.id==='our-fez-tours').price.amount,170);
 await click('[name="use-compat-price"]');
 await choose('[name="price-estimates-decision"]','keep');await click('[name="apply-price"]');await click('[name="save-draft"]');
 assert.equal(saved.products.find(p=>p.id==='our-fez-tours').price.amount,203);assert.equal(saved.products.find(p=>p.id==='our-fez-tours').practicalInfo.priceEUR,203);
 assert.equal(document.querySelector('[data-price-conflict]'),null);
});

serial('Pricing manual estimates stay editable while blank, validate, and apply without invented rates', async () => {
 const doc=pricingDocument();let saved;
 installFetch(({url,method,body})=>method==='PUT'?(saved=body.document,{body:{version:3,draftRevision:3,published:false}}):url.endsWith('/revisions')?{body:{revisions:[]}}:{body:content(doc)});
 await render('es');await choose('[name="current-page"]','our-fez-tours');await click('[name="edit-page-pricing"]');
 assert.equal(document.querySelector('[name="price-amount"]').closest('label').textContent,'Importe principal');
 await typeInto('[name="price-amount"]','');
 assert.equal(document.querySelector('[name="price-amount"]').getAttribute('aria-invalid'),'true');assert.ok(document.querySelector('[data-price-editor] [role="alert"]'));
 assert.equal(document.querySelector('[name="publish"]').disabled,true);assert.ok(previewQuery('[data-price-product-id="our-fez-tours"]').textContent.includes('170'));
 await typeInto('[name="price-amount"]','215');await typeInto('[name="price-estimate-MAD"]','');
 assert.ok(document.querySelector('[name="price-estimate-MAD"]'));
 await typeInto('[name="price-estimate-MAD"]','2350');await click('[data-remove-price-estimate="USD"]');
 await choose('[name="price-estimates-decision"]','updated');await click('[name="apply-price"]');await click('[name="save-draft"]');
 const p=saved.products.find(p=>p.id==='our-fez-tours');assert.equal(p.practicalInfo.priceMAD,2350);assert.equal(p.practicalInfo.priceUSD,undefined);assert.equal(p.price.amount,215);
});

serial('unapplied pricing survives workspace navigation and participates in the unsaved-change guard', async () => {
 const doc=pricingDocument();installFetch(({url})=>url.endsWith('/revisions')?{body:{revisions:[]}}:{body:content(doc)});
 await render();await choose('[name="current-page"]','our-fez-tours');await click('[name="edit-page-pricing"]');await typeInto('[name="price-amount"]','219');
 const before=new window.Event('beforeunload',{cancelable:true});window.dispatchEvent(before);assert.equal(before.defaultPrevented,true);
 await click('[data-workspace-tab="sections"]');
 assert.equal(document.querySelector('[name="save-draft"]').disabled,false,'a valid typed price is already in the draft and can be saved');
 await click('[name="edit-page-pricing"]');assert.equal(document.querySelector('[name="price-amount"]').value,'219');
 await click('[name="cancel-price"]');assert.equal(document.querySelector('[name="price-amount"]').value,'170');assert.equal(document.querySelector('[name="save-draft"]').disabled,false);
});

serial('global experience forms offer Pricing instead of independent competing price inputs', async () => {
 const doc=pricingDocument();installFetch(({url})=>url.endsWith('/revisions')?{body:{revisions:[]}}:{body:content(doc)});
 await render();await click('[data-workspace-tab="content"]');
 assert.ok(!document.querySelector('[data-path="products.0.practicalInfo.priceEUR"]'),'compatibility price must not have a competing input');
 assert.ok(!document.querySelector('[data-path="products.0.price.amount"]'),'main price must use focused editor');
 assert.ok(document.querySelector('[data-price-readonly="products.0.price"]'));
 await click('[data-open-pricing="our-fez-tours"]');assert.ok(document.querySelector('[data-price-editor="our-fez-tours"]'));
 assert.equal(document.querySelectorAll('[data-workspace-tab]').length,7);
});

serial('visible prices offer Edit price in Select mode and keep booking inert in Browse mode', async () => {
 const doc=pricingDocument();installFetch(({url})=>url.endsWith('/revisions')?{body:{revisions:[]}}:{body:content(doc)});
 await render('fr');await choose('[name="current-page"]','our-fez-tours');
 const price=previewQuery('[data-price-product-id="our-fez-tours"]');assert.ok(price,'canonical visible price must identify its product');
 const shortcut=previewQuery('[data-edit-price="our-fez-tours"]');assert.ok(shortcut);assert.equal(shortcut.textContent,'Modifier le tarif');
 await act(async()=>shortcut.click());await settle();assert.ok(document.querySelector('[data-price-editor="our-fez-tours"]'));
 await click('[name="preview-browse"]');assert.ok(!previewQuery('[data-edit-price]'));
 const booking=previewQuery('[data-action="book"]');assert.ok(booking);await act(async()=>booking.click());await settle();
 assert.equal(calls.filter(c=>c.method!=='GET').length,0);assert.ok(!document.querySelector('[role="dialog"]'));
});

serial('main-price edits do not overwrite ambiguous numeric costs or custom money paragraphs', async () => {
 const before=createCmsSeed();const page=before.pages.find(p=>p.productId==='our-fez-tours');const rows=page.sections.find(s=>s.id==='facts').items;
 rows.push({title:text('Lunch budget'),description:text('170 EUR')});
 rows.push({title:text('Price (EUR)'),description:text('Our special package costs 170 EUR including lunch')});
 const prior=structuredClone(rows);
 const after=setEditorPath(before,['products','our-fez-tours','price','amount'],221);
 assert.deepEqual(after.pages.find(p=>p.id===page.id).sections.find(s=>s.id==='facts').items,prior,'custom numeric costs and prose are independent');
});

serial('Pricing warns about independent money copy instead of replacing it', async () => {
 const doc=pricingDocument();doc.pages.find(p=>p.id==='our-fez-tours').sections.push({id:'custom-cost',type:'richText',variant:'story',enabled:true,blocks:[{type:'paragraph',text:text('Lunch costs about 170 EUR; ask us.')} ]});
 installFetch(({url})=>url.endsWith('/revisions')?{body:{revisions:[]}}:{body:content(doc)});
 await render();await choose('[name="current-page"]','our-fez-tours');await click('[name="edit-page-pricing"]');
 const warning=document.querySelector('[data-price-copy-warning]');assert.ok(warning);assert.match(warning.textContent,/independent/);assert.match(warning.textContent,/custom-cost/);
});

serial('choosing the canonical side of a conflict does not invent fact rows or overwrite custom prose', async () => {
 const doc=pricingDocument();const product=doc.products.find(p=>p.id==='our-fez-tours');product.practicalInfo.priceEUR=203;
 const page=doc.pages.find(p=>p.id===product.id);page.sections.find(s=>s.id==='facts').items.push({title:text('Price (EUR)'),description:text('Custom package 203 EUR; call us')});
 const prior=structuredClone(page.sections.find(s=>s.id==='facts').items);let saved;
 installFetch(({url,method,body})=>method==='PUT'?(saved=body.document,{body:{version:3,draftRevision:3,published:false}}):url.endsWith('/revisions')?{body:{revisions:[]}}:{body:content(doc)});
 await render();await choose('[name="current-page"]',product.id);await click('[name="edit-page-pricing"]');await click('[name="use-main-price"]');await click('[name="apply-price"]');await click('[name="save-draft"]');
 assert.equal(saved.products.find(p=>p.id===product.id).practicalInfo.priceEUR,170);
 assert.deepEqual(saved.pages.find(p=>p.id===product.id).sections.find(s=>s.id==='facts').items,prior);
});

serial('removing manual estimates clears established numeric facts without undefined literal prices', async () => {
 const doc=pricingDocument();doc.pages.find(p=>p.id==='our-fez-tours').sections.find(s=>s.id==='facts').items.push({title:text('Price (MAD)'),description:text('1900 MAD')});let saved;
 installFetch(({url,method,body})=>method==='PUT'?(saved=body.document,{body:{version:3,draftRevision:3,published:false}}):url.endsWith('/revisions')?{body:{revisions:[]}}:{body:content(doc)});
 await render();await choose('[name="current-page"]','our-fez-tours');await click('[name="edit-page-pricing"]');await typeInto('[name="price-amount"]','214');await choose('[name="price-estimates-decision"]','remove');await click('[name="apply-price"]');await click('[name="save-draft"]');
 const row=saved.pages.find(p=>p.id==='our-fez-tours').sections.find(s=>s.id==='facts').items.at(-1);assert.deepEqual(row.description,text(''));
 assert.ok(!previewQuery().textContent.includes('undefined MAD'));
 assert.ok(!document.querySelector('[name="price-estimate-MAD"]'),'removed estimates must not remain in the next edit buffer');
});

serial('pricing projection does not create a facts section when the page has none', async () => {
 const before=createCmsSeed();const page=before.pages.find(p=>p.id==='our-fez-tours');page.sections=page.sections.filter(s=>s.id!=='facts');
 const after=setEditorPath(before,['products','our-fez-tours','price','amount'],228);
 assert.deepEqual(after.pages.find(p=>p.id===page.id).sections,page.sections);
});

serial('current price drives CTA, product cards and SEO offers; hidden products have no literal fallback', async () => {
 const {renderToStaticMarkup}=await import('react-dom/server');const {PageRenderer}=await import('../src/cms/PageRenderer.tsx');const {routeSeoHead}=await import('../src/cms/seo.ts');
 let doc=createCmsSeed();doc=setEditorPath(doc,['products','our-fez-tours','price'],{amount:229,currency:'USD',basis:'group'});
 const productPage=doc.pages.find(p=>p.id==='our-fez-tours');
 const home=doc.pages.find(p=>p.id==='home');home.sections=[{id:'prices',type:'productGrid',variant:'overview',enabled:true,productIds:['our-fez-tours']}];
 const render=(page,language='en')=>renderToStaticMarkup(createElement(PageRenderer,{document:doc,page,language,onNavigate(){},onBook(){}}));
 for(const locale of ['en','fr','es']) {assert.match(render(productPage,locale),/\$229/);assert.match(render(home,locale),/\$229/);}
 const head=routeSeoHead(doc,{page:productPage,language:'en',path:'/our-fez-tours'},'https://example.com');
 assert.match(head,/"price":229/);assert.match(head,/"priceCurrency":"USD"/);
 doc.products.find(p=>p.id==='our-fez-tours').published=false;
 assert.equal(render(productPage),'');assert.ok(!render(home).includes('$229'));assert.ok(!render(home).includes('170'));
});
serial('invalid, nonfinite and out-of-range prices never validate for persistence', async () => {
 for(const bad of ['',NaN,Infinity,-1,1000001]) {const doc=createCmsSeed();doc.products[0].price.amount=bad;assert.equal(validateCmsDocument(doc).valid,false,String(bad));}
});

serial('price shortcut resolves the actual product after collection reorder without changing the seven workspaces', async () => {
 const doc=pricingDocument();doc.pages.find(p=>p.id==='home').sections=[{id:'prices',type:'productGrid',variant:'overview',enabled:true,productIds:['our-fez-tours','daytrip-meknes']}];let saved;
 installFetch(({url,method,body})=>method==='PUT'?(saved=body.document,{body:{version:3,draftRevision:3,published:false}}):url.endsWith('/revisions')?{body:{revisions:[]}}:{body:content(doc)});
 await render();const target=previewQuery('[data-edit-price="our-fez-tours"]');assert.ok(target);assert.ok(!target.closest('.cms-product-card'),'shortcut must not be nested inside a product-card button');
 await act(async()=>target.click());await settle();
 await click('[data-array-move="products.0:down"]');await typeInto('[name="price-amount"]','231');await choose('[name="price-estimates-decision"]','keep');await click('[name="apply-price"]');await click('[name="save-draft"]');
 assert.equal(saved.products[1].id,'our-fez-tours');assert.equal(saved.products[1].price.amount,231);assert.equal(saved.products[0].price.amount,130);
 assert.equal(document.querySelector('[name="current-page"]').value,'home');assert.equal(document.querySelectorAll('[data-workspace-tab]').length,7);
});

serial('resolving a conflict updates established facts copied from the old canonical value even when the mirror already matches', async () => {
 const doc=pricingDocument();doc.products.find(p=>p.id==='our-fez-tours').practicalInfo.priceEUR=203;
 doc.pages.find(p=>p.id==='our-fez-tours').sections.find(s=>s.id==='facts').items.push({title:text('Price (EUR)'),description:text('170 EUR')});let saved;
 installFetch(({url,method,body})=>method==='PUT'?(saved=body.document,{body:{version:3,draftRevision:3,published:false}}):url.endsWith('/revisions')?{body:{revisions:[]}}:{body:content(doc)});
 await render();await choose('[name="current-page"]','our-fez-tours');await click('[name="edit-page-pricing"]');await click('[name="use-compat-price"]');await choose('[name="price-estimates-decision"]','keep');await click('[name="apply-price"]');await click('[name="save-draft"]');
 assert.deepEqual(saved.pages.find(p=>p.id==='our-fez-tours').sections.find(s=>s.id==='facts').items.at(-1).description,text('203 EUR'));
});

serial('deliberate main-price edits update duplicate established price rows without changing their labels or graph', async () => {
 const doc=createCmsSeed();const page=doc.pages.find(p=>p.id==='our-fez-tours');const rows=page.sections.find(s=>s.id==='facts').items;
 const row={title:text('Price (EUR)'),description:text('170 EUR')};rows.push(structuredClone(row),structuredClone(row));
 const after=setEditorPath(doc,['products','our-fez-tours','price','amount'],233);const updated=after.pages.find(p=>p.id===page.id).sections.find(s=>s.id==='facts').items.slice(-2);
 assert.deepEqual(updated.map(row=>row.description),[text('233 EUR'),text('233 EUR')]);assert.equal(validateCmsDocument(after).valid,true);
});

serial('in-flight rollback locks existing pricing and prevents opening another price buffer before replacement', async () => {
 for (const removeProduct of [false, true]) {
  const doc=pricingDocument();const next=structuredClone(doc);
  if (removeProduct) {
   next.products=next.products.filter(p=>p.id!=='our-fez-tours');
   next.pages=next.pages.filter(p=>p.productId!=='our-fez-tours');
  } else next.products.find(p=>p.id==='our-fez-tours').price.amount=next.products.find(p=>p.id==='our-fez-tours').practicalInfo.priceEUR=245;
  let release;const delayed=new Promise(resolve=>{release=resolve;});let rolledBack=false;
  installFetch(async ({url,method})=>url.endsWith('/rollback')?(await delayed,rolledBack=true,{body:{version:3,draftRevision:3,published:true}}):url.endsWith('/revisions')?{body:{revisions:[]}}:{body:content(rolledBack?next:doc,rolledBack?3:2)});
  await render();await choose('[name="current-page"]','our-fez-tours');await click('[name="edit-page-pricing"]');
  await click('[data-workspace-tab="history"]');await typeInto('[name="rollback-revision"]','1');await click('[name="rollback"]');
  try {
   await click('[name="edit-page-pricing"]');assert.equal(document.querySelector('[data-admin-status]').dataset.workspace,'history','rollback must not open pricing');
   assert.equal(document.querySelector('[name="price-amount"]').disabled,true,'in-flight rollback must lock an already mounted price editor');
   await typeInto('[name="price-amount"]','');await click('[data-remove-price-estimate="MAD"]');
   assert.equal(document.querySelector('[name="cancel-price"]').disabled,true,'no pending buffer may be created during rollback');
   assert.equal(document.querySelector('[name="apply-price"]').disabled,true);
   await click('[data-open-pricing="daytrip-meknes"]');
   assert.ok(document.querySelector('[data-price-editor="our-fez-tours"]'),'opening another price buffer is locked');
  } finally {await act(async()=>release());await settle();}
  assert.equal(document.querySelector('[name="save-draft"]').disabled,false,'replacement must not strand pricingPending');
  if (!removeProduct) {await click('[name="edit-page-pricing"]');assert.equal(document.querySelector('[name="price-amount"]').value,'245');}
  else assert.equal(document.querySelector('[data-price-editor="our-fez-tours"]'),null);
 }
});

serial('in-flight async import locks every existing pricing mutation and cannot strand pending state', async () => {
 const confirm=window.confirm;window.confirm=()=>true;
 try { for (const removeProduct of [false,true]) {
  const doc=pricingDocument();const p=doc.products.find(p=>p.id==='our-fez-tours');p.practicalInfo.priceEUR=203;delete p.practicalInfo.priceUSD;
  const next=structuredClone(doc);
  if (removeProduct) {next.products=next.products.filter(item=>item.id!==p.id);next.pages=next.pages.filter(page=>page.productId!==p.id);}
  else {next.products.find(item=>item.id===p.id).price.amount=246;next.products.find(item=>item.id===p.id).practicalInfo.priceEUR=246;}
  installFetch(({url})=>url.endsWith('/revisions')?{body:{revisions:[]}}:{body:content(doc)});
  await render();await choose('[name="current-page"]',p.id);await click('[name="edit-page-pricing"]');await click('[data-workspace-tab="history"]');
  let release;const delayed=new Promise(resolve=>{release=resolve;});const input=document.querySelector('[name="import-draft"]');
  Object.defineProperty(input,'files',{configurable:true,value:[{size:1,text:()=>delayed}]});
  await act(async()=>input.dispatchEvent(new window.Event('change',{bubbles:true})));
  try {
   await click('[name="edit-page-pricing"]');assert.equal(document.querySelector('[data-admin-status]').dataset.workspace,'history','import must not open pricing');
   for(const control of document.querySelectorAll('[data-price-editor] input,[data-price-editor] select,[data-price-editor] button')) assert.equal(control.disabled,true,control.name||control.outerHTML);
   await typeInto('[name="price-estimate-MAD"]','');await click('[data-add-price-estimate="USD"]');await click('[data-remove-price-estimate="MAD"]');await click('[name="use-compat-price"]');await click('[name="apply-price"]');await click('[name="cancel-price"]');
   assert.equal(document.querySelector('[name="return-to-pricing"]'),null,'locked controls must not create a buffer');
   await click('[data-open-pricing="daytrip-meknes"]');assert.ok(document.querySelector(`[data-price-editor="${p.id}"]`));
  } finally {await act(async()=>release(JSON.stringify(next)));await settle();}
  assert.equal(document.querySelector('[name="save-draft"]').disabled,false);
  if(removeProduct) assert.equal(document.querySelector('[data-price-editor]'),null);
  else assert.equal(document.querySelector('[name="price-amount"]').value,'246');
 } } finally {window.confirm=confirm;}
});

serial('keep existing estimates ignores edited buffers and refreshes the form from the applied document', async () => {
 const doc=pricingDocument();let saved;
 installFetch(({url,method,body})=>method==='PUT'?(saved=body.document,{body:{version:3,draftRevision:3,published:false}}):url.endsWith('/revisions')?{body:{revisions:[]}}:{body:content(doc)});
 await render();await choose('[name="current-page"]','our-fez-tours');await click('[name="edit-page-pricing"]');
 await typeInto('[name="price-amount"]','211');await typeInto('[name="price-estimate-MAD"]','2350');
 await choose('[name="price-estimates-decision"]','keep');await click('[name="apply-price"]');await click('[name="save-draft"]');
 assert.equal(saved.products.find(p=>p.id==='our-fez-tours').practicalInfo.priceMAD,1900,'Keep must preserve stored estimates, not the edited buffer');
 assert.equal(document.querySelector('[name="price-estimate-MAD"]').value,'1900');
 assert.equal(document.querySelector('[name="price-amount"]').value,'211');
});

serial('pricing operation lock retains an existing legitimate buffer and blocks every late form action', async () => {
 const {PriceEditor}=await import('../src/admin/PriceEditor.tsx');const doc=pricingDocument();delete doc.products.find(p=>p.id==='our-fez-tours').practicalInfo.priceUSD;
 let setLocked;let applied;let pending;
 function Harness() {const [locked,lock]=React.useState(false);setLocked=lock;return createElement(PriceEditor,{document:doc,productId:'our-fez-tours',language:'en',disabled:locked,onChange:(_id,change)=>{applied=change;},onPendingChange:value=>{pending=value;}});}
 if(root)await act(async()=>root.unmount());document.body.replaceChildren();const host=document.createElement('div');document.body.append(host);root=createRoot(host);
 await act(async()=>root.render(createElement(Harness)));
 await typeInto('[name="price-amount"]','211');await typeInto('[name="price-estimate-MAD"]','2350');await choose('[name="price-estimates-decision"]','updated');
 assert.deepEqual(applied,{price:{amount:211,currency:'EUR',basis:'person'},equivalents:{MAD:1900}},'typing the main price applies it and keeps estimates; the lock must not be required first');
 await act(async()=>setLocked(true));
 for(const control of document.querySelectorAll('[data-price-editor] input,[data-price-editor] select,[data-price-editor] button'))assert.equal(control.disabled,true,control.name||control.outerHTML);
 await typeInto('[name="price-amount"]','');await typeInto('[name="price-estimate-MAD"]','');await choose('[name="price-currency"]','USD');await choose('[name="price-basis"]','group');await choose('[name="price-estimates-decision"]','remove');
 await click('[data-add-price-estimate="USD"]');await click('[data-remove-price-estimate="MAD"]');await click('[name="apply-price"]');await click('[name="cancel-price"]');
 assert.deepEqual(applied.price,{amount:211,currency:'EUR',basis:'person'});assert.equal(pending,true,'the main price is applied, but the unapplied manual-equivalent buffer must remain guarded');
 await act(async()=>setLocked(false));
 assert.equal(document.querySelector('[name="price-amount"]').value,'211');assert.equal(document.querySelector('[name="price-estimate-MAD"]').value,'2350');
 assert.equal(document.querySelector('[name="price-currency"]').value,'EUR');assert.equal(document.querySelector('[name="price-basis"]').value,'person');assert.equal(document.querySelector('[name="price-estimates-decision"]').value,'updated');
 await click('[name="apply-price"]');assert.deepEqual(applied,{price:{amount:211,currency:'EUR',basis:'person'},equivalents:{MAD:2350}});
});

serial('estimate decisions distinguish saved values, edited additions/removals, blanks and a new base currency', async () => {
 const {PriceEditor}=await import('../src/admin/PriceEditor.tsx');
 for(const mutation of ['edit','add','remove','blank','remove-all','currency']) for(const decision of ['keep','updated','remove']) {
  const doc=pricingDocument();const product=doc.products.find(p=>p.id==='our-fez-tours');
  if(mutation==='add') delete product.practicalInfo.priceUSD;
  let applied;const pending=[];
  function Harness() {
   const [current,setCurrent]=React.useState(doc);
   return createElement(PriceEditor,{document:current,productId:product.id,language:'en',onPendingChange:value=>pending.push(value),onChange:(id,change)=>{
    applied=change;
    const next=structuredClone(current);const p=next.products.find(item=>item.id===id);p.price=change.price;
    for(const currency of ['EUR','MAD','USD']) {delete p.practicalInfo[`price${currency}`];if(change.equivalents[currency]!==undefined)p.practicalInfo[`price${currency}`]=change.equivalents[currency];}
    p.practicalInfo[`price${change.price.currency}`]=change.price.amount;setCurrent(next);
   }});
  }
  if(root) await act(async()=>root.unmount());document.body.replaceChildren();const host=document.createElement('div');document.body.append(host);root=createRoot(host);
  await act(async()=>root.render(createElement(Harness)));
  await typeInto('[name="price-amount"]','211');
  if(mutation==='edit') await typeInto('[name="price-estimate-MAD"]','2350');
  if(mutation==='add') {await click('[data-add-price-estimate="USD"]');await typeInto('[name="price-estimate-USD"]','222');}
  if(mutation==='remove'||mutation==='remove-all') await click('[data-remove-price-estimate="MAD"]');
  if(mutation==='remove-all') await click('[data-remove-price-estimate="USD"]');
  if(mutation==='blank') await typeInto('[name="price-estimate-MAD"]','');
  if(mutation==='currency') {await choose('[name="price-currency"]','USD');await typeInto('[name="price-estimate-EUR"]','185');}
  assert.ok(document.querySelector('[name="price-estimates-decision"]'),`${mutation}: stored estimates still need an explicit decision after main-price changes`);
  await choose('[name="price-estimates-decision"]',decision);
  if(mutation==='blank'&&decision==='updated') {assert.equal(document.querySelector('[name="apply-price"]').disabled,true);assert.equal(applied.price.amount,211);assert.equal(applied.equivalents.MAD,1900);continue;}
  assert.equal(document.querySelector('[name="apply-price"]').disabled,false,`${mutation}/${decision}`);
  await click('[name="apply-price"]');
  let expected=mutation==='currency'?{EUR:211,MAD:1900}:{MAD:1900,...(mutation==='add'?{}:{USD:191})};
  if(decision==='remove') expected={};
  if(decision==='updated') {
   if(mutation==='edit') expected.MAD=2350;
   if(mutation==='add') expected.USD=222;
   if(mutation==='remove'||mutation==='remove-all') delete expected.MAD;
   if(mutation==='remove-all') delete expected.USD;
   if(mutation==='currency') expected.EUR=185;
  }
  assert.deepEqual(applied.equivalents,expected,`${mutation}/${decision}`);
  assert.deepEqual(applied.price,{amount:211,currency:mutation==='currency'?'USD':'EUR',basis:'person'});
  for(const currency of ['EUR','MAD','USD'].filter(item=>item!==applied.price.currency)) {
   const field=document.querySelector(`[name="price-estimate-${currency}"]`);
   assert.equal(field?.value,expected[currency]===undefined?undefined:String(expected[currency]),`${mutation}/${decision}: refreshed ${currency}`);
  }
  assert.equal(pending.at(-1),false);
 }
});

serial('estimate-only changes apply deliberately without an unnecessary main-price review', async () => {
 const doc=pricingDocument();let saved;
 installFetch(({url,method,body})=>method==='PUT'?(saved=body.document,{body:{version:3,draftRevision:3,published:false}}):url.endsWith('/revisions')?{body:{revisions:[]}}:{body:content(doc)});
 await render();await choose('[name="current-page"]','our-fez-tours');await click('[name="edit-page-pricing"]');
 await typeInto('[name="price-estimate-MAD"]','2350');assert.equal(document.querySelector('[name="price-estimates-decision"]')?.value,'updated');
 await click('[name="apply-price"]');await click('[name="save-draft"]');
 assert.equal(saved.products.find(p=>p.id==='our-fez-tours').practicalInfo.priceMAD,2350);
 assert.deepEqual(saved.products.find(p=>p.id==='our-fez-tours').price,doc.products.find(p=>p.id==='our-fez-tours').price);
});

serial('unapplied pricing locks document replacement so imports or rollback cannot strand a stale price buffer', async () => {
 const doc=pricingDocument();installFetch(({url})=>url.endsWith('/revisions')?{body:{revisions:[]}}:{body:content(doc)});
 await render();await choose('[name="current-page"]','our-fez-tours');await click('[name="edit-page-pricing"]');await typeInto('[name="price-amount"]','');await click('[data-workspace-tab="history"]');
 assert.equal(document.querySelector('[name="rollback"]').disabled,true);
 assert.equal(document.querySelector('[name="import-draft"]').disabled,true);
 await click('[name="return-to-pricing"]');await click('[name="cancel-price"]');
 assert.equal(document.querySelector('[name="rollback"]').disabled,false);
});
