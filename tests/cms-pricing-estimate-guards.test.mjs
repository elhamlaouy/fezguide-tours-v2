import test from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';
import { register as registerTsx } from 'tsx/esm/api';
const loaderDirectory=mkdtempSync(join(tmpdir(),'cms-estimate-loader-'));
const loaderPath=join(loaderDirectory,'css-loader.mjs');
writeFileSync(loaderPath,`export async function load(url,context,nextLoad){if(url.endsWith('.css'))return {format:'module',source:'export default {};',shortCircuit:true};return nextLoad(url,context);}`);
process.once('exit',()=>rmSync(loaderDirectory,{recursive:true,force:true}));
registerTsx();register(pathToFileURL(loaderPath));
const {Window}=await import('happy-dom');
let window;
const assign=(key,value)=>{Object.defineProperty(globalThis,key,{configurable:true,writable:true,value});};
function freshWindow(){
 window=new Window({url:'https://fez.example/admin'});
 for(const key of ['window','document','navigator'])assign(key,key==='window'?window:window[key]);
 for(const key of Object.getOwnPropertyNames(window))if(!(key in globalThis)&&typeof window[key]==='function'&&/^[A-Z]/.test(key))assign(key,window[key]);
 for(const key of ['getComputedStyle','requestAnimationFrame','cancelAnimationFrame'])assign(key,window[key].bind(window));
}
freshWindow();globalThis.IS_REACT_ACT_ENVIRONMENT=true;
const React=await import('react');const {act,createElement:h}=React;
const {createRoot}=await import('react-dom/client');
const {PriceEditor}=await import('../src/admin/PriceEditor.tsx');
const {AdminApp}=await import('../src/admin/AdminApp.tsx');
const {createCmsSeed}=await import('../src/cms/seed.ts');
await (await import('../src/cms/ApprovedPageRenderer.tsx')).preloadApprovedLayouts();
let root,latest,pending,replace;
const q=selector=>document.querySelector(selector);
async function mount(Component){const host=document.createElement('div');document.body.append(host);root=createRoot(host);await act(async()=>root.render(h(Component)));}
async function input(name,value){const el=q(`[name="${name}"]`);assert.ok(el,name);await act(async()=>{Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set.call(el,value);el.dispatchEvent(new window.Event('input',{bubbles:true}));});}
async function choose(name,value){const el=q(`[name="${name}"]`);assert.ok(el,name);await act(async()=>{el.value=value;el.dispatchEvent(new window.Event('change',{bubbles:true}));});}
async function click(selector){assert.ok(q(selector),selector);await act(async()=>q(selector).click());}
async function harness(mutate=()=>{}){
 const doc=createCmsSeed();mutate(doc.products[0]);
 function Harness(){const [current,setCurrent]=React.useState(doc);latest=current;replace=setCurrent;return h(PriceEditor,{document:current,productId:doc.products[0].id,language:'en',onPendingChange:value=>{pending=value;},onChange:(id,change)=>setCurrent(before=>{const next=structuredClone(before),p=next.products.find(p=>p.id===id);p.price=change.price;for(const c of ['EUR','MAD','USD'])delete p.practicalInfo[`price${c}`];Object.entries(change.equivalents).forEach(([c,n])=>p.practicalInfo[`price${c}`]=n);p.practicalInfo[`price${change.price.currency}`]=change.price.amount;return next;})});}
 await mount(Harness);
}
test.afterEach(async()=>{if(root){await act(async()=>root.unmount());root=null;}await window.happyDOM.close();freshWindow();});
test.after(async()=>window.happyDOM.close());

test('blank and invalid estimates stay editable and cannot apply as zero or bypass validation',async()=>{
 await harness();
 for(const value of ['', '-1', '1000001']){
  await input('price-estimate-MAD',value);assert.ok(q('[name="price-estimate-MAD"]'));assert.equal(pending,true);
  assert.equal(q('[name="price-estimate-MAD"]').getAttribute('aria-invalid'),'true');
  assert.equal(q('[name="apply-price"]').disabled,true);
  await choose('price-estimates-decision','');assert.equal(q('[name="apply-price"]').disabled,true,'empty decision cannot bypass invalid buffer');
  await click('[name="apply-price"]');assert.equal(latest.products[0].practicalInfo.priceMAD,1900);
 }
 await input('price-estimate-MAD','2350');await click('[name="apply-price"]');assert.equal(latest.products[0].practicalInfo.priceMAD,2350);assert.equal(pending,false);
});

test('main edits remain immediate without erasing pending estimates, including external updates',async()=>{
 await harness();await input('price-amount','211');assert.equal(pending,false);assert.equal(latest.products[0].price.amount,211);
 await input('price-estimate-MAD','2350');await input('price-amount','212');await choose('price-basis','group');
 assert.equal(latest.products[0].price.amount,212);assert.equal(latest.products[0].price.basis,'group');assert.equal(latest.products[0].practicalInfo.priceMAD,1900);
 assert.equal(q('[name="price-estimate-MAD"]').value,'2350');assert.equal(q('[name="price-estimates-decision"]').value,'updated');assert.equal(pending,true);
 await act(async()=>replace(before=>structuredClone(before)));assert.equal(q('[name="price-estimate-MAD"]').value,'2350');
 await choose('price-currency','USD');assert.equal(q('[name="price-estimate-EUR"]').value,'212');await choose('price-currency','EUR');
 await click('[name="apply-price"]');assert.equal(latest.products[0].practicalInfo.priceMAD,2350);assert.equal(pending,false);
 await input('price-estimate-MAD','');await choose('price-currency','USD');assert.equal(pending,true);assert.equal(q('[name="price-estimate-MAD"]').value,'');assert.equal(latest.products[0].price.currency,'USD');assert.equal(q('[name="price-estimate-EUR"]').value,'212','newly exposed old base must use the current main amount');
 await click('[name="cancel-price"]');assert.equal(latest.products[0].price.currency,'USD');assert.equal(latest.products[0].price.amount,212);assert.equal(pending,false);
});

