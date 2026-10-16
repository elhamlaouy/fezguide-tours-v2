import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { register } from 'tsx/esm/api';
register();
registerHooks({ load(url, context, nextLoad) { if (url.endsWith('.css')) return { format: 'module', source: 'export default "";', shortCircuit: true }; return nextLoad(url, context); } });
const { Window } = await import('happy-dom');
const window = new Window({ url: 'https://fez.example/' });
for (const [key, value] of Object.entries({ window, document: window.document, navigator: window.navigator })) Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
for (const key of Object.getOwnPropertyNames(window)) if (!(key in globalThis) && typeof window[key] === 'function' && /^[A-Z]/.test(key)) globalThis[key] = window[key];
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const { createElement, act } = await import('react');
const { createRoot } = await import('react-dom/client');
const { renderToStaticMarkup } = await import('react-dom/server');
const { createCmsSeed } = await import('../src/cms/seed.ts');
const { CmsProvider } = await import('../src/context/CmsContext.tsx');
const { Navbar } = await import('../src/components/Navbar.tsx');
const { Footer } = await import('../src/components/Footer.tsx');
const { BookingModal } = await import('../src/components/BookingModal.tsx');
const { FloatingWhatsAppButton } = await import('../src/components/FloatingWhatsAppButton.tsx');
const { CmsPreviewProvider } = await import('../src/context/CmsContext.tsx');
const { PageRenderer } = await import('../src/cms/PageRenderer.tsx');
const { businessContactHref } = await import('../src/cms/business-contact.ts');
const { validateCmsDocument } = await import('../src/cms/schema.ts');
const { contentLanguage } = await import('../src/cms/render-utils.ts');
const text = value => ({ en: value, fr: value, es: value });

test('canonical brand name reaches both shell logos while the approved mark and single Atlas credit remain', () => {
  const doc = createCmsSeed(); doc.siteSettings.siteName = 'OWNER BRAND SENTINEL';
  const html = renderToStaticMarkup(createElement(CmsProvider, null, createElement('div', null,
    createElement(Navbar, { document: doc, language: 'en', currentPage: 'home', onNavigate() {}, onLanguageChange() {}, onBookClick() {}, onOpenAdmin() {} }),
    createElement(Footer, { document: doc, language: 'en', onNavigate() {}, onOpenAdmin() {} }))));
  assert.equal((html.match(/OWNER BRAND SENTINEL Logo/g) ?? []).length, 2);
  assert.equal((html.match(/>OWNER BRAND SENTINEL</g) ?? []).length, 2);
  assert.equal((html.match(/href="https:\/\/atlastactics\.com"/g) ?? []).length, 1);
  assert.ok(html.includes('viewBox="0 0 120 135"'));
  assert.match(html, /<span>Powered By<\/span>/);
  assert.match(html, /<span class="font-semibold">Atlas Tactics<\/span>/);
  assert.doesNotMatch(html.match(/<a href="https:\/\/atlastactics\.com"[^>]*>/)?.[0] ?? '', /aria-label=/, 'visible credit supplies its accessible name without a conflicting override');
});

