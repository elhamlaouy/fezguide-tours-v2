import assert from 'node:assert/strict';import {test} from 'node:test';import {register} from 'tsx/esm/api';register();
test('portable archive preserves raw revision bytes and detects corruption before restore',async()=>{
 const {packBackup,openBackup}=await import('../src/admin/recovery-api.ts');const raw='{ "private": "é" }\n';
 const blob=await packBackup({version:1,draftRevision:1,publishedRevision:null,origin:'https://source.test'},[{type:'revision',version:1,kind:'draft',actor:'owner',created_at:'original',source_revision:null,blob:new Blob([raw])}]);
 const archive=await openBackup(blob);assert.equal(archive.header.entries.length,1);assert.equal(await archive.body(archive.header.entries[0]).text(),raw);
 const bytes=new Uint8Array(await blob.arrayBuffer());bytes[bytes.length-1]^=1;await assert.rejects(openBackup(new Blob([bytes])),/backup_integrity/);
});
test('portable backup refuses a revision gap instead of advertising a partial history',async()=>{
 const {packBackup}=await import('../src/admin/recovery-api.ts');const raw='{}';
 await assert.rejects(packBackup({version:2,draftRevision:1,publishedRevision:null,origin:'https://source.test'},[{type:'revision',version:1,kind:'draft',actor:'owner',created_at:'original',source_revision:null,blob:new Blob([raw])}]),/backup_integrity/);
});