test('mounted AdminApp guards Save/Publish/product switching and navigation for estimate-only changes',async()=>{
 const doc=createCmsSeed();let writes=0;
 doc.pages=doc.pages.map(p=>({...p,sections:p.kind==='product'?p.sections.filter(s=>s.id==='facts'||s.type==='cta'):[]}));
 for(const p of doc.products)p.galleryImages=[];
 doc.editorialEntries=[];doc.blogPosts=[];doc.teamMembers=[];doc.faqs=[];doc.reviews=[];
 doc.legacy={...doc.legacy,tours:[],customPages:[],blogPosts:[],teamMembers:[],faqs:[]};
 const used=new Set(doc.products.map(p=>p.image));doc.media=doc.media.filter(m=>used.has(m.src));
 const fetchMock=async(url,init={})=>{if(init.method&&init.method!=='GET')writes++;return new Response(JSON.stringify(String(url).endsWith('/revisions')?{revisions:[]}:{version:2,draftRevision:2,publishedRevision:1,document:doc}),{status:200,headers:{'Content-Type':'application/json'}});};
 assign('fetch',fetchMock);window.fetch=fetchMock;window.confirm=()=>false;
 await mount(()=>h(AdminApp,{language:'en',onClose(){}}));
 await act(async()=>{await new Promise(r=>setTimeout(r,20));});
 await choose('current-page','our-fez-tours');await click('[name="edit-page-pricing"]');await input('price-estimate-MAD','2350');
 assert.equal(q('[name="save-draft"]').disabled,true);assert.equal(q('[name="publish"]').disabled,true);
 await click('[name="save-draft"]');await click('[name="publish"]');assert.equal(writes,0);
 const before=new window.Event('beforeunload',{cancelable:true});window.dispatchEvent(before);assert.equal(before.defaultPrevented,true);
 await click('[data-workspace-tab="content"]');await click('[data-open-pricing="daytrip-meknes"]');
 assert.ok(q('[data-price-editor="our-fez-tours"]'),'declined discard must retain original product');
 await click('[name="return-to-pricing"]');assert.equal(q('[name="price-estimate-MAD"]').value,'2350');
 await click('[name="cancel-price"]');assert.equal(q('[name="save-draft"]').disabled,false);
});

test('edited estimates survive temporarily becoming the base currency, with explicit Apply and Cancel',async()=>{
 await harness();
 await input('price-estimate-USD','222');
 await choose('price-currency','USD');
 assert.equal(q('[name="price-estimate-USD"]'),null,'the estimate is temporarily hidden while USD is the base');
 await choose('price-currency','EUR');
 assert.equal(q('[name="price-estimate-USD"]').value,'222','currency round trip must not overwrite a typed pending value');
 assert.equal(pending,true);
 await click('[name="apply-price"]');assert.equal(latest.products[0].practicalInfo.priceUSD,222);assert.equal(pending,false);
 await input('price-estimate-USD','333');await choose('price-currency','USD');await choose('price-currency','EUR');
 assert.equal(q('[name="price-estimate-USD"]').value,'333');
 const appliedUSD=latest.products[0].practicalInfo.priceUSD;
 await click('[name="cancel-price"]');assert.equal(q('[name="price-estimate-USD"]').value,String(appliedUSD));assert.equal(pending,false);
 await input('price-estimate-USD','');await choose('price-currency','USD');await choose('price-currency','EUR');
 assert.equal(q('[name="price-estimate-USD"]').value,'');assert.equal(q('[name="apply-price"]').disabled,true);
 await click('[data-remove-price-estimate="USD"]');await choose('price-currency','USD');await choose('price-currency','EUR');
 assert.ok(q('[data-add-price-estimate="USD"]'),'explicit pending removal must survive the same round trip');
 await click('[name="apply-price"]');assert.equal(latest.products[0].practicalInfo.priceUSD,undefined);assert.equal(pending,false);
});

test('estimate add/change/remove become pending until explicit Apply or Cancel',async()=>{
 await harness(p=>delete p.practicalInfo.priceUSD);
 await click('[data-add-price-estimate="USD"]');assert.equal(pending,true,'added blank estimate must guard unsaved changes');
 await input('price-estimate-USD','222');await click('[name="apply-price"]');assert.equal(latest.products[0].practicalInfo.priceUSD,222);assert.equal(pending,false);
 await input('price-estimate-MAD','2350');assert.equal(pending,true);await click('[name="apply-price"]');assert.equal(latest.products[0].practicalInfo.priceMAD,2350);assert.equal(pending,false);
 await click('[data-remove-price-estimate="USD"]');assert.equal(pending,true);await click('[name="cancel-price"]');assert.equal(pending,false);assert.equal(q('[name="price-estimate-USD"]').value,'222','Cancel must discard only the buffer, not already-applied estimates');
 await click('[data-remove-price-estimate="USD"]');await click('[name="apply-price"]');assert.equal(latest.products[0].practicalInfo.priceUSD,undefined);
});
