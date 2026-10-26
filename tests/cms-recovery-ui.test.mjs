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
const until=async(predicate,label)=>{const deadline=Date.now()+5000;while(!predicate()){assert.ok(Date.now()<deadline,`Timed out: ${label}; ${host?.textContent}`);await act(async()=>{await new Promise(resolve=>setTimeout(resolve,10));});}};
const cleanup=async()=>{if(root)await act(async()=>root.unmount());host?.remove();};after(async()=>{await window.happyDOM.abort();});

test('recovery controls verify an archive, restore the selected version as a private draft and require clean editor state',async()=>{
 await render(true);try{const input=document.querySelector('[name="backup-file"]');Object.defineProperty(input,'files',{configurable:true,value:[new File([archive],'site.fezcms',{type:'application/octet-stream'})]});await act(async()=>{input.dispatchEvent(new window.Event('change',{bubbles:true}));});await until(()=>document.querySelector('[name="restore-archive"]')&&!document.querySelector('[name="backup-file"]').disabled,'archive verified');assert.equal(document.querySelector('[name="restore-archive"]').disabled,true);}finally{await cleanup();}
 await render(false);const calls=[];window.confirm=()=>true;globalThis.fetch=async(path,init={})=>{const body=init.body&&typeof init.body==='string'?JSON.parse(init.body):init.body;calls.push({path,method:init.method,body});if(path==='/api/admin/recovery/restore')return Response.json({id:'a'.repeat(32)});if(path.endsWith('/manifest'))return Response.json({missing:body.manifest.map((_,i)=>i)});if(path.endsWith('/part'))return Response.json({stored:true});if(path.endsWith('/advance'))return Response.json({ready:true});if(path.endsWith('/commit'))return Response.json({version:2,draftRevision:2,published:false});throw Error(path);};
 try{const input=document.querySelector('[name="backup-file"]');Object.defineProperty(input,'files',{configurable:true,value:[new File([archive], 'site.fezcms',{type:'application/octet-stream'})]});await act(async()=>{input.dispatchEvent(new window.Event('change',{bubbles:true}));});await until(()=>document.querySelector('[name="restore-revision"]')&&!document.querySelector('[name="backup-file"]').disabled,'archive verified');assert.ok(document.querySelector('[name="restore-revision"] option[value="1"]'));const button=document.querySelector('[name="restore-archive"]');assert.equal(button.disabled,false);await act(async()=>{button.dispatchEvent(new window.MouseEvent('click',{bubbles:true}));});await until(()=>restored||errors.length,'restore terminal result');assert.equal(restored,1,`calls=${JSON.stringify(calls)} errors=${JSON.stringify(errors)} text=${document.body.textContent}`);assert.equal(calls.at(-1).path,'/api/admin/recovery/restore/'+'a'.repeat(32)+'/commit');assert.equal(calls[0].body.expectedVersion,1);assert.equal(calls.some(c=>c.path.endsWith('/commit')&&c.body.published===true),false);assert.ok(busy.includes(true)&&busy.at(-1)===false);}finally{await cleanup();}
});