test('mounted booking reads canonical labels products contacts validation and prepared inquiry copy', async () => {
  const doc = createCmsSeed();
  doc.siteSettings.siteName = 'OWNER BRAND SENTINEL'; doc.siteSettings.whatsappNumber = '212600123456';
  doc.products.forEach(product => { product.published = product.id === 'our-fez-tours'; });
  doc.products.find(product => product.id === 'our-fez-tours').title = text('CANONICAL BOOKABLE TOUR');
  for (const name of ['title', 'fullName', 'submitBtn', 'successTitle', 'successMsg', 'openWhatsApp', 'errorName']) doc.uiCopy[`ui.booking.${name}`] = text(`COPY ${name} SENTINEL`);
  globalThis.fetch = async input => new Response(JSON.stringify(String(input) === '/api/cms/document' ? { document: doc, version: 1 } : {}), { status: 200, headers: { 'Content-Type': 'application/json' } });
  const host = document.createElement('div'); document.body.append(host); const root = createRoot(host);
  try {
    await act(async () => { root.render(createElement(CmsProvider, null, createElement(BookingModal, { isOpen: true, language: 'en', onClose() {} }))); });
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 10)); });
    assert.ok(host.textContent.includes('COPY title SENTINEL'));
    assert.ok(host.textContent.includes('COPY fullName SENTINEL'));
    assert.deepEqual([...host.querySelectorAll('select')[0].options].map(option => option.textContent), ['CANONICAL BOOKABLE TOUR']);
    assert.ok(!host.textContent.includes('confirmation within 2 hours'));
    const form = host.querySelector('form');
    await act(async () => form.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true })));
    assert.ok(host.textContent.includes('COPY errorName SENTINEL'));
    for (const [type, value] of [['text', 'Visitor Name'], ['email', 'visitor@example.com'], ['tel', '+212600123457'], ['date', '2099-12-15']]) {
      const input = host.querySelector(`input[type="${type}"]`);
      await act(async () => { Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(input, value); input.dispatchEvent(new window.Event('input', { bubbles: true })); });
    }
    await act(async () => form.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true })));
    assert.ok(host.textContent.includes('COPY successTitle SENTINEL'));
    assert.ok(host.textContent.includes('COPY successMsg SENTINEL'));
    const link = host.querySelector('a[href^="https://wa.me/"]');
    assert.ok(link.href.startsWith('https://wa.me/212600123456'));
    const message = new URL(link.href).searchParams.get('text');
    assert.ok(message.includes('OWNER BRAND SENTINEL'));
    assert.ok(message.includes('CANONICAL BOOKABLE TOUR'));
    assert.ok(host.textContent.includes('COPY openWhatsApp SENTINEL'));
  } finally { await act(async () => root.unmount()); host.remove(); }
});

