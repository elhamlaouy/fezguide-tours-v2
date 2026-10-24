import assert from 'node:assert/strict';import {test,after} from 'node:test';import {Window} from 'happy-dom';import {File} from 'node:buffer';import {register} from 'tsx/esm/api';import {registerHooks} from 'node:module';register();registerHooks({load(url,context,next){return url.endsWith('.css')?{format:'module',source:'export default "";',shortCircuit:true}:next(url,context);}});
const assign=(key,value)=>Object.defineProperty(globalThis,key,{configurable:true,writable:true,value});
const window=new Window({url:'https://editor.test/admin'});assign('window',window);assign('document',window.document);assign('navigator',window.navigator);assign('HTMLElement',window.HTMLElement);assign('Event',window.Event);assign('CustomEvent',window.CustomEvent);assign('IS_REACT_ACT_ENVIRONMENT',true);
const React=await import('react'),{act,createElement:h}=React,{createRoot}=await import('react-dom/client');
const {RecoveryTools}=await import('../src/admin/RecoveryTools.tsx');
const {AdminApp}=await import('../src/admin/AdminApp.tsx');
const {createCmsSeed}=await import('../src/cms/seed.ts');
const {packBackup}=await import('../src/admin/recovery-api.ts');
const seed=createCmsSeed();for(const [key,value]of Object.entries(seed))if(Array.isArray(value))seed[key]=[];for(const[key,value]of Object.entries(seed.legacy))if(Array.isArray(value))seed.legacy[key]=[];seed.pages=[{...createCmsSeed().pages.find(page=>page.id==='home'),sections:[]}];seed.footer.links=[];seed.uiCopy={};
const archive=await packBackup({version:1,draftRevision:1,publishedRevision:null,origin:'https://source.test'},[{type:'revision',version:1,kind:'draft',actor:'owner',created_at:'original',source_revision:null,blob:new Blob([JSON.stringify(seed)])}]);
let host,root,restored=0,busy=[],errors=[];const render=async(dirty=false)=>{host=document.createElement('div');document.body.append(host);root=createRoot(host);await act(async()=>root.render(h(RecoveryTools,{language:'en',document:seed,version:1,dirty,disabled:false,onBusyChange:value=>busy.push(value),onError:error=>errors.push(error),onRestored:async()=>{restored++;}})));};
const cleanup=async()=>{if(root)await act(async()=>root.unmount());host?.remove();};after(async()=>{await window.happyDOM.abort();});

test('recovery controls verify an archive, restore the selected version as a private draft and require clean editor state',async()=>{
 await render(true);try{const input=document.querySelector('[name="backup-file"]');Object.defineProperty(input,'files',{configurable:true,value:[new File([archive],'site.fezcms',{type:'application/octet-stream'})]});await act(async()=>{input.dispatchEvent(new window.Event('change',{bubbles:true}));await new Promise(resolve=>setTimeout(resolve,100));});assert.equal(document.querySelector('[name="restore-archive"]').disabled,true);}finally{await cleanup();}
 await render(false);const calls=[];window.confirm=()=>true;globalThis.fetch=async(path,init={})=>{const body=init.body&&typeof init.body==='string'?JSON.parse(init.body):init.body;calls.push({path,method:init.method,body});if(path==='/api/admin/recovery/restore')return Response.json({id:'a'.repeat(32)});if(path.endsWith('/manifest'))return Response.json({missing:body.manifest.map((_,i)=>i)});if(path.endsWith('/part'))return Response.json({stored:true});if(path.endsWith('/advance'))return Response.json({ready:true});if(path.endsWith('/commit'))return Response.json({version:2,draftRevision:2,published:false});throw Error(path);};
 try{const input=document.querySelector('[name="backup-file"]');Object.defineProperty(input,'files',{configurable:true,value:[new File([archive], 'site.fezcms',{type:'application/octet-stream'})]});await act(async()=>{input.dispatchEvent(new window.Event('change',{bubbles:true}));await new Promise(resolve=>setTimeout(resolve,100));});assert.ok(document.querySelector('[name="restore-revision"] option[value="1"]'));const button=document.querySelector('[name="restore-archive"]');assert.equal(button.disabled,false);await act(async()=>{button.dispatchEvent(new window.MouseEvent('click',{bubbles:true}));for(let i=0;i<200&&!restored&&!errors.length;i++)await new Promise(resolve=>setTimeout(resolve,20));});assert.equal(restored,1,`calls=${JSON.stringify(calls)} errors=${JSON.stringify(errors)} text=${document.body.textContent}`);assert.equal(calls.at(-1).path,'/api/admin/recovery/restore/'+'a'.repeat(32)+'/commit');assert.equal(calls[0].body.expectedVersion,1);assert.equal(calls.some(c=>c.path.endsWith('/commit')&&c.body.published===true),false);assert.ok(busy.includes(true)&&busy.at(-1)===false);}finally{await cleanup();}
});