test('unused-media report stays advisory and never sends a delete operation',async()=>{
 await render(false);const calls=[];globalThis.fetch=async(path,init={})=>{calls.push({path,method:init.method});return Response.json({fence:'{}',objects:[],cursor:null,dryRun:true,deleted:0});};
 try{const button=document.querySelector('[name="scan-orphans"]');await act(async()=>{button.dispatchEvent(new window.MouseEvent('click',{bubbles:true}));});await until(()=>document.body.textContent.includes('No files deleted'),'scan complete');assert.equal(calls.length,1);assert.equal(calls[0].method,'GET');assert.equal(calls.some(c=>c.method!=='GET'),false);assert.match(document.body.textContent,/No files deleted/);}finally{await cleanup();}
});
test('mounted CMS History tab exposes and completes the private recovery workflow',async()=>{
 const savedFetch=globalThis.fetch,requests=[];let version=1;const published=1;
 const fakeFetch=async(path,init={})=>{const route=String(path),method=init.method??'GET',body=typeof init.body==='string'?JSON.parse(init.body):init.body;requests.push({route,method,body});
  if(route==='/api/admin/content?read=meta')return Response.json({version,draftRevision:version,publishedRevision:published,document:seed});
  if(route==='/api/admin/content/revisions')return Response.json({revisions:[...(version===2?[{version:2,kind:'draft',actor:'owner',created_at:'restored',source_revision:1}]:[]),{version:1,kind:'draft',actor:'owner',created_at:'original',source_revision:null}]});
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
  await until(()=>host.querySelector('[data-workspace-tab="history"]'),'mounted editor');
  const history=host.querySelector('[data-workspace-tab="history"]');assert.ok(history,'real AdminApp mounted its History tab');
  await act(async()=>history.click());assert.ok(host.querySelector('[name="download-backup"]'),'recovery controls appear inside the selected History workspace');
  const input=host.querySelector('[name="backup-file"]');Object.defineProperty(input,'files',{configurable:true,value:[new File([archive],'site.fezcms',{type:'application/octet-stream'})]});
  await act(async()=>{input.dispatchEvent(new window.Event('change',{bubbles:true}));});
  await until(()=>host.querySelector('[name="restore-archive"]')&&!host.querySelector('[name="restore-archive"]').disabled,'verified archive');
  const restore=host.querySelector('[name="restore-archive"]');assert.ok(restore&&!restore.disabled,'clean loaded draft can restore a verified archive');
  await act(async()=>{restore.click();});
  await until(()=>host.querySelector('[data-revision="2"]')&&[...host.querySelectorAll('li button')].some(button=>button.textContent==='Revision 2 (draft)'),'restored revision AND History row');
  assert.equal(version,2);assert.equal(published,1);assert.ok(host.querySelector('[data-revision="2"]'),'the restored revision is read back into the mounted editor');
  assert.equal(requests.some(item=>item.route==='/api/admin/content/publish'||item.route==='/api/admin/content/preparations'),false,'restore never publishes');
  assert.equal(requests.at(-3).route,'/api/admin/recovery/restore/'+'b'.repeat(32)+'/commit');assert.equal(requests.at(-2).route,'/api/admin/content?read=meta');assert.equal(requests.at(-1).route,'/api/admin/content/revisions');
 }finally{await act(async()=>root.unmount());host.remove();globalThis.fetch=savedFetch;}
});