test('a global WhatsApp change reaches every inherited page action without rewriting custom destinations', () => {
  const doc=createCmsSeed();doc.siteSettings.whatsappNumber='212600123456';
  for(const page of doc.pages)for(const language of ['en','fr','es']){
    const html=renderToStaticMarkup(createElement(PageRenderer,{document:doc,page,language,onNavigate(){},onBook(){}}));
    assert.doesNotMatch(html,/href="https:\/\/wa\.me\/212719603009/,`${page.id}/${language}`);
  }
  const custom='https://wa.me/212600999999?text=Owner%20message';
  assert.equal(businessContactHref(doc,custom),custom);
  assert.equal(new URL(businessContactHref(doc,'https://wa.me/212719603009?text=Keep%20this')).searchParams.get('text'),'Keep this');
});

test('floating chat consumes canonical contact context brand and effective editable labels',async()=>{
  const doc=createCmsSeed();doc.siteSettings.whatsappNumber='212600123456';doc.siteSettings.siteName='CANONICAL BRAND';
  doc.pages.find(page=>page.id==='home').title=text('CANONICAL CONTEXT');doc.uiCopy['ui.floating.startChat']=text('OWNER CHAT ACTION');
  const host=document.createElement('div');document.body.append(host);const root=createRoot(host),opened=[];const original=window.open;
  window.open=(...args)=>opened.push(args);
  try{
    await act(async()=>root.render(createElement(CmsPreviewProvider,{document:doc},createElement(FloatingWhatsAppButton,{language:'en',currentPage:'home'}))));
    await act(async()=>host.querySelector('button[aria-expanded]').click());
    const action=[...host.querySelectorAll('button')].find(button=>button.textContent.includes('OWNER CHAT ACTION'));assert.ok(action);
    await act(async()=>action.click());
    assert.equal(opened.length,1);const url=new URL(opened[0][0]);assert.equal(url.pathname,'/212600123456');
    assert.ok(url.searchParams.get('text').includes('CANONICAL BRAND'));assert.ok(url.searchParams.get('text').includes('CANONICAL CONTEXT'));
    assert.equal(opened[0][2],'noopener,noreferrer');
  }finally{window.open=original;await act(async()=>root.unmount());host.remove();}
});

test('team portraits consume focal points and raw URL-only references cannot be removed',()=>{
  const doc=createCmsSeed(),member=doc.teamMembers[0],photo=doc.media.find(media=>media.src===member.avatarUrl);assert.ok(photo);
  photo.focalPoint={x:.23,y:.74};
  const page=doc.pages.find(page=>page.id==='home');page.sections=[{id:'team-proof',type:'team',variant:'story',enabled:true,teamIds:[member.id]}];
  const html=renderToStaticMarkup(createElement(PageRenderer,{document:doc,page,language:'en',onNavigate(){},onBook(){}}));
  assert.ok(html.includes(`object-position:${.23*100}% ${.74*100}%`));
  doc.media=doc.media.filter(media=>media.id!==photo.id);const result=validateCmsDocument(doc);
  assert.equal(result.valid,false);assert.ok(result.errors.some(error=>error.includes(`teamMembers.${member.id}.avatarUrl`)));
});

test('Spanish stays explicit and EN FR fallback chains resolve fully',()=>{
  const doc=createCmsSeed(),page=doc.pages.find(page=>page.id==='home');
  page.localeFallback={en:'fr',fr:'es'};assert.equal(validateCmsDocument(doc).valid,true);assert.equal(contentLanguage(page,'en'),'es');assert.equal(contentLanguage(page,'fr'),'es');assert.equal(contentLanguage(page,'es'),'es');
  page.localeFallback={es:'en'};assert.equal(validateCmsDocument(doc).valid,false);assert.equal(contentLanguage(page,'es'),'es');
});

test('shortening English product prose does not display preserved French paragraphs as English fallback',async()=>{
 const {setEditorPath}=await import('../src/cms/editor-controls.ts');
 let doc=createCmsSeed();const product=doc.products.find(item=>item.id==='our-fez-tours');
 const page=doc.pages.find(page=>page.id===product.id),overview=page.sections.find(section=>section.id==='overview');
 overview.blocks=[{type:'paragraph',text:{en:'Original English paragraph',fr:'OWNER FRENCH FIRST',es:'OWNER SPANISH FIRST'}},{type:'paragraph',text:{en:'Second English paragraph',fr:'OWNER FRENCH SECOND',es:'OWNER SPANISH SECOND'}}];
 doc=setEditorPath(doc,['products',product.id,'fullDescription','en'],'Replacement English only');
 const changed=doc.pages.find(page=>page.id===product.id);changed.sections=changed.sections.filter(section=>section.id==='overview');
 const render=language=>renderToStaticMarkup(createElement(PageRenderer,{document:doc,page:changed,language,onNavigate(){},onBook(){}}));
 const english=render('en');assert.ok(english.includes('Replacement English only'));assert.ok(!english.includes('OWNER FRENCH'));assert.ok(!english.includes('OWNER SPANISH'));
 assert.ok(render('fr').includes('OWNER FRENCH SECOND'));assert.ok(render('es').includes('OWNER SPANISH SECOND'));
});

test('normal UI-copy keys all correspond to real consumers and seed their effective defaults',async()=>{
 const {readFileSync}=await import('node:fs');const {SUPPORTED_UI_COPY,FLOATING_COPY}=await import('../src/cms/ui-copy.ts');const {BOOKING_COPY}=await import('../src/cms/booking-copy.ts');
 const files=['components/BookingModal.tsx','components/FloatingWhatsAppButton.tsx','components/Navbar.tsx','components/Footer.tsx','cms/SectionRenderer.tsx'];
 const contents=Object.fromEntries(files.map(file=>[file,readFileSync(new URL(`../src/${file}`,import.meta.url),'utf8')]));
 const consumers=new Set();for(const source of Object.values(contents))for(const match of source.matchAll(/uiText\([^,]+,\s*'([^']+)'/g))consumers.add(match[1]);
 const bookingKeys=[...contents['components/BookingModal.tsx'].matchAll(/bookingText\('([^']+)'\)/g)].map(match=>match[1]);
 assert.deepEqual([...new Set(bookingKeys)].sort(),Object.keys(BOOKING_COPY).sort());bookingKeys.forEach(key=>consumers.add(`ui.booking.${key}`));
 const floatingKeys=[...contents['components/FloatingWhatsAppButton.tsx'].matchAll(/floatingText\('([^']+)'\)/g)].map(match=>match[1]);
 for(const match of contents['components/FloatingWhatsAppButton.tsx'].matchAll(/key: '([^']+)' as const/g))floatingKeys.push(match[1]);
 assert.deepEqual([...new Set(floatingKeys)].sort(),Object.keys(FLOATING_COPY).sort());floatingKeys.forEach(key=>consumers.add(`ui.floating.${key}`));
 assert.deepEqual([...consumers].sort(),Object.keys(SUPPORTED_UI_COPY).sort());
 const seed=createCmsSeed();for(const key of consumers)assert.ok(seed.uiCopy[key],key);
});
