// End-to-end browser proof against disposable local Cloudflare state. Never touches the owner preview or production.
import assert from 'node:assert/strict';
import { mkdtemp, cp, rm } from 'node:fs/promises';
import path from 'node:path';
import net from 'node:net';
import { startPreview } from './cms-preview.mjs';
import puppeteer from '/home/ubuntu/.npm/_npx/ffe2131771d88588/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';
const root=path.resolve(import.meta.dirname,'..');
const scratch=process.env.TMPDIR??'/home/ubuntu/.hermes/profiles/website-builder/cache/scratch';
const temporary=await mkdtemp(path.join(scratch,'cms-browser-publish-proof-'));
const freePort=()=>new Promise((resolve,reject)=>{const server=net.createServer();server.once('error',reject);server.listen(0,'127.0.0.1',()=>{const port=server.address().port;server.close(()=>resolve(port));});});
const ports=new Set();while(ports.size<3)ports.add(await freePort());
const [port,upstream,inspector]=[...ports];
const options={port,upstream,inspector,state:path.join(temporary,'state'),assetsDirectory:path.join(temporary,'assets')};
let preview,browser,stage='start';
const started=Date.now();const mark=value=>{stage=value;console.log(`Proof: ${value} (${Date.now()-started}ms)`);};
const markers={en:'CMS verified English heading',fr:'Titre de vérification du CMS',es:'Título de verificación del CMS'};
const read=async pathname=>{const response=await fetch(preview.url+pathname);assert.equal(response.status,200);return response.json();};
try{
 await cp(path.join(root,'dist'),options.assetsDirectory,{recursive:true});
 preview=await startPreview(options);
 const initial=await read('/api/admin/content');
 const initialPublic=(await read('/api/cms/document')).document;
 const home=initial.document.pages.find(page=>page.id==='home'),hero=home.sections.find(section=>section.type==='hero');assert.ok(hero);
 const executablePath=process.arch==='arm64'?'/home/ubuntu/.cache/ms-playwright/chromium-1248/chrome-linux-arm64/chrome':'/home/ubuntu/.cache/ms-playwright/chromium-1234/chrome-linux/chrome';
 browser=await puppeteer.launch({executablePath,headless:true,timeout:90000,userDataDir:path.join(temporary,'browser'),protocolTimeout:90000,args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--renderer-process-limit=2']});
 const editor=await browser.newPage(),publicPage=await browser.newPage(),errors=[],writes=[],cspViolations=[];
 for(const page of [editor,publicPage]){await page.emulateTimezone('Europe/Madrid');await page.setViewport({width:1440,height:1000});page.on('pageerror',error=>errors.push(error.message));page.on('console',message=>{if(message.type()==='error'&&/Content Security Policy|Refused to (?:execute|load|apply|connect|frame)/i.test(message.text()))cspViolations.push(message.text());});}
 editor.on('request',request=>{if(!['GET','HEAD'].includes(request.method()))writes.push({method:request.method(),path:new URL(request.url()).pathname});});
 const loadEditor=async()=>{await editor.bringToFront();await editor.goto(preview.url+'/admin',{waitUntil:'domcontentloaded',timeout:90000});await editor.waitForSelector('[data-admin-status=ready]');};
 const visiblePublic=async(locale)=>{
  await publicPage.bringToFront();
  const response=await publicPage.goto(preview.url+(locale==='en'?'/':`/${locale}`),{waitUntil:'domcontentloaded',timeout:90000});
  assert.equal(response.status(),200,`public ${locale} navigation failed`);
  try {await publicPage.waitForSelector('.cms-page');}
  catch(error){
   console.error(JSON.stringify({stage,locale,status:response.status(),errors,cspViolations,publicPage:await publicPage.evaluate(()=>({text:document.body.innerText.slice(0,1200),snapshot:Boolean(document.getElementById('cms-published-document')),scripts:[...document.scripts].map(script=>script.getAttribute('src')).filter(Boolean)}))}));
   throw error;
  }
  return publicPage.$eval('.cms-page',node=>node.innerText);
 };
 const replace=async(selector,value)=>{await editor.click(selector);await editor.keyboard.down('Control');await editor.keyboard.press('A');await editor.keyboard.up('Control');await editor.keyboard.type(value);};
 mark('load editor');await loadEditor();await editor.select('[name=current-section]',hero.id);
 for(const locale of ['en','fr','es']){
  mark(`edit ${locale}`);
  await editor.click(`[data-locale=${locale}]`);mark(`type ${locale}`);
  await replace(`[data-path="pages.home.sections.${hero.id}.title.${locale}"]`,markers[locale]);
  await editor.waitForFunction(value=>document.querySelector('[data-preview] iframe').contentDocument.body.textContent.includes(value),{},markers[locale]);
 }
 mark('save draft');const draftSaved=editor.waitForResponse(response=>response.request().method()==='PUT'&&response.url().endsWith('/content/draft'));
 await editor.click('[name=save-draft]');assert.equal((await draftSaved).status(),200);
 const saved=await read('/api/admin/content');
 assert.deepEqual(saved.document.pages.find(page=>page.id==='home').sections.find(section=>section.id===hero.id).title,markers);
 assert.equal(saved.publishedRevision,initial.publishedRevision);
 mark('draft stays private');for(const locale of ['en','fr','es'])assert.ok(!(await visiblePublic(locale)).includes(markers[locale]),'save draft must stay private');
 mark('reload saved editor');await editor.bringToFront();await editor.reload({waitUntil:'domcontentloaded',timeout:90000});await editor.waitForSelector('[data-admin-status=ready]');
 assert.equal(await editor.$eval(`[data-path="pages.home.sections.${hero.id}.title.en"]`,node=>node.value),markers.en);
 mark('publish');const publication=editor.waitForResponse(response=>response.request().method()==='POST'&&response.url().endsWith('/content/publish'));
 await editor.click('[name=publish]');assert.equal((await publication).status(),200);
 const publishedState=await read('/api/admin/content');
 assert.equal(publishedState.publishedRevision,publishedState.version,'publish must move the durable public pointer');
 const publishedDocument=(await read('/api/cms/document')).document;
 assert.deepEqual(publishedDocument.pages.find(page=>page.id==='home').sections.find(section=>section.id===hero.id).title,markers,'the public API must expose exactly the saved multilingual headings');
 for(const locale of ['en','fr','es']){mark(`check published ${locale}`);assert.ok((await visiblePublic(locale)).includes(markers[locale]),'published changes must render in an independent public browser');}
 mark('restart durable state');const beforeRestart=await read('/api/admin/content');
 await preview.close();preview=null;preview=await startPreview(options);
 const afterRestart=await read('/api/admin/content');assert.deepEqual(afterRestart,beforeRestart,'saved content and published pointer survive a Worker restart');
 for(const locale of ['en','fr','es'])assert.ok((await visiblePublic(locale)).includes(markers[locale]));
 mark('rollback from editor');await loadEditor();await editor.click('[data-workspace-tab=history]');await replace('[name=rollback-revision]',String(initial.publishedRevision));
 const rollback=editor.waitForResponse(response=>response.request().method()==='POST'&&response.url().endsWith('/content/rollback'));
 await editor.click('[name=rollback]');assert.equal((await rollback).status(),200);mark('rollback response received');
 const restored=await read('/api/cms/document');assert.deepEqual(restored.document,initialPublic,'rollback restores the exact original public projection');
 assert.deepEqual((await read('/api/admin/content')).document,initial.document,'rollback also restores the complete stored document');
 for(const locale of ['en','fr','es']){mark(`check rolled-back ${locale}`);assert.ok(!(await visiblePublic(locale)).includes(markers[locale]),'rollback must update the public website too');}
 mark('verify browser security results');
 assert.deepEqual(errors,[]);assert.deepEqual(cspViolations,[]);
 console.log(JSON.stringify({ok:true,scope:'disposable local Cloudflare Worker; production code, not production identity or infrastructure',browserEditedLocales:Object.keys(markers),unsavedLivePreview:true,savePersistsAcrossBrowserReload:true,draftNotPublic:true,publishChangesIndependentPublicBrowser:true,workerRestartPreservesSavedAndPublishedContent:true,rollbackRestoresExactPublicDocument:true,realLocalD1:true,writes,errors,cspViolations,ownerStateUntouched:true,productionUntouched:true},null,2));
}catch(error){console.error(`Failed at: ${stage}`);throw error;}finally{if(browser)await browser.close();if(preview)await preview.close();await rm(temporary,{recursive:true,force:true});}