test('unused-media report stays advisory and never sends a delete operation',async()=>{
 await render(false);const calls=[];globalThis.fetch=async(path,init={})=>{calls.push({path,method:init.method});return Response.json({fence:'{}',objects:[],cursor:null,dryRun:true,deleted:0});};
 try{const button=document.querySelector('[name="scan-orphans"]');await act(async()=>{button.dispatchEvent(new window.MouseEvent('click',{bubbles:true}));await new Promise(resolve=>setTimeout(resolve,80));});assert.equal(calls.length,1);assert.equal(calls[0].method,'GET');assert.equal(calls.some(c=>c.method!=='GET'),false);assert.match(document.body.textContent,/No files deleted/);}finally{await cleanup();}
});
test('mounted CMS History tab exposes and completes the private recovery workflow',async()=>{
 const savedFetch=globalThis.fetch,requests=[];let version=1;const published=1;
 const fakeFetch=async(path,init={})=>{const route=String(path),method=init.method??'GET',body=typeof init.body==='string'?JSON.parse(init.body):init.body;requests.push({route,method,body});
  if(route==='/api/admin/content')return Response.json({version,draftRevision:version,publishedRevision:published,document:seed});
  if(route==='/api/admin/content/revisions')return Response.json({revisions:[{version:1,kind:'draft',actor:'owner',created_at:'original',source_revision:null}]});
  if(route==='/api/admin/recovery/restore')return Response.json({id:'b'.repeat(32)});
  if(route.endsWith('/manifest'))return Response.json({missing:body.manifest.map((_,i)=>i)});
  if(route.endsWith('/part'))return Response.json({stored:true});
  if(route.endsWith('/advance'))return Response.json({ready:true});
  if(route.endsWith('/commit')){version=2;return Response.json({version:2,draftRevision:2,published:false});}
  throw Error(`unexpected request ${method} ${route}`);
 };
 globalThis.fetch=fakeFetch;window.fetch=fakeFetch;window.confirm=()=>true;host=document.createElement('div');document.body.append(host);root=createRoot(host);
 try{
  await act(async()=>root.render(h(AdminApp,{language:'en',onClose:()=>{}})));
  for(let i=0;i<100&&!host.querySelector('[data-workspace-tab="history"]');i++)await act(async()=>new Promise(resolve=>setTimeout(resolve,20)));
  const history=host.querySelector('[data-workspace-tab="history"]');assert.ok(history,'real AdminApp mounted its History tab');
  await act(async()=>history.click());assert.ok(host.querySelector('[name="download-backup"]'),'recovery controls appear inside the selected History workspace');
  const input=host.querySelector('[name="backup-file"]');Object.defineProperty(input,'files',{configurable:true,value:[new File([archive],'site.fezcms',{type:'application/octet-stream'})]});
  await act(async()=>{input.dispatchEvent(new window.Event('change',{bubbles:true}));for(let i=0;i<100&&!host.querySelector('[name="restore-revision"]');i++)await new Promise(resolve=>setTimeout(resolve,20));});
  const restore=host.querySelector('[name="restore-archive"]');assert.ok(restore&&!restore.disabled,'clean loaded draft can restore a verified archive');
  await act(async()=>{restore.click();for(let i=0;i<200&&version!==2;i++)await new Promise(resolve=>setTimeout(resolve,20));});
  for(let i=0;i<100&&!host.querySelector('[data-revision="2"]');i++)await act(async()=>new Promise(resolve=>setTimeout(resolve,20)));
  assert.equal(version,2);assert.equal(published,1);assert.ok(host.querySelector('[data-revision="2"]'),'the restored revision is read back into the mounted editor');
  assert.equal(requests.some(item=>item.route==='/api/admin/content/publish'||item.route==='/api/admin/content/preparations'),false,'restore never publishes');
  assert.equal(requests.at(-3).route,'/api/admin/recovery/restore/'+'b'.repeat(32)+'/commit');assert.equal(requests.at(-2).route,'/api/admin/content');assert.equal(requests.at(-1).route,'/api/admin/content/revisions');
 }finally{await act(async()=>root.unmount());host.remove();globalThis.fetch=savedFetch;await window.happyDOM.close();}
});
