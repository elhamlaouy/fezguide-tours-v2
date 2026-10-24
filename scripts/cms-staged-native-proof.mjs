// Disposable local workerd/D1/R2/ASSETS proof. Never imported by production.
// Run after a verified Vite build: node scripts/cms-staged-native-proof.mjs /absolute/build/path
import assert from 'node:assert/strict';
import {computeReleaseIdentity} from './cms-release-identity.mjs';
import {readFile,mkdtemp,rm,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import path from 'node:path';
import {register} from 'tsx/esm/api';
register();
const root=path.resolve(import.meta.dirname,'..');
const require=createRequire(import.meta.url);
// Use the runtime/bundler already locked with this project's Wrangler; no install.
const {Miniflare}=await import(require.resolve('miniflare'));
const {build}=await import(require.resolve('esbuild'));
const {createCmsSeed}=await import('../src/cms/seed.ts');
const {splitCmsDocument}=await import('../src/cms/document-parts.ts');
const {downloadPortableBackup,openBackup,packBackup,restorePortableArchive}=await import('../src/admin/recovery-api.ts');
const hash=value=>createHash('sha256').update(value).digest('hex');
const actualRelease=process.argv.includes('--actual-release');
const assetsDirectory=path.resolve(process.argv.slice(2).find(arg=>!arg.startsWith('--'))??path.join(root,'dist'));
if(actualRelease)assert.equal(assetsDirectory,path.join(root,'dist'),'actual release must use current project dist');
const release=actualRelease?await computeReleaseIdentity(root):null;
const shell=await readFile(path.join(assetsDirectory,'index.html'),'utf8');
if(release){
  assert.equal(hash(shell),release.CMS_SHELL_ID);
  assert.notEqual(release.CMS_ASSET_ID,release.CMS_SHELL_ID);
  console.log(JSON.stringify({actualRelease:true,release,fixtureSeams:{auth:'synthetic signed local Access identity/JWKS',origin:'local test canonical/delivery/editor origins',storage:'disposable local D1/R2/Images; synthetic content, no owner data'},remoteWrites:false}));
}
const redirects=process.argv.includes('--redirects')?JSON.stringify({'old-home':'home'}):undefined;
const uploads=process.argv.includes('--uploads');
const crossHost=process.argv.includes('--cross-host');
const localRecovery=process.argv.includes('--local-recovery');
const historyAdmission=process.argv.includes('--history-admission');
const bootstrapProof=process.argv.includes('--bootstrap');
if(crossHost && (bootstrapProof || historyAdmission || localRecovery))throw new Error('--cross-host currently supports the default lifecycle plus --uploads/--redirects/--long-article only; bootstrap/history/local-recovery require separate runs');
const longArticle=process.argv.includes('--long-article'),firstText='é'.repeat(20_000),secondText='ß'.repeat(20_000);
const origin='https://native.fixture.test',bootstrapOrigin='https://bootstrap.native.fixture.test',issuer='https://native-staged.cloudflareaccess.com';
const audience='native-staged-disposable',subject='native-staged-owner';
const pair=await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']);
const jwk={...await crypto.subtle.exportKey('jwk',pair.publicKey),kid:crypto.randomUUID(),alg:'RS256',use:'sig'};
const policy=hash(await readFile(path.join(root,'src/cms/schema.ts')));
const scratch=process.env.TMPDIR;
assert.ok(scratch,'TMPDIR must be the configured profile scratch directory');
const temporary=await mkdtemp(path.join(scratch,'cms-staged-native-'));
let mf;
try {
  const appOrigin='https://app.native.fixture.test',adminOrigin=crossHost?appOrigin:origin;
  const adminDispatches=[];
  const source=`import main from ${JSON.stringify(path.join(root,'worker/index.ts'))};
import app from ${JSON.stringify(path.join(root,'worker/app.ts'))};
export default {async fetch(request,env){
 const requestOrigin=new URL(request.url).origin;
 // Fixture-only invariant: no admin request may accidentally hit the public handler.
 if(${crossHost} && new URL(request.url).pathname.startsWith('/api/admin/') && requestOrigin!==${JSON.stringify(appOrigin)})throw new Error('cross-host admin request misrouted to public handler');
 if(${crossHost} && request.headers.get('X-Native-Negative')==='delivery')env={...env,CMS_PUBLIC_DELIVERY_ORIGIN:${JSON.stringify(appOrigin)}};
 if(${crossHost} && request.headers.get('X-Native-Negative')==='catalog')env={...env,CMS_RENDERER_ID:'wrong-native-renderer'};
 if(requestOrigin===${JSON.stringify(appOrigin)})return app.fetch(request,{...env,CMS_PUBLIC_DELIVERY_ORIGIN:${JSON.stringify(crossHost?origin:appOrigin)}});
 if(requestOrigin===${JSON.stringify(bootstrapOrigin)})return main.fetch(request,{...env,CMS_PROCESSING_MODE:undefined,CMS_PREPARATION_MODE:'bootstrap-v1'});
 return main.fetch(request,env);
}};`;
  const bundled=await build({stdin:{contents:source,resolveDir:root,sourcefile:'native-staged-fixture.ts',loader:'ts'},absWorkingDir:root,bundle:true,write:false,format:'esm',platform:'browser',target:'es2022',logLevel:'silent'});
  const values={ACCESS_TEAM_DOMAIN:'native-staged.cloudflareaccess.com',ACCESS_AUD:audience,ACCESS_ALLOWED_SUBJECTS:subject,CMS_PROCESSING_MODE:'staged-v1',CMS_VALIDATION_POLICY:policy,CMS_RENDERER_ID:release?.CMS_RENDERER_ID??'native-renderer-fixture',...(redirects?{CMS_SLUG_REDIRECTS:redirects}:{}),CMS_ASSET_ID:release?.CMS_ASSET_ID??hash('native-complete-dist-fixture'),CMS_SHELL_ID:release?.CMS_SHELL_ID??hash(shell),CANONICAL_ORIGIN:'https://fez-native.test',CMS_PUBLIC_DELIVERY_ORIGIN:origin};
  const env=Object.fromEntries(Object.entries(values).map(([name,value])=>[name,{type:'text',value}]));
  if(uploads)env.CMS_IMAGES={type:'images'};
  Object.assign(env,{CMS_DB:{type:'d1',id:'cms-staged-disposable'},CMS_MEDIA:{type:'r2',name:'cms-staged-disposable-media'},ASSETS:{type:'assets'}});
  const nativeOptions={telemetry:{enabled:false},resourcePersistencePath:path.join(temporary,'state'),isolatedResourcePersistencePath:path.join(temporary,'state'),resourceTmpPath:path.join(temporary,'runtime'),workers:[{config:{name:'cms-staged-native-fixture',compatibilityDate:'2026-10-01',manifest:{mainModule:'index.js',modules:{'index.js':{type:'esm',contents:bundled.outputFiles[0].text}}},env,assets:{directory:assetsDirectory,hasUserWorker:true,runWorkerFirst:true,notFoundHandling:'single-page-application'}},dev:{outboundService:{type:'fetcher',handler:async request=>request.url===issuer+'/cdn-cgi/access/certs'?new Response(JSON.stringify({keys:[jwk]}),{headers:{'Content-Type':'application/json'}}):new Response(null,{status:502})}}}]};
  mf=new Miniflare(nativeOptions);
  await mf.ready;
  const db=await mf.getD1Database('CMS_DB');
  // SQLite's own complete_statement handles trigger bodies and quoted semicolons.
  const parser="import sqlite3,json,sys\nout=[]\nfor name in sys.argv[1:]:\n text=open(name).read(); part=''\n for char in text:\n  part+=char\n  if char==';' and sqlite3.complete_statement(part):out.append(part);part=''\nprint(json.dumps(out))";
  const migrations=['0001_cms.sql','0002_media_budget.sql','0003_cms_release_safeguards.sql','0004_cms_prepared_publications.sql','0005_cms_recovery.sql','0006_cms_first_catalog_bootstrap.sql'].map(name=>path.join(root,'migrations',name));
  const statements=JSON.parse(execFileSync('python',['-c',parser,...migrations],{encoding:'utf8'}));
  for(const sql of statements)await db.prepare(sql).run();
  const b64=value=>Buffer.from(JSON.stringify(value)).toString('base64url');
  async function token(){const now=Math.floor(Date.now()/1000),data=`${b64({alg:'RS256',typ:'JWT',kid:jwk.kid})}.${b64({iss:issuer,aud:[audience],sub:subject,nbf:now-1,exp:now+600})}`;return `${data}.${Buffer.from(await crypto.subtle.sign('RSASSA-PKCS1-v1_5',pair.privateKey,new TextEncoder().encode(data))).toString('base64url')}`;}
  let writes=0,windowWrites=0,writeWindow=Date.now();
  async function paceWrite(){
    if(Date.now()-writeWindow>=60_000){writeWindow=Date.now();windowWrites=0;}
    if(windowWrites>=55){await new Promise(resolve=>setTimeout(resolve,60_100-(Date.now()-writeWindow)));writeWindow=Date.now();windowWrites=0;}
    windowWrites++;writes++;
  }
  async function callAt(target,url,method='GET',body,authenticated=true){
    if(url.startsWith('/api/admin/')){if(crossHost)assert.equal(target,appOrigin,'all admin requests use the actual app handler');adminDispatches.push({method,url,target});}
    if(!['GET','HEAD'].includes(method))await paceWrite();
    const response=await mf.dispatchFetch(target+url,{method,headers:{...(authenticated?{'Cf-Access-Jwt-Assertion':await token()}:{}),...(!['GET','HEAD'].includes(method)?{Origin:target,'Sec-Fetch-Site':'same-origin'}:{}),...(body===undefined?{}:{'Content-Type':'application/json'})},...(body===undefined?{}:{body:JSON.stringify(body)})});
    return response;
  }
  async function call(url,method='GET',body,authenticated=true){return callAt(url.startsWith('/api/admin/')?adminOrigin:origin,url,method,body,authenticated);}
  async function jsonAt(target,url,method='GET',body,authenticated=true){const response=await callAt(target,url,method,body,authenticated);const raw=await response.text();assert.equal(response.status,200,`${url}: ${response.status} ${raw.slice(0,160)}`);return JSON.parse(raw);}
  async function json(url,method='GET',body){const admin=url.startsWith('/api/admin/');return jsonAt(admin?adminOrigin:origin,url,method,body,admin);}
  assert.equal((await call('/api/admin/content','GET',undefined,false)).status,401);
  const appEntry=await mf.dispatchFetch(appOrigin+'/',{redirect:'manual'});assert.equal(appEntry.status,302);assert.equal(appEntry.headers.get('Location'),'/admin');
  assert.equal((await mf.dispatchFetch(appOrigin+'/admin')).status,401);
  const editor=await mf.dispatchFetch(appOrigin+'/admin',{redirect:'manual',headers:{'Cf-Access-Jwt-Assertion':await token()}});
  assert.equal(editor.status,200);assert.match(await editor.text(),/id="root"/);
  const duplicate=await mf.dispatchFetch(appOrigin+'/our-fez-tours');assert.equal(duplicate.status,404);assert.equal(duplicate.headers.get('X-Robots-Tag'),'noindex, nofollow');
  const initial=await json('/api/admin/content');assert.equal(initial.version,0);assert.equal(initial.processing,'staged-v1');
  const manifest=await call('/manifest.json','GET',undefined,false);assert.equal(manifest.status,200);assert.ok((await manifest.json()).name);
  const doc=createCmsSeed();
  for(const [key,value] of Object.entries(doc))if(Array.isArray(value))doc[key]=[];
  for(const [key,value] of Object.entries(doc.legacy))if(Array.isArray(value))doc.legacy[key]=[];
  doc.pages=[{...createCmsSeed().pages.find(page=>page.id==='home'),sections:[]}];doc.footer.links=[];
  doc.uiCopy={nativeSentinel:{en:'first public fixture',fr:'premier témoin',es:'primer testigo'}};
  if(longArticle)doc.pages.push({id:'long-article',kind:'editorial',slug:'long-article',enabled:true,title:{en:'Long article',fr:'Article long',es:'Artículo largo'},sections:[{id:'long-body',type:'richText',enabled:true,variant:'story',blocks:Array.from({length:15},()=>({type:'paragraph',text:{en:firstText,fr:firstText,es:firstText}}))},{id:'hidden-long-proof',type:'richText',enabled:false,variant:'story',blocks:[{type:'paragraph',text:{en:'NEVER_PUBLIC_LONG_ARTICLE_MARKER',fr:'private',es:'private'}}]}],seo:{title:{en:'Long article',fr:'Article long',es:'Artículo largo'},description:{en:'Native long article fixture',fr:'Article de test',es:'Artículo de prueba'}}});
  const verifyArticle=(document,expected)=>{const article=document.pages.find(p=>p.id==='long-article');assert.equal(article.sections.length,1);const blocks=article.sections[0].blocks;assert.equal(blocks.length,15);for(const [i,block]of blocks.entries()){assert.equal(block.text.en,i===0?expected:firstText);assert.equal(block.text.fr,firstText);assert.equal(block.text.es,firstText);}};
  const articleText=document=>document.pages.find(p=>p.id==='long-article').sections[0].blocks[0].text.en;
  if(bootstrapProof){
    assert.ok(!historyAdmission&&!localRecovery&&!longArticle,'bootstrap proof uses a dedicated disposable run');
    let uploaded;
    if(uploads){
      const {IMAGE_FIXTURES}=await import('../tests/fixtures/cms-upload.mjs');
      await paceWrite();
      const response=await mf.dispatchFetch(bootstrapOrigin+'/api/admin/media',{method:'POST',headers:{
        'Cf-Access-Jwt-Assertion':await token(),Origin:bootstrapOrigin,'Sec-Fetch-Site':'same-origin','Content-Type':'image/png',
        'X-CMS-Metadata':encodeURIComponent(JSON.stringify({alt:{en:'Bootstrap photo',fr:'Photo bootstrap',es:'Foto de bootstrap'}})),
      },body:Buffer.from(IMAGE_FIXTURES.png,'base64')});
      assert.equal(response.status,201,`native upload: ${response.status} ${(await response.clone().text()).slice(0,160)}`);
      uploaded=await response.json();doc.media=[uploaded.media];doc.pages[0].seo.image={mediaId:uploaded.media.id,alt:uploaded.media.alt};
      const privatePhoto=await callAt(bootstrapOrigin,uploaded.previewSrc,'GET',undefined,true);
      assert.equal(privatePhoto.status,200,'authenticated upload preview is available before publication');
      await privatePhoto.arrayBuffer();
    }
    const initial=await jsonAt(bootstrapOrigin,'/api/admin/content');assert.equal(initial.version,0);
    assert.deepEqual(await jsonAt(bootstrapOrigin,'/api/admin/content/draft','PUT',{expectedVersion:0,document:doc}),{version:1,draftRevision:1,published:false});
    assert.deepEqual(await jsonAt(bootstrapOrigin,'/api/admin/content/publish','POST',{expectedVersion:1}),{version:2,draftRevision:2,published:true});
    const published=await jsonAt(bootstrapOrigin,'/api/cms/document','GET',undefined,false);
    assert.equal(published.version,2);assert.equal(published.document.uiCopy.nativeSentinel.en,'first public fixture');
    const baselinePage=await callAt(bootstrapOrigin,'/','GET',undefined,false);
    assert.equal(baselinePage.status,200);const baselineHtml=await baselinePage.text();assert.ok(baselineHtml.includes('first public fixture'));
    if(uploaded){const image=await callAt(bootstrapOrigin,uploaded.media.src,'GET',undefined,false);assert.equal(image.status,200);assert.ok((await image.arrayBuffer()).byteLength>20);}
    const privateDraft=structuredClone(doc);privateDraft.uiCopy.nativeSentinel.en='private newer draft';
    assert.deepEqual(await jsonAt(bootstrapOrigin,'/api/admin/content/draft','PUT',{expectedVersion:2,document:privateDraft}),{version:3,draftRevision:3,published:false});
    const {captureHistorySnapshot,admitHistory}=await import('./cms-admit-history.mjs');
    const before=await captureHistorySnapshot(db);
    const admission=await admitHistory(db,before);assert.equal(admission.admittedRevisions,3);
    assert.deepEqual(await captureHistorySnapshot(db),before,'history admission must preserve rows and pointers');
    const legacyBaseline=await jsonAt(bootstrapOrigin,'/api/cms/document','GET',undefined,false);
    assert.deepEqual(legacyBaseline,published);
    const legacyAdmin=await jsonAt(bootstrapOrigin,'/api/admin/content');assert.equal(legacyAdmin.version,3);
    const prep=await jsonAt(bootstrapOrigin,'/api/admin/content/preparations','POST',{expectedVersion:3,mode:'bootstrap'});
    let progress=prep,advances=0;
    while(!progress.ready){
      assert.ok(advances++<40,'bounded bootstrap advance count');
      progress=await jsonAt(bootstrapOrigin,`/api/admin/content/preparations/${progress.id}/advance`,'POST',{});
      const during=await jsonAt(bootstrapOrigin,'/api/cms/document','GET',undefined,false);
      assert.deepEqual(during,legacyBaseline,'legacy public delivery remains byte-equivalent during artifact preparation');
    }
    const readyState=await captureHistorySnapshot(db);
    assert.deepEqual(readyState,before,'preparation must not append history or move CMS pointers');
    assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM cms_publications').first()).n,0);
    const pointerBefore=await db.prepare('SELECT version,draft_revision,published_revision FROM cms_documents WHERE id=1').first();
    assert.deepEqual(pointerBefore,{version:3,draft_revision:3,published_revision:2});
    const readyCatalog=await db.prepare(`SELECT c.id,c.state,b.revision,b.expected_version FROM cms_catalog_bootstraps b
      JOIN cms_artifact_catalogs c ON c.id=b.catalog_id WHERE c.id=?`).bind(progress.id).first();
    assert.deepEqual(readyCatalog,{id:progress.id,state:'ready',revision:2,expected_version:3});
    assert.deepEqual(await jsonAt(bootstrapOrigin,'/api/cms/document','GET',undefined,false),legacyBaseline,'legacy reader stays active after preparation seals');
    const commit=await jsonAt(bootstrapOrigin,`/api/admin/content/preparations/${progress.id}/commit`,'POST',{});
    assert.deepEqual(commit,{version:3,draftRevision:3,published:true,bootstrap:true});
    assert.deepEqual(await db.prepare('SELECT version,draft_revision,published_revision FROM cms_documents WHERE id=1').first(),pointerBefore);
    assert.deepEqual(await captureHistorySnapshot(db),before,'bootstrap commit preserves the exact revision inventory and pointers');
    assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM cms_publications').first()).n,0,'bootstrap adds no publication revision');
    const catalog=await db.prepare(`SELECT c.state,b.revision,b.expected_version,c.target_revision FROM cms_catalog_bootstraps b
      JOIN cms_artifact_catalogs c ON c.id=b.catalog_id WHERE c.id=?`).bind(progress.id).first();
    assert.deepEqual(catalog,{state:'published',revision:2,expected_version:3,target_revision:4});
    assert.deepEqual(await jsonAt(bootstrapOrigin,'/api/cms/document','GET',undefined,false),legacyBaseline,'legacy CMS remains unchanged after bootstrap commit');
    const staged=await json('/api/cms/document');assert.equal(staged.version,2);assert.equal(staged.document.uiCopy.nativeSentinel.en,'first public fixture');
    const stagedAdmin=await json('/api/admin/content');assert.equal(stagedAdmin.version,3);assert.equal(stagedAdmin.document.uiCopy.nativeSentinel.en,'private newer draft');
    const paths=[];
    for(const pathName of ['/','/fr','/es']){const page=await call(pathName,'GET',undefined,false);assert.equal(page.status,200,`${pathName} serves from the bootstrap catalog`);assert.ok((await page.text()).includes('cms-published-document'));paths.push(pathName);}
    if(uploaded){
      const media=await call(uploaded.media.src,'GET',undefined,false);assert.equal(media.status,200,'R2 upload becomes public through the bootstrapped catalog');
      const bytes=Buffer.from(await media.arrayBuffer());assert.ok(bytes.length>20);
      const legacyAfter=await callAt(bootstrapOrigin,uploaded.media.src,'GET',undefined,false);assert.equal(legacyAfter.status,200,'legacy media remains available on its unchanged origin');
    }
    const entries=(await db.prepare('SELECT path,object_key,digest FROM cms_artifact_entries WHERE catalog_id=?').bind(progress.id).all()).results;
    assert.ok(entries.length>0);const bucket=await mf.getR2Bucket('CMS_MEDIA');
    for(const entry of entries){const object=await bucket.get(entry.object_key);assert.ok(object);assert.equal(hash(Buffer.from(await object.arrayBuffer())),entry.digest);}
    const report={ok:true,scope:'disposable local Workerd + native D1/R2/ASSETS; synthetic signed identity',bootstrapVerified:true,legacyPublicContinuous:true,admittedRevisions:admission.admittedRevisions,preparationAdvances:advances,publishedPointerPreserved:true,revisionInventoryPreserved:true,publicationRowsAdded:0,preparedRoutes:paths,managedUploadLifecycleVerified:Boolean(uploaded),verifiedArtifacts:entries.length,writes,remoteWrites:false,ownerContentUsed:false,cloudflareCpuBudgetProven:false};
    await writeFile(path.join(scratch,'cms-staged-native-bootstrap-result.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
  } else if(historyAdmission){
    assert.ok(!uploads&&!longArticle,'history proof uses separate disposable fixtures');
    const first=JSON.stringify(doc,null,2)+'\n';doc.uiCopy.nativeSentinel.en='retained private draft';const third=JSON.stringify(doc);
    await db.batch([
      db.prepare("INSERT INTO cms_revisions VALUES(1,?,'draft','retained-native','original-time',NULL)").bind(first),
      db.prepare("INSERT INTO cms_revisions VALUES(2,?,'publish','retained-native','publish-time',1)").bind(first),
      db.prepare("INSERT INTO cms_revisions VALUES(3,?,'draft','retained-native','private-time',NULL)").bind(third),
      db.prepare('UPDATE cms_documents SET version=3,draft_revision=3,published_revision=2 WHERE id=1'),
    ]);
    assert.equal((await call('/api/admin/content')).status,409,'old rows are not automatically admitted');
    const {captureHistorySnapshot,admitHistory}=await import('./cms-admit-history.mjs');
    const before=await captureHistorySnapshot(db),admission=await admitHistory(db,before);
    assert.equal(admission.admittedRevisions,3);assert.deepEqual(await captureHistorySnapshot(db),before);
    assert.deepEqual(await admitHistory(db,before),admission,'identical operator rerun is safe');
    const content=await json('/api/admin/content');assert.equal(content.version,3);assert.equal(content.document.uiCopy.nativeSentinel.en,'retained private draft');
    const revision=await call('/api/admin/content/revisions/1');assert.equal(revision.status,200);assert.ok((await revision.text()).endsWith(',"document":'+first+'}'));
    assert.equal((await call('/api/cms/document','GET',undefined,false)).status,503,'admission alone never invents a public artifact catalog');
    let job=await json('/api/admin/content/preparations','POST',{expectedVersion:3,mode:'rollback',revision:2}),advances=0;
    while(!job.ready){assert.ok(advances++<40);job=await json(`/api/admin/content/preparations/${job.id}/advance`,'POST',{});}
    assert.deepEqual(await json(`/api/admin/content/preparations/${job.id}/commit`,'POST',{}),{version:4,draftRevision:4,published:true});
    const published=await json('/api/cms/document');assert.equal(published.version,4);assert.equal(published.document.uiCopy.nativeSentinel.en,'first public fixture');
    const original=(await db.prepare('SELECT * FROM cms_revisions WHERE version<=3 ORDER BY version').all()).results;assert.deepEqual(original,before.revisions);
    assert.equal((await db.prepare('SELECT document FROM cms_revisions WHERE version=4').first()).document,first);
    const bucket=await mf.getR2Bucket('CMS_MEDIA'),entries=(await db.prepare('SELECT e.object_key,e.digest FROM cms_artifact_entries e JOIN cms_publications p ON p.catalog_id=e.catalog_id WHERE p.revision=4').all()).results;
    for(const entry of entries){const object=await bucket.get(entry.object_key);assert.ok(object);assert.equal(hash(Buffer.from(await object.arrayBuffer())),entry.digest);}
    const result={ok:true,scope:'disposable local native workerd/D1/R2/ASSETS; synthetic signed identity',historyAdmissionVerified:true,retainedRevisions:3,admittedBeforeRollback:admission.admittedRevisions,uniqueParts:admission.uniqueParts,explicitRollbackVerified:true,publishedRevision:4,preparationAdvances:advances,verifiedArtifacts:entries.length,originalRowsUnchanged:true,exactRawWhitespacePreserved:true,bootstrapDidNotPublish:true,writes,remoteWrites:false,ownerContentUsed:false,cloudflareCpuBudgetProven:false};
    await writeFile(path.join(scratch,'cms-staged-native-result.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
  }else{
  let managedUpload;
  if(uploads){
    const {IMAGE_FIXTURES}=await import('../tests/fixtures/cms-upload.mjs');
    const corrupt=Buffer.from(IMAGE_FIXTURES.jpeg,'base64');corrupt[corrupt.indexOf(Buffer.from([255,219]))+4]=0xff;
    const {inspectMedia:preflight}=await import('../worker/media.ts');preflight(corrupt,'image/jpeg');
    await paceWrite();
    const denied=await mf.dispatchFetch(adminOrigin+'/api/admin/media',{method:'POST',headers:{'Cf-Access-Jwt-Assertion':await token(),Origin:adminOrigin,'Sec-Fetch-Site':'same-origin','Content-Type':'image/jpeg','X-CMS-Metadata':encodeURIComponent(JSON.stringify({alt:{en:'Fixture',fr:'Fixture',es:'Fixture'}}))},body:corrupt});
    assert.equal(denied.status,422,'actual Images decoder rejects a corrupt JPEG that passes container preflight');
    await paceWrite();
    const response=await mf.dispatchFetch(adminOrigin+'/api/admin/media',{method:'POST',headers:{'Cf-Access-Jwt-Assertion':await token(),Origin:adminOrigin,'Sec-Fetch-Site':'same-origin','Content-Type':'image/png','X-CMS-Metadata':encodeURIComponent(JSON.stringify({alt:{en:'Fixture image',fr:'Image test',es:'Imagen test'}}))},body:Buffer.from(IMAGE_FIXTURES.png,'base64')});
    assert.equal(response.status,201,await response.clone().text());managedUpload=await response.json();
    assert.equal(managedUpload.media.width,3);assert.equal(managedUpload.media.height,2);
    doc.media=[managedUpload.media];doc.pages[0].seo.image={mediaId:managedUpload.media.id,alt:managedUpload.media.alt};
    assert.equal((await call(managedUpload.previewSrc,'GET',undefined,false)).status,401);
    assert.equal((await call(managedUpload.media.src,'GET',undefined,false)).status,404);
    const privateImage=await call(managedUpload.previewSrc);assert.equal(privateImage.status,200);
    const {inspectMedia}=await import('../worker/media.ts');assert.equal(inspectMedia(new Uint8Array(await privateImage.arrayBuffer()),'image/png').width,3);
  }
  let saveRecoveryVerified=false,partLeaseRenewalVerified=false;
  async function save(expectedVersion,document,recover=false){
    const parts=splitCmsDocument(document),manifest=parts.map(({value,...metadata})=>({...metadata,digest:hash(JSON.stringify(value))}));
    let job=await json('/api/admin/content/save-jobs','POST',{expectedVersion,manifest});
    if(recover){
      const first=job.missing[0],originalId=job.id;
      // Shorten only this disposable job, then prove actual D1-clock renewal via HTTP.
      await db.prepare("UPDATE cms_save_jobs SET expires_at=CAST(strftime('%s','now') AS INTEGER)+60 WHERE id=?").bind(job.id).run();
      await json(`/api/admin/content/save-jobs/${job.id}/part`,'POST',{part:parts[first]});
      const lease=await db.prepare("SELECT expires_at>CAST(strftime('%s','now') AS INTEGER)+1700 AND expires_at<=CAST(strftime('%s','now') AS INTEGER)+1800 AS renewed FROM cms_save_jobs WHERE id=?").bind(job.id).first();
      assert.equal(lease.renewed,1);partLeaseRenewalVerified=true;
      // A new invocation supplies no old job ID: start rediscovers admitted progress.
      job=await json('/api/admin/content/save-jobs','POST',{expectedVersion,manifest});
      assert.equal(job.id,originalId);assert.deepEqual(job.missing,parts.map((_,index)=>index).filter(index=>index!==first));
      await json(`/api/admin/content/save-jobs/${job.id}/part`,'POST',{part:parts[first]});
      assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM cms_save_jobs').first()).n,1);
      assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM cms_revisions').first()).n,0);
      saveRecoveryVerified=true;
    }
    for(const offset of job.missing)await json(`/api/admin/content/save-jobs/${job.id}/part`,'POST',{part:parts[offset]});
    const result=await json(`/api/admin/content/save-jobs/${job.id}/commit`,'POST',{});
    assert.deepEqual(result,{version:expectedVersion+1,draftRevision:expectedVersion+1,published:false});return result;
  }
  const advances=[],preparationRecoveryModes=[];let longProjectionRecoveryVerified=false;
  async function publish(expectedVersion,mode='publish',revision){
    const body={expectedVersion,mode,...(revision===undefined?{}:{revision})};
    const recovering=expectedVersion===1||mode==='rollback';
    let job=await json('/api/admin/content/preparations','POST',body),count=0;
    if(recovering){
      // Fresh start requests contain no old ID: recover both lost-start and
      // acknowledged progress without changing source/history/publication.
      assert.deepEqual(await json('/api/admin/content/preparations','POST',body),job);
      job=await json(`/api/admin/content/preparations/${job.id}/advance`,'POST',{});count++;
      assert.deepEqual(await json('/api/admin/content/preparations','POST',body),job);
    }
    while(!job.ready){assert.ok(count++<40,'bounded fixture advance count');job=await json(`/api/admin/content/preparations/${job.id}/advance`,'POST',{});
      if(longArticle&&!longProjectionRecoveryVerified){const work=await db.prepare('SELECT processed,total FROM cms_large_projection_work LIMIT 1').first();
        if(work&&work.processed>0&&work.processed<work.total){assert.deepEqual(await json('/api/admin/content/preparations','POST',body),job);longProjectionRecoveryVerified=true;}}
    }
    if(recovering){
      assert.deepEqual(await json('/api/admin/content/preparations','POST',body),job,'sealed ready preparation is resumed, not replaced');
      preparationRecoveryModes.push(mode);
    }
    if(redirects&&expectedVersion===1){const uncommitted=await mf.dispatchFetch(origin+'/old-home',{redirect:'manual'});assert.equal(uncommitted.status,503,'ready aliases are not public before commit');}
    advances.push(count);
    const result=await json(`/api/admin/content/preparations/${job.id}/commit`,'POST',{});
    assert.deepEqual(result,{version:expectedVersion+1,draftRevision:expectedVersion+1,published:true});return result;
  }
  await save(0,doc,true);
  assert.equal((await call('/api/cms/document','GET',undefined,false)).status,503,'draft is not public');
  await publish(1);
  async function verifyRedirects(){
    if(!redirects)return;
    for(const [path,location] of [['/old-home?tag=a&tag=b','/?tag=a&tag=b'],['/fr/old-home?lang=es&tour=ignored','/fr'],['/?experience=old-home&page=ignored&language=es&x=1','/es?x=1']]){
      const response=await mf.dispatchFetch(origin+path,{redirect:'manual'});
      assert.equal(response.status,308);assert.equal(response.headers.get('Location'),location);
      assert.equal(response.headers.get('Cache-Control'),'no-store');assert.equal(await response.text(),'');
    }
    const head=await mf.dispatchFetch(origin+'/old-home',{method:'HEAD',redirect:'manual'});assert.equal(head.status,308);assert.equal(await head.text(),'');
  }
  await verifyRedirects();
  if(uploads){const image=await call(managedUpload.media.src,'GET',undefined,false);assert.equal(image.status,200);assert.ok((await image.arrayBuffer()).byteLength>20);}
  const original=(await db.prepare('SELECT version,document FROM cms_revisions ORDER BY version').all()).results.map(row=>({version:row.version,digest:hash(row.document)}));
  assert.equal((await json('/api/cms/document')).document.uiCopy.nativeSentinel.en,'first public fixture');
  async function publicSnapshot(){const response=await call('/','GET',undefined,false);assert.equal(response.status,200);const html=await response.text();assert.match(html,/cms-published-document/);if(crossHost){assert.match(html,/<link[^>]*rel="canonical"[^>]*href="https:\/\/fez-native\.test\/?"/);assert.ok(!html.includes(appOrigin),'app origin must never enter public HTML');}return {html,document:(await json('/api/cms/document')).document};}
  const firstSnapshot=await publicSnapshot();
  if(crossHost){
    for(const negative of ['delivery','catalog'])for(const route of ['/','/api/cms/document',...(uploads?[managedUpload.media.src]:[])]){const response=await mf.dispatchFetch(origin+route,{headers:{'X-Native-Negative':negative}});assert.ok(response.status>=400,`${negative} ${route} must fail closed, got ${response.status}`);}
    for(const route of ['/api/cms/document',...(uploads?[managedUpload.media.src]:[])]){const response=await mf.dispatchFetch(appOrigin+route);assert.ok(response.status>=400,`app cannot deliver public artifact ${route}`);assert.equal(response.headers.get('X-Robots-Tag'),'noindex, nofollow');}
    assert.equal((await callAt(appOrigin,'/api/admin/content/save-jobs','POST',{expectedVersion:2,manifest:[]},false)).status,401);
    const denied=await mf.dispatchFetch(appOrigin+'/api/admin/content/preparations',{method:'POST',headers:{'Cf-Access-Jwt-Assertion':await token(),Origin:origin,'Sec-Fetch-Site':'cross-site','Content-Type':'application/json'},body:'{}'});assert.equal(denied.status,403);
  }
  if(longArticle){assert.equal(articleText((await json('/api/cms/document')).document),firstText);const article=await call('/long-article','GET',undefined,false);assert.equal(article.status,200);assert.ok((await article.text()).includes(firstText));doc.pages.find(p=>p.id==='long-article').sections[0].blocks[0].text.en=secondText;}
  doc.uiCopy.nativeSentinel.en='second private fixture';
  if(uploads)delete doc.pages[0].seo.image;
  await save(2,doc);
  assert.deepEqual(await publicSnapshot(),firstSnapshot,'private Save leaves exact public HTML/JSON unchanged');
  assert.equal((await json('/api/cms/document')).document.uiCopy.nativeSentinel.en,'first public fixture');
  if(longArticle)assert.equal(articleText((await json('/api/cms/document')).document),firstText,'long draft remains private');
  await publish(3);assert.equal((await json('/api/cms/document')).document.uiCopy.nativeSentinel.en,'second private fixture');
  if(longArticle)verifyArticle((await json('/api/cms/document')).document,secondText);
  if(uploads){assert.equal((await call(managedUpload.media.src,'GET',undefined,false)).status,404);assert.equal((await call(managedUpload.previewSrc)).status,200);}
  const secondSnapshot=await publicSnapshot();
  await publish(4,'rollback',2);
  assert.deepEqual(await publicSnapshot(),firstSnapshot,'rollback restores exact first public HTML/JSON');
  if(uploads){const image=await call(managedUpload.media.src,'GET',undefined,false);assert.equal(image.status,200);const {inspectMedia}=await import('../worker/media.ts');assert.equal(inspectMedia(new Uint8Array(await image.arrayBuffer()),'image/png').height,2);}
  if(uploads){
    await publish(5,'rollback',4);
    assert.deepEqual(await publicSnapshot(),secondSnapshot,'rollback restores exact second public HTML/JSON');
    assert.equal((await call(managedUpload.media.src,'GET',undefined,false)).status,404,'rollback revokes a previously public upload');
    assert.equal((await call(managedUpload.previewSrc)).status,200,'rollback retains private upload bytes');
  }
  const published=await json('/api/cms/document');assert.equal(published.version,uploads?6:5);assert.equal(published.document.uiCopy.nativeSentinel.en,uploads?'second private fixture':'first public fixture');
  await verifyRedirects();
  if(longArticle){assert.equal(longProjectionRecoveryVerified,true);verifyArticle(published.document,uploads?secondText:firstText);assert.equal(JSON.stringify(published.document).includes('NEVER_PUBLIC_LONG_ARTICLE_MARKER'),false);assert.equal(articleText(published.document),uploads?secondText:firstText);const article=await call('/long-article','GET',undefined,false);assert.equal(article.status,200);assert.ok((await article.text()).includes(uploads?secondText:firstText));}
  const rows=(await db.prepare('SELECT version,document FROM cms_revisions ORDER BY version').all()).results;
  assert.deepEqual(rows.slice(0,2).map(row=>({version:row.version,digest:hash(row.document)})),original);
  assert.equal(rows.length,uploads?6:5);
  const catalog=await db.prepare('SELECT c.id FROM cms_documents d JOIN cms_publications p ON p.revision=d.published_revision JOIN cms_artifact_catalogs c ON c.id=p.catalog_id').first();
  const entries=(await db.prepare('SELECT object_key,digest,bytes FROM cms_artifact_entries WHERE catalog_id=?').bind(catalog.id).all()).results;
  const bucket=await mf.getR2Bucket('CMS_MEDIA');
  for(const entry of entries){const object=await bucket.get(entry.object_key);assert.ok(object);assert.equal(object.size,entry.bytes);assert.equal(hash(Buffer.from(object.checksums.sha256)),hash(Buffer.from(entry.digest,'hex')));assert.equal(hash(Buffer.from(await object.arrayBuffer())),entry.digest);}
  assert.deepEqual(preparationRecoveryModes,uploads?['publish','rollback','rollback']:['publish','rollback']);
  let localRecoveryProof,privateWriteBaseline=published.version;
  if(localRecovery){
    assert.ok(uploads,'local recovery proof must include real uploaded bytes');
    const recoveryFetch=globalThis.fetch;let portableBackupReport,hostedRestoreReport;
    globalThis.fetch=async(input,init={})=>{const headers=new Headers(init.headers),method=init.method??'GET';headers.set('Cf-Access-Jwt-Assertion',await token());if(!['GET','HEAD'].includes(method)){headers.set('Origin',origin);headers.set('Sec-Fetch-Site','same-origin');}return mf.dispatchFetch(new URL(String(input),origin).href,{...init,headers});};
    try{
      const current=await json('/api/admin/content'),snapshotRows=(await db.prepare('SELECT version,kind,actor,created_at,source_revision,document FROM cms_revisions ORDER BY version').all()).results;
      const portable=await downloadPortableBackup(),verified=await openBackup(portable);assert.equal(verified.header.source.version,current.version);assert.equal(verified.header.entries.filter(entry=>entry.type==='revision').length,current.version);assert.equal(verified.header.entries.filter(entry=>entry.type==='media').length,1);
      const originalKey=managedUpload.media.src.slice(7),exported=verified.header.entries.find(entry=>entry.type==='media'&&entry.key===originalKey),originalObject=await bucket.get('uploads/'+originalKey);assert.ok(exported&&originalObject);const photoBytes=Buffer.from(await originalObject.arrayBuffer());assert.deepEqual(Buffer.from(await verified.body(exported).arrayBuffer()),photoBytes,'portable backup photo bytes match the pinned R2 object');
      const source=snapshotRows.find(row=>row.version===1);assert.ok(source&&source.document.includes(managedUpload.media.src));const newKey=`upload-${crypto.randomUUID()}.png`,remappedRaw=source.document.replaceAll(managedUpload.media.src,`/media/${newKey}`);
      const portableRestore=await packBackup({version:1,draftRevision:1,publishedRevision:null,origin:'https://fez-native.test'},[
        {type:'revision',version:1,kind:source.kind,actor:source.actor,created_at:source.created_at,source_revision:source.source_revision,blob:new Blob([remappedRaw],{type:'application/json'})},
        {type:'media',key:newKey,contentType:'image/png',blob:new Blob([photoBytes],{type:'image/png'})},
      ]);
      const result=await restorePortableArchive(await openBackup(portableRestore),1,current.version,current.document);assert.deepEqual(result,{version:current.version+1,draftRevision:current.version+1,published:false});privateWriteBaseline=result.version;
      const restored=await json('/api/admin/content'),newSrc=restored.document.media.find(item=>item.id===managedUpload.media.id)?.src;assert.equal(restored.version,result.version);assert.ok(newSrc&&newSrc!==managedUpload.media.src);assert.equal((await json('/api/cms/document')).version,published.version,'portable restore leaves public publication unchanged');
      const newKeyOnR2=newSrc.slice(7),restoredObject=await bucket.get('uploads/'+newKeyOnR2);assert.ok(restoredObject,'a missing-source portable image is reprocessed into a new R2 object');assert.ok((await call('/api/admin/media/'+newKeyOnR2)).status===200,'restored media remains available privately');assert.equal((await call(newSrc,'GET',undefined,false)).status,404,'restored media is not public before publication');
      const job=(await db.prepare("SELECT id FROM cms_restore_jobs WHERE state='committed' ORDER BY rowid DESC LIMIT 1").first()).id,mapping=await db.prepare('SELECT original_key,target_src FROM cms_restore_media WHERE job_id=?').bind(job).first();assert.deepEqual(mapping,{original_key:newKey,target_src:newSrc});
      assert.deepEqual((await db.prepare('SELECT version,document FROM cms_revisions WHERE version<=? ORDER BY version').bind(current.version).all()).results,snapshotRows.map(({version,document})=>({version,document})),'all pre-restore owner history remains byte-exact');
      const audit=await json('/api/admin/recovery/orphans'),protectedResult=await json('/api/admin/recovery/orphans?'+new URLSearchParams({key:'uploads/'+newKeyOnR2,fence:audit.fence}));assert.equal(protectedResult.protected,true);assert.equal(protectedResult.deleted,0);
      portableBackupReport={verified:true,revisions:verified.header.entries.filter(entry=>entry.type==='revision').length,photos:verified.header.entries.filter(entry=>entry.type==='media').length,exportedPhotoBytes:exported.bytes,exactPhotoBytes:true};
      hostedRestoreReport={verified:true,privateRevision:result.version,publicRevisionUnchanged:published.version,newPhotoObject:true,privatePhotoAvailable:true,publicPhotoDenied:true,oldHistoryRetained:true,restoreReceiptProtectsPhoto:true,deleted:0};
    }finally{globalThis.fetch=recoveryFetch;}
    const {auditRecoveryObjects}=await import('./cms-recovery-inventory.mjs');
    const {backupLocalState,restoreLocalState}=await import('./cms-local-backup.mjs');
    const sourceState=path.join(temporary,'state'),snapshot=path.join(temporary,'snapshot'),restoredState=path.join(temporary,'restored');
    async function dumpD1(binding){
      const names=(await binding.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'cms_%' ORDER BY name").all()).results;
      const data={};for(const {name}of names){assert.match(name,/^cms_[a-z_]+$/);data[name]=(await binding.prepare(`SELECT * FROM "${name}" ORDER BY rowid`).all()).results;}return data;
    }
    async function dumpR2(binding){
      const objects=[];let cursor;do{const page=await binding.list({limit:16,...(cursor?{cursor}:{})});for(const item of page.objects){const object=await binding.get(item.key);assert.ok(object);objects.push({key:object.key,size:object.size,version:object.version,etag:object.etag,uploaded:object.uploaded.toISOString(),httpMetadata:object.httpMetadata,customMetadata:object.customMetadata,sha256:hash(Buffer.from(await object.arrayBuffer()))});}cursor=page.truncated?page.cursor:undefined;}while(cursor);return objects;
    }
    const orphan='uploads/upload-aaaaaaaa-1234-1234-1234-123456789012.png',orphanPrepared='prepared/v1/'+ 'b'.repeat(32)+'/'+ 'c'.repeat(64);
    const originalImage=await bucket.get('uploads/'+managedUpload.media.src.slice('/media/'.length));
    await bucket.put(orphan,await originalImage.arrayBuffer(),{httpMetadata:{contentType:'image/png'},customMetadata:{uploadedAt:new Date().toISOString()}});
    await bucket.put(orphanPrepared,'unreferenced synthetic artifact');
    const beforeTables=await dumpD1(db),beforeObjects=await dumpR2(bucket);
    // A deliberately advanced diagnostic clock tests the seven-day quarantine;
    // actual native R2 timestamps are not fabricated or changed.
    const audit=await auditRecoveryObjects(db,bucket,new Date(Date.now()+8*24*3600*1000));
    assert.equal(audit.deleted,0);assert.equal(audit.unknown,0);assert.deepEqual(audit.candidates.map(x=>x.key).sort(),[orphan,orphanPrepared].sort());
    assert.deepEqual(await dumpD1(db),beforeTables);assert.deepEqual(await dumpR2(bucket),beforeObjects);
    await assert.rejects(backupLocalState(sourceState,snapshot),/open state handle/i,'live native SQLite state cannot be snapshotted');
    await mf.dispose();mf=undefined;
    const backup=await backupLocalState(sourceState,snapshot);assert.equal(backup.verified,true);
    const sourceManifest=JSON.parse(await readFile(path.join(snapshot,'manifest.json'),'utf8'));
    await assert.rejects(restoreLocalState(snapshot,sourceState),/already exists/);
    await restoreLocalState(snapshot,restoredState);
    mf=new Miniflare({...nativeOptions,resourcePersistencePath:restoredState,isolatedResourcePersistencePath:restoredState,resourceTmpPath:path.join(temporary,'restored-runtime')});await mf.ready;
    const restoredDb=await mf.getD1Database('CMS_DB'),restoredBucket=await mf.getR2Bucket('CMS_MEDIA');
    assert.deepEqual(await dumpD1(restoredDb),beforeTables,'all CMS tables including budgets, private drafts, admissions, catalogs and publication pointers survive');
    assert.deepEqual(await dumpR2(restoredBucket),beforeObjects,'every R2 byte and native generation survives');
    assert.equal((await call('/api/admin/content','GET',undefined,false)).status,401);
    assert.equal((await json('/api/cms/document')).version,published.version);await verifyRedirects();
    assert.equal((await call(managedUpload.previewSrc,'GET',undefined,false)).status,401);
    assert.equal((await call(managedUpload.previewSrc)).status,200);
    assert.equal((await call(managedUpload.media.src,'GET',undefined,false)).status,404,'restored private image does not gain public authority');
    const restoredHtml=await call('/','GET',undefined,false);assert.equal(restoredHtml.status,200);assert.match(await restoredHtml.text(),/cms-published-document/);
    doc.uiCopy.nativeSentinel.en='restored-only private draft';await save(privateWriteBaseline,doc);
    assert.equal((await json('/api/admin/content')).document.uiCopy.nativeSentinel.en,'restored-only private draft');
    assert.equal((await json('/api/cms/document')).version,published.version,'isolated restore edits do not implicitly publish');
    const afterSnapshot=path.join(temporary,'original-readback');await backupLocalState(sourceState,afterSnapshot);
    const afterManifest=JSON.parse(await readFile(path.join(afterSnapshot,'manifest.json'),'utf8'));assert.deepEqual(afterManifest.files,sourceManifest.files);assert.deepEqual(afterManifest.directories,sourceManifest.directories);
    localRecoveryProof={verified:true,scope:'hosted endpoints plus stopped local-native persistence; portable recovery is proven only inside disposable workerd/D1/R2',hostedBackup:portableBackupReport,hostedRestore:hostedRestoreReport,hostedRecoveryRoutesEnabled:true,allCmsTables:Object.keys(beforeTables).length,allR2Objects:beforeObjects.length,verifiedSnapshotFiles:backup.files,liveNativeBackupRejected:true,sourceUnchangedAfterRestoreAndEdit:true,exactOriginalTablesAndObjectGenerations:true,privateDraftEditingAfterRestore:true,privateUploadAuthAndPublicRevocationPreserved:true,orphanAudit:{scanned:audit.scanned,pages:audit.pages,candidates:audit.candidates.length,deleted:audit.deleted,testClockAdvancedDays:8}};
  }
  if(crossHost){const hidden=await mf.dispatchFetch(appOrigin+'/our-fez-tours');assert.equal(hidden.status,404);assert.equal(hidden.headers.get('X-Robots-Tag'),'noindex, nofollow');assert.equal((await call('/api/admin/content/revisions')).status,200);assert.ok(adminDispatches.some(x=>x.url==='/api/admin/content/revisions'));}
  const result={ok:true,crossHost,adminOrigin,publicOrigin:origin,canonicalOrigin:values.CANONICAL_ORIGIN,adminRequests:adminDispatches.length,crossHostExactPublicSnapshotsVerified:crossHost,crossHostNegativeDeliveryAndCatalogVerified:crossHost,localRecoveryProof,scope:'disposable local workerd + native D1/R2/ASSETS; synthetic signed identity',sourceParts:splitCmsDocument(doc).length,revisions:localRecovery?rows.length+2:rows.length,publishedRevision:published.version,preparationAdvances:advances,saveRecoveryVerified,partLeaseRenewalVerified,preparationRecoveryModes,configuredRedirectsVerified:Boolean(redirects),managedUploadLifecycleVerified:uploads,longArticleLifecycleVerified:longArticle,longProjectionRecoveryVerified,longArticleBytes:longArticle?Buffer.byteLength(JSON.stringify(doc.pages.find(p=>p.id==='long-article'))):0,verifiedCurrentArtifacts:entries.length,writes,originalRowsUnchanged:true,remoteWrites:false,cloudflareCpuBudgetProven:false,ownerContentUsed:false};
  await writeFile(path.join(scratch,'cms-staged-native-result.json'),JSON.stringify(result,null,2));
  console.log(JSON.stringify(result,null,2));
  }
}finally{if(mf)await mf.dispose();await rm(temporary,{recursive:true,force:true});}