// Happy DOM emulator only: confirm is a deterministic stub, not a native dialog.
const named=name=>host.querySelector(`[name="${name}"]`);
const click=async element=>{assert.ok(element);await act(async()=>element.click());};
async function verifyArchive(){const input=named('backup-file');Object.defineProperty(input,'files',{configurable:true,value:[new File([archive],'synthetic.fezcms')]});await act(async()=>input.dispatchEvent(new window.Event('change',{bubbles:true})));await until(()=>named('restore-archive')&&!named('backup-file').disabled,'archive verification completed');}
async function mountedRecovery(handler){
 const previous={fetch:globalThis.fetch,windowFetch:window.fetch,confirm:window.confirm};const requests=[];
 const fake=async(path,init={})=>{const route=String(path),method=init.method??'GET',body=typeof init.body==='string'?JSON.parse(init.body):init.body;requests.push({route,method,body});
  const custom=await handler?.(route,body);if(custom)return custom;
  if(route==='/api/admin/content?read=meta')return Response.json({version:1,draftRevision:1,publishedRevision:1,document:seed});
  if(route==='/api/admin/content/revisions')return Response.json({revisions:[{version:1,kind:'draft',actor:'synthetic',created_at:'original',source_revision:null}]});
  if(route==='/api/admin/recovery/restore')return Response.json({id:'c'.repeat(32)});
  if(route.endsWith('/manifest'))return Response.json({missing:body.manifest.map((_,i)=>i)});
  if(route.endsWith('/part'))return Response.json({stored:true});
  if(route.endsWith('/advance'))return Response.json({ready:true});
  throw Error(`Unexpected ${method} ${route}`);
 };
 globalThis.fetch=window.fetch=fake;window.confirm=()=>true;
 host=document.createElement('div');document.body.append(host);root=createRoot(host);
 await act(async()=>root.render(h(AdminApp,{language:'en',onClose:()=>{}})));
 await until(()=>host.querySelector('[data-workspace-tab="history"]'),'editor ready');
 await click(host.querySelector('[data-workspace-tab="history"]'));await verifyArchive();
 return {requests,close:async()=>{await cleanup();globalThis.fetch=previous.fetch;window.fetch=previous.windowFetch;window.confirm=previous.confirm;}};
}
async function editAndExport(){
 // Import a synthetic unsaved edit through the real mounted DraftTransfer, then
 // capture the actual export Blob; no owner data or filesystem archive.
 const edited=structuredClone(seed);edited.theme.radius=seed.theme.radius==='pill'?'square':'pill';
 const input=named('import-draft');Object.defineProperty(input,'files',{configurable:true,value:[new File([JSON.stringify(edited)],'unsaved.json')]});
 await act(async()=>input.dispatchEvent(new window.Event('change',{bubbles:true})));
 await until(()=>!named('export-draft').disabled&&host.textContent.includes('Unsaved changes.'),'unsaved edit accepted');
 const old=URL.createObjectURL;let blob;URL.createObjectURL=value=>{blob=value;return 'blob:synthetic-export';};
 try{await click(named('export-draft'));assert.ok(blob,'real export action produced a Blob');assert.deepEqual(JSON.parse(await blob.text()),edited);}finally{URL.createObjectURL=old;}
 assert.equal(named('save-draft').disabled,false);assert.equal(named('restore-archive').disabled,true,'unsaved draft blocks another restore');
}
test('cancelled confirmation sends zero writes and leaves the mounted editor usable',async()=>{
 const session=await mountedRecovery();try{let confirms=0;window.confirm=()=>{confirms++;return false;};await click(named('restore-archive'));assert.equal(confirms,1);assert.equal(session.requests.filter(r=>r.method!=='GET').length,0);assert.equal(named('save-draft').disabled,false);window.confirm=()=>true;await editAndExport();assert.equal(session.requests.filter(r=>r.method!=='GET').length,0);}finally{await session.close();}
});
test('pending restore locks competing write, import, export and recovery controls until terminal error',async()=>{
 let release;const gate=new Promise(resolve=>{release=resolve;});
 const session=await mountedRecovery(async route=>route==='/api/admin/recovery/restore'?await gate:undefined);
 try{await click(named('restore-archive'));await until(()=>session.requests.some(r=>r.route==='/api/admin/recovery/restore'),'pending restore request');
  for(const name of ['save-draft','publish','rollback','import-draft','export-draft','backup-file','download-backup','restore-revision','restore-archive','scan-orphans'])assert.equal(named(name).disabled,true,`${name} is locked`);
  for(const name of ['save-draft','publish','rollback','restore-archive'])await click(named(name));
  assert.equal(session.requests.filter(r=>r.method!=='GET').length,1,'no competing request');release(Response.json({error:'synthetic_pending_failure'},{status:503}));
  await until(()=>!named('backup-file').disabled&&host.textContent.includes('synthetic_pending_failure'),'pending request failure surfaced and unlocked');await editAndExport();
 }finally{release(Response.json({error:'cleanup'},{status:503}));await session.close();}
});
for(const failure of ['interrupted commit','failed commit','failed readback'])test(`${failure} preserves mounted draft, allows unsaved export and never publishes or automatically replays`,async t=>{
 let committed=false;
 const session=await mountedRecovery(async route=>{
  if(route.endsWith('/commit')){committed=true;if(failure==='interrupted commit')throw new TypeError('synthetic_connection_lost');if(failure==='failed commit')return Response.json({error:'synthetic_commit_failed'},{status:503});return Response.json({version:2,draftRevision:2,published:false});}
  if(route==='/api/admin/content?read=meta'&&committed)return Response.json({error:'synthetic_readback_failed'},{status:503});
  if(route==='/api/admin/content/draft')return Response.json({error:'synthetic_draft_failed'},{status:503});
 });
 try{await click(named('restore-archive'));await until(()=>committed&&!named('backup-file').disabled&&host.querySelector('[role="alert"]'),'error surfaced and recovery unlocked');
  assert.equal(named('current-page').value,'home');
  if(failure==='failed readback'){
   assert.equal(host.textContent.includes('Private draft restored. The public version was not changed.'),false,'failed readback cannot announce success');
   assert.ok(host.textContent.includes('Unsaved changes.'),'displayed pre-restore draft must no longer look saved');
   assert.match(host.querySelector('.cms-version-details').textContent,/Version 2\. Draft revision 2\. Published revision 1\./,'confirmed private write advances local concurrency without changing public pointer');
   await click(named('publish'));
   await until(()=>host.textContent.includes('synthetic_draft_failed')&&!named('publish').disabled,'failed private save blocks follow-on publication');
   const save=session.requests.find(r=>r.route==='/api/admin/content/draft');
   assert.equal(save.method,'PUT');assert.equal(save.body.expectedVersion,2);assert.deepEqual(save.body.document,seed,'Publish first attempts to save the exact still-displayed document');
   assert.ok(host.textContent.includes('Unsaved changes.'));
  }
  assert.equal(host.querySelector('[data-revision="2"]'),null,'no successful readback notice');
  const before=session.requests.length;await editAndExport();await act(async()=>{});assert.equal(session.requests.length,before,'editing/export cannot replay recovery');
  assert.equal(session.requests.filter(r=>r.route.endsWith('/commit')).length,1);
  assert.equal(session.requests.filter(r=>r.route==='/api/admin/recovery/restore').length,1);
  assert.equal(session.requests.some(r=>/publish|preparations/.test(r.route)),false);
 }finally{await session.close();}
});
