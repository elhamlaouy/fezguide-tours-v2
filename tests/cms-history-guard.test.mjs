import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { register } from 'tsx/esm/api';
register();
registerHooks({load(url,context,next){return url.endsWith('.css')?{format:'module',source:'export default "";',shortCircuit:true}:next(url,context);}});

test('mounted Back/Forward retains dirty drafts and pending import/upload unless discard is confirmed', async () => {
 const {Window}=await import('happy-dom');
 const window=new Window({url:'https://fez.test/'});
 const originals=new Map();
 for(const key of ['window','document','HTMLElement','HTMLInputElement','HTMLTextAreaElement','Node','navigator']){
  originals.set(key,Object.getOwnPropertyDescriptor(globalThis,key));Object.defineProperty(globalThis,key,{configurable:true,writable:true,value:window[key]??window});
 }
 globalThis.IS_REACT_ACT_ENVIRONMENT=true;
 const {act,createElement}=await import('react');const {createRoot}=await import('react-dom/client');
 const {createCmsSeed}=await import('../src/cms/seed.ts');const {default:App}=await import('../src/App.tsx');
 const doc=createCmsSeed(),title={en:'Published home',fr:'Accueil publié',es:'Inicio publicado'};
 const home={...doc.pages.find(page=>page.id==='home'),title,seo:{title,description:title},sections:[{id:'hero',type:'hero',enabled:true,variant:'minimal',title,links:[]}]};
 Object.assign(doc,{pages:[home],products:[],editorialEntries:[],blogPosts:[],teamMembers:[],faqs:[],media:[],reviews:[],uiCopy:{},navigation:[],footer:{text:title,links:[]},legacy:{tours:[],customPages:[],blogPosts:[],teamMembers:[],faqs:[],siteSettings:doc.siteSettings}});
 const savedFetch=globalThis.fetch;let releaseUpload;const writes=[];
 globalThis.fetch=async(path,init={})=>{
  if((init.method??'GET')!=='GET')writes.push(String(path));
  if(path==='/api/admin/media')return new Promise(resolve=>{releaseUpload=()=>resolve(Response.json({media:{id:'upload-22222222-2222-4222-8222-222222222222',src:'/media/upload-22222222-2222-4222-8222-222222222222.png',alt:title,width:1,height:1,source:'cms-upload'},previewSrc:'/api/admin/media/upload-22222222-2222-4222-8222-222222222222.png'},{status:201}));});
  return Response.json(path==='/api/cms/document'?{version:2,document:doc}:path==='/api/admin/content'?{version:2,draftRevision:2,publishedRevision:2,document:doc}:String(path).endsWith('/revisions')?{revisions:[]}:doc.legacy);
 };
 window.fetch=globalThis.fetch;window.history.pushState(null,'','/admin');
 const host=window.document.createElement('div');window.document.body.append(host);const root=createRoot(host);
 const settle=()=>act(async()=>{await new Promise(resolve=>setTimeout(resolve,10));});
 const wait=async(fn)=>{for(let i=0;i<100;i++){if(fn())return fn();await settle();}throw Error('mounted history fixture did not settle');};
 const back=()=>act(async()=>{window.history.back();await new Promise(resolve=>setTimeout(resolve,20));});
 try {
  await act(async()=>root.render(createElement(App)));await wait(()=>host.querySelector('[data-path="pages.home.title.en"]'));
  const input=host.querySelector('[data-path="pages.home.title.en"]');
  await act(async()=>{Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype,'value').set.call(input,'Unsaved owner title');input.dispatchEvent(new window.Event('input',{bubbles:true}));});
  let confirms=0;window.confirm=()=>{confirms++;return false;};await back();
  assert.equal(window.location.pathname,'/admin');assert.equal(input.value,'Unsaved owner title');assert.equal(confirms,1);assert.ok(host.querySelector('.cms-admin'));
  let releaseImport;window.confirm=()=>{confirms++;return true;};const count=confirms;
  await act(async()=>{const file=host.querySelector('[name="import-draft"]');Object.defineProperty(file,'files',{configurable:true,value:[{size:2,text:()=>new Promise(resolve=>{releaseImport=resolve;})}]});file.dispatchEvent(new window.Event('change',{bubbles:true}));});
  await back();assert.equal(window.location.pathname,'/admin');assert.equal(confirms,count);assert.equal(input.value,'Unsaved owner title');
  await act(async()=>releaseImport('{}'));await settle();
  await act(async()=>{const file=host.querySelector('.cms-admin-upload input[type="file"]');Object.defineProperty(file,'files',{configurable:true,value:[new File([new Uint8Array([1,2])],'test.png',{type:'image/png'})]});file.dispatchEvent(new window.Event('change',{bubbles:true}));});
  await act(async()=>[...host.querySelectorAll('.cms-admin-upload button')].find(button=>button.textContent==='Upload photo').click());await wait(()=>releaseUpload);
  await back();assert.equal(window.location.pathname,'/admin');assert.equal(confirms,count);assert.equal(input.value,'Unsaved owner title');
  await act(async()=>releaseUpload());await settle();
  await back();assert.equal(window.location.pathname,'/');assert.equal(host.querySelector('.cms-admin'),null);assert.equal(confirms,count+1);
  await act(async()=>{window.history.forward();await new Promise(resolve=>setTimeout(resolve,20));});await wait(()=>host.querySelector('[data-path="pages.home.title.en"]'));
  assert.equal(window.location.pathname,'/admin');assert.equal(host.querySelector('[data-path="pages.home.title.en"]').value,'Published home');
  assert.deepEqual(writes,['/api/admin/media'],'history never silently saves or publishes');
 } finally {
  await act(async()=>root.unmount());globalThis.fetch=savedFetch;await window.happyDOM.close();
  for(const [key,descriptor]of originals)if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];delete globalThis.IS_REACT_ACT_ENVIRONMENT;
 }
});
