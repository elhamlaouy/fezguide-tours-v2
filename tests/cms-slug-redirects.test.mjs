import assert from 'node:assert/strict';
import {test} from 'node:test';
import {register} from 'tsx/esm/api';
register();
const {slugRedirects,redirectRendererId}=await import('../worker/cms-slug-redirects.ts');

test('trusted redirects retain legacy syntax and exact count/length limits',()=>{
  for(const raw of [undefined,'','{}',' {} ']) assert.deepEqual(slugRedirects(raw),{});
  const hundred=Object.fromEntries(Array.from({length:100},(_,i)=>[`old-${i}`,'home']));
  assert.equal(Object.keys(slugRedirects(JSON.stringify(hundred))).length,100);
  assert.equal(Object.keys(slugRedirects('{}'+' '.repeat(15_998))).length,0);
  assert.equal(slugRedirects(JSON.stringify({['a'.repeat(80)]:'b'.repeat(80)}))['a'.repeat(80)],'b'.repeat(80));
  for(const raw of ['null','[]','true','1','"home"','{',' ',JSON.stringify({...hundred,extra:'home'}),'{}'+' '.repeat(15_999),'{"/old":"home"}','{"Old":"home"}','{"old":"https://evil.test"}','{"old":"/home"}','{"old":null}','{"old":[]}','{"old":{}}',JSON.stringify({['a'.repeat(81)]:'home'}),JSON.stringify({old:'b'.repeat(81)})]) {
    assert.throws(()=>slugRedirects(raw));
  }
  assert.equal(Object.hasOwn(slugRedirects('{"constructor":"home"}'),'constructor'),true);
  assert.equal(Object.hasOwn(slugRedirects('{}'),'constructor'),false);
  assert.equal(Object.isFrozen(slugRedirects('{"old":"home"}')),true);
});

test('renderer identity canonically binds all redirect entries and the original renderer without altering empty-config catalogs',async()=>{
  for(const raw of [undefined,'','{}',' {} ']) assert.equal(await redirectRendererId('renderer',raw),'renderer');
  const a=await redirectRendererId('renderer','{"old-a":"about","old-b":"home"}');
  assert.match(a,/^redirects-v1:[a-f0-9]{64}$/);
  assert.equal(await redirectRendererId('renderer',' { "old-b":"home", "old-a":"about" } '),a);
  assert.notEqual(await redirectRendererId('other-renderer','{"old-a":"about","old-b":"home"}'),a);
  assert.notEqual(await redirectRendererId('renderer','{"old-a":"home","old-b":"home"}'),a);
  const results=await Promise.all(Array.from({length:30},(_,i)=>redirectRendererId('renderer',JSON.stringify({old:i%2?'home':'about'}))));
  assert.equal(new Set(results).size,2,'one-entry cache never mixes concurrent configurations');
  await assert.rejects(redirectRendererId('renderer','[]'));
});
