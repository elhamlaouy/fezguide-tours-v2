import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
import { createHash, webcrypto } from 'node:crypto';
import { register as registerLoader } from 'node:module';
import { register } from 'tsx/esm/api';
register();
const api = await import('../src/admin/admin-api.ts');
const { createCmsSeed } = await import('../src/cms/seed.ts');
const { splitCmsDocument, assembleCmsDocument } = await import('../src/cms/document-parts.ts');
const { CMS_LIMITS, CMS_PART_FIELDS, validateCmsDocument } = await import('../src/cms/schema.ts');
const maxSourceParts = 1 + Object.values(CMS_PART_FIELDS).reduce((sum, field) => sum + field.max, 0);
const boundedPlanTotal = maxSourceParts + 1000 + CMS_PART_FIELDS.media.max;
const maxPreparationTotal = boundedPlanTotal + 2*CMS_LIMITS.bytes; // native tree work is bounded by admitted bytes
// Progress bounds are declared with the schema imports above.
if (!globalThis.crypto) globalThis.crypto = webcrypto;

// CLIENT CONTRACT fixtures only: these controlled JSON replies are not an actual server.
const originalFetch = globalThis.fetch;
test.afterEach(() => { globalThis.fetch = originalFetch; });
function fixture(handler) {
  const calls = [];
  globalThis.fetch = async (url, init = {}) => {
    const call = { url, method: init.method, body: init.body ? JSON.parse(init.body) : undefined, init };
    calls.push(call);
    const result = await handler(call, calls);
    return new Response(JSON.stringify(result.body ?? {}), { status: result.status ?? 200, headers: result.headers });
  };
  return calls;
}
const loaded = (processing = 'staged-v1') => ({ version: 2, draftRevision: 2, publishedRevision: 1, document: null, ...(processing ? { processing } : {}) });
const result = (published = false) => ({ version: 3, draftRevision: 3, published });
const id = '0123456789abcdef0123456789abcdef';

for (const mode of ['publish', 'rollback']) test(`client contract: ${mode} advances automatically to ready before one explicit commit`, async () => {
  const progress = [];
  let advances = 0;
  const calls = fixture(call => {
    if (call.method === 'GET') return { body: loaded() };
    if (call.url === '/api/admin/content/preparations') {
      assert.deepEqual(call.body, { expectedVersion: 2, mode, ...(mode === 'rollback' ? { revision: 1 } : {}) });
      return { body: { id, ready: false, done: 0, total: 3 } };
    }
    if (call.url.endsWith('/advance')) return { body: { id, ready: ++advances === 3, done: advances, total: 3 } };
    if (call.url.endsWith('/commit')) { assert.equal(advances, 3); assert.deepEqual(call.body, {}); return { body: result(true) }; }
    assert.fail(`Unexpected ${call.method} ${call.url}`);
  });
  await api.loadAdminContent();
  const callback = event => progress.push(event);
  const actual = mode === 'publish' ? await api.publishAdminDraft(2, callback) : await api.rollbackAdminRevision(2, 1, callback);
  assert.deepEqual(actual, result(true));
  assert.equal(calls.filter(call => call.url.endsWith('/commit')).length, 1);
  assert.deepEqual(progress.filter(event => event.phase === 'prepare').map(event => event.done), [0, 1, 2, 3]);
  assert.equal(calls.some(call => /\/(publish|rollback|draft)$/.test(call.url)), false);
});

test('client contract: completed counters do not commit before the preparation is sealed ready', async () => withClock(async () => {
  let sealed = false;
  fixture(call => {
    if (call.method === 'GET') return { body: loaded() };
    if (call.url.endsWith('/preparations')) return { body: { id, ready: false, done: 3, total: 3 } };
    if (call.url.endsWith('/advance')) { sealed = true; return { body: { id, ready: true, done: 3, total: 3 } }; }
    assert.equal(sealed, true);
    return { body: result(true) };
  });
  await api.loadAdminContent();
  assert.deepEqual(await api.publishAdminDraft(2), result(true));
}));

for (const bad of [
  { id: '../escape', missing: [] }, { id: '', missing: [] }, { id: 'x'.repeat(129), missing: [] },
  ...['operation-id', 'f'.repeat(31), 'g'.repeat(32), 'A'.repeat(32), 'f'.repeat(33)].map(id => ({ id, missing: [] })),
  { id, missing: null }, { id, missing: [-1] }, { id, missing: [0.5] }, { id, missing: [0, 0] }, { id, missing: [999999] }, { id, missing: ['0'] },
]) test(`client contract: invalid save job metadata is blocked: ${JSON.stringify(bad).slice(0, 150)}`, async () => {
  const calls = fixture(call => ({ body: call.method === 'GET' ? loaded() : call.url.endsWith('/save-jobs') ? bad : call.url.endsWith('/part') ? { stored: true } : result() }));
  await api.loadAdminContent();
  await assert.rejects(api.saveAdminDraft(2, createCmsSeed()), error => error.code === 'invalid_response');
  assert.equal(calls.length, 2, 'must reject before upload or commit');
});

test('client contract: missing stored acknowledgement prevents save commit', async () => {
  const calls = fixture(call => ({ body: call.method === 'GET' ? loaded() : call.url.endsWith('/save-jobs') ? { id, missing: [0] } : call.url.endsWith('/part') ? { stored: false } : result() }));
  await api.loadAdminContent();
  await assert.rejects(api.saveAdminDraft(2, createCmsSeed()), error => error.code === 'invalid_response');
  assert.equal(calls.some(call => call.url.endsWith('/commit')), false);
});

for (const bad of [
  { id: '../escape', ready: true, done: 3, total: 3 }, { id: 'operation-id', ready: true, done: 3, total: 3 },
  { id, ready: true, done: 1, total: 3 },
  { id, ready: 'yes', done: 3, total: 3 }, { id, ready: false, done: -1, total: 3 },
  { id, ready: false, done: 4, total: 3 }, { id, ready: false, done: 0, total: 0 },
  { id, ready: false, done: 0, total: maxPreparationTotal+1 }, { id, ready: true, done: maxPreparationTotal + 1, total: maxPreparationTotal + 1 }, { id, ready: true, done: 1.5, total: 1.5 },
]) test(`client contract: malformed or premature preparation is blocked: ${JSON.stringify(bad)}`, async () => {
  const calls = fixture(call => ({ body: call.method === 'GET' ? loaded() : call.url.endsWith('/preparations') ? bad : call.url.endsWith('/advance') ? { id, ready: true, done: 3, total: 3 } : result(true) }));
  await api.loadAdminContent();
  await assert.rejects(api.publishAdminDraft(2), error => error.code === 'invalid_response');
  assert.equal(calls.length, 2);
});

for (const changed of [{ id: 'other-id', ready: true, done: 3, total: 3 }, { id, ready: true, done: 4, total: 4 }, { id, ready: false, done: 0, total: 3 }]) test(`client contract: changed operation, total or regressing progress is blocked: ${JSON.stringify(changed)}`, async () => {
  let advances = 0;
  const calls = fixture(call => ({ body: call.method === 'GET' ? loaded() : call.url.endsWith('/preparations') ? { id, ready: false, done: 1, total: 3 } : call.url.endsWith('/advance') ? (++advances === 1 ? changed : { id, ready: true, done: 3, total: 3 }) : result(true) }));
  await api.loadAdminContent();
  await assert.rejects(api.publishAdminDraft(2), error => error.code === 'invalid_response');
  assert.equal(calls.some(call => call.url.endsWith('/commit')), false);
});

for (const status of [401, 409, 410, 500]) test(`client contract: failed preparation ${status} never commits or falls back`, async () => {
  const calls = fixture(call => call.method === 'GET' ? { body: loaded() } : call.url.endsWith('/preparations') ? { body: { id, ready: false, done: 0, total: 3 } } : { status, body: { error: status === 409 ? 'version_conflict' : 'preparation_expired' } });
  await api.loadAdminContent();
  await assert.rejects(api.rollbackAdminRevision(2, 1), error => error.status === status);
  assert.equal(calls.length, 3);
  assert.equal(calls.some(call => /commit|\/rollback$/.test(call.url)), false);
});

async function withClock(run) {
  const oldTimeout = globalThis.setTimeout;
  const oldClearTimeout = globalThis.clearTimeout;
  const waits = [];
  const drivers = new Map();
  // Run the real client's timers against Node's native virtual clock. A zero-delay
  // real driver advances only timers still armed after request microtasks settle.
  mock.timers.enable({ apis: ['Date', 'setTimeout'], now: 1700000000000 });
  const virtualTimeout = globalThis.setTimeout;
  const virtualClearTimeout = globalThis.clearTimeout;
  globalThis.setTimeout = (callback, ms, ...args) => {
    const timer = virtualTimeout(() => {
      oldClearTimeout(drivers.get(timer));
      drivers.delete(timer);
      callback(...args);
    }, ms);
    drivers.set(timer, oldTimeout(() => { waits.push(ms); mock.timers.tick(ms); }, 0));
    return timer;
  };
  globalThis.clearTimeout = timer => {
    oldClearTimeout(drivers.get(timer)); drivers.delete(timer); virtualClearTimeout(timer);
  };
  try { return await run({ waits, jump: ms => mock.timers.tick(ms) }); }
  finally {
    for (const driver of drivers.values()) oldClearTimeout(driver);
    mock.timers.reset(); globalThis.setTimeout = oldTimeout; globalThis.clearTimeout = oldClearTimeout;
  }
}

for (const retryAfter of ['1', '0', 'not-a-date', 'http-date']) test(`client contract: 429 waits before retry with Retry-After ${retryAfter}`, async () => {
  await withClock(async ({ waits }) => {
    let attempt = 0;
    const calls = fixture(call => {
      if (call.method === 'GET') return { body: loaded() };
      if (call.url.endsWith('/preparations')) {
        if (++attempt === 1) return { status: 429, body: { error: 'rate_limited' }, headers: { 'Retry-After': retryAfter === 'http-date' ? new Date(Date.now() + 2000).toUTCString() : retryAfter } };
        assert.equal(waits.length, 1, 'must not retry in a tight loop');
        return { body: { id, ready: true, done: 3, total: 3 } };
      }
      return { body: result(true) };
    });
    await api.loadAdminContent();
    assert.deepEqual(await api.publishAdminDraft(2), result(true));
    assert.equal(calls.length, 4);
    assert.ok(waits[0] >= (retryAfter === '1' ? 1000 : retryAfter === 'http-date' ? 1000 : 250));
  });
});

test('client contract: repeated 429 exhausts six consecutive backoffs without commit', async () => {
  await withClock(async ({ waits }) => {
    const calls = fixture(call => call.method === 'GET' ? { body: loaded() } : { status: 429, body: { error: 'rate_limited' } });
    await api.loadAdminContent();
    await assert.rejects(api.publishAdminDraft(2), error => error.status === 429);
    assert.deepEqual(waits, [250, 500, 1000, 2000, 4000, 8000]);
    assert.equal(calls.length, 8);
    assert.equal(calls.some(call => call.url.endsWith('/commit')), false);
  });
});

test('client contract: failed protocol reload cannot downgrade the selected staged protocol', async () => {
  let reload = false;
  const calls = fixture(call => {
    if (call.method === 'GET') return reload ? { status: 503, body: { error: 'cms_unavailable' } } : { body: loaded() };
    if (call.url.endsWith('/save-jobs')) return { body: { id, missing: [] } };
    return { body: result() };
  });
  await api.loadAdminContent();
  reload = true;
  await assert.rejects(api.loadAdminContent(), error => error.status === 503);
  await api.saveAdminDraft(2, createCmsSeed());
  assert.equal(calls.some(call => call.url.endsWith('/draft')), false);
  assert.equal(calls.filter(call => call.url.endsWith('/save-jobs')).length, 1);
});

// Mirrors the inspected D1 fixed-window admission: 60 identity writes / 60s,
// independent reads, 120 site writes; rejects are not charged. Not a real D1 run.
const { CMS_REQUEST_LIMITS } = await import('../worker/cms-request-budget.ts');
test('F4 schema-valid 3156-part Save completes beyond thirty minutes under unchanged write windows', async () => withClock(async () => {
  const { cardinalityDocument } = await import('./fixtures/cms-cardinality.mjs');
  const doc = cardinalityDocument(), parts = splitCmsDocument(doc);
  const checked = validateCmsDocument(doc);
  assert.ok(checked.valid, checked.errors.join('\n'));
  assert.equal(parts.length, 3156);
  let used = 0, resetAt = Date.now() + 60000, uploaded = 0;
  const startedAt = Date.now();
  const calls = fixture(call => {
    if (call.method === 'GET') return { body: loaded() };
    if (Date.now() >= resetAt) { used = 0; resetAt = Date.now() + 60000; }
    assert.ok(++used <= CMS_REQUEST_LIMITS.write.identity, 'never increase the durable write allowance');
    if (call.url.endsWith('/save-jobs')) return { body: { id, missing: parts.map((_, index) => index) } };
    if (call.url.endsWith('/part')) { assert.deepEqual(call.body.part, parts[uploaded++]); return { body: { stored: true } }; }
    assert.ok(call.url.endsWith('/commit')); return { body: result() };
  });
  await api.loadAdminContent();
  assert.deepEqual(await api.saveAdminDraft(2, doc), result());
  assert.equal(uploaded, parts.length);
  assert.ok(Date.now() - startedAt > 1800000);
  assert.equal(calls.filter(call => call.url.endsWith('/commit')).length, 1);
}));
for (const partCount of [59, 356, 573]) test(`client contract: first save of ${partCount} missing parts honors durable write windows including commit`, async () => {
  await withClock(async ({ waits, jump }) => {
    const doc = createCmsSeed();
    while (splitCmsDocument(doc).length < partCount) {
      const index = Object.keys(doc.uiCopy).length;
      doc.uiCopy[`contract.${index}`] = { en: 'text', fr: 'texte', es: 'texto' };
    }
    const missing = splitCmsDocument(doc).slice(0, partCount).map((_, index) => index);
    const { identity, seconds } = CMS_REQUEST_LIMITS.write;
    assert.equal(identity, 60); assert.equal(seconds, 60);
    let resetAt = Date.now() + seconds * 1000;
    // Model another same-identity tab using ten slots per window on the large saves.
    const otherWrites = partCount === 59 ? 0 : 10;
    let used = otherWrites;
    let denied = 0;
    let uploaded = 0;
    const calls = fixture(call => {
      if (call.method === 'GET') return { body: loaded() };
      if (partCount === 59 && call.url.endsWith('/save-jobs')) {
        // First admission can occur after client dispatch; request 61 must wait
        // from confirmed admission, not an optimistic pre-network timestamp.
        jump(5000); resetAt = Date.now() + seconds * 1000;
      }
      if (Date.now() >= resetAt) { resetAt = Date.now() + seconds * 1000; used = otherWrites; }
      if (used >= identity) {
        assert.equal(call.url.endsWith('/commit'), false, 'client must reserve time for one non-retried commit');
        denied++;
        return { status: 429, headers: { 'Retry-After': String(seconds) }, body: { error: 'cms_request_rate' } };
      }
      used++;
      if (call.url.endsWith('/save-jobs')) return { body: { id, missing } };
      if (call.url.endsWith('/part')) { uploaded++; return { body: { stored: true } }; }
      assert.ok(call.url.endsWith('/commit'));
      return { body: result() };
    });
    await api.loadAdminContent();
    assert.deepEqual(await api.saveAdminDraft(2, doc), result());
    assert.equal(uploaded, partCount);
    assert.equal(calls.filter(call => call.url.endsWith('/commit')).length, 1);
    assert.ok(waits.length >= Math.floor((partCount + 1) / identity));
    assert.ok(waits.every(ms => ms >= 60000));
    if (otherWrites) assert.ok(denied > 3, 'must survive more than the old three operation-wide retries');
  });
});

for (const mode of ['publish', 'rollback']) test(`F4 ${mode} completes 536 bounded advances for the legal cardinality fixture`, async () => withClock(async () => {
  const { cardinalityDocument } = await import('./fixtures/cms-cardinality.mjs');
  const doc = cardinalityDocument(), parts = splitCmsDocument(doc), steps = [];
  let batchCount = 0, batchBytes = 0;
  for (const part of parts) {
    const bytes = Buffer.byteLength(JSON.stringify(part.value));
    assert.ok(bytes <= 32768);
    if (batchCount === 40 || batchBytes + bytes > 32768) { steps.push(batchCount); batchCount = 0; batchBytes = 0; }
    batchCount++; batchBytes += bytes;
  }
  if (batchCount) steps.push(batchCount);
  const entries = doc.pages.length * 3 + 7;
  steps.push(...Array(entries).fill(1));
  assert.equal(steps.length, 536);
  const total = parts.length + entries;
  let done = 0, advances = 0, used = 0, resetAt = Date.now() + 60000;
  const calls = fixture(call => {
    if (call.method === 'GET') return { body: loaded() };
    if (Date.now() >= resetAt) { used = 0; resetAt = Date.now() + 60000; }
    assert.ok(++used <= CMS_REQUEST_LIMITS.write.identity);
    if (call.url.endsWith('/preparations')) return { body: { id, ready: false, done, total } };
    if (call.url.endsWith('/advance')) { done += steps[advances++]; return { body: { id, ready: done === total, done, total } }; }
    assert.ok(call.url.endsWith('/commit')); assert.equal(advances, steps.length);
    return { body: result(true) };
  });
  await api.loadAdminContent();
  assert.deepEqual(await (mode === 'publish' ? api.publishAdminDraft(2) : api.rollbackAdminRevision(2, 1)), result(true));
  assert.equal(calls.filter(call => call.url.endsWith('/commit')).length, 1);
}));

test('K1 client accepts bounded native-node progress at the derived byte ceiling',async()=>withClock(async()=>{
  const total=maxPreparationTotal;
  fixture(call=>({body:call.method==='GET'?loaded():call.url.endsWith('/preparations')?{id,ready:false,done:total-1,total}:call.url.endsWith('/advance')?{id,ready:true,done:total,total}:result(true)}));
  await api.loadAdminContent();assert.deepEqual(await api.publishAdminDraft(2),result(true));
}));

test('F4 protocol ceiling permits finite forward progress beyond one hour', async () => withClock(async () => {
  let done = 0;
  const total=boundedPlanTotal;
  const began = Date.now();
  fixture(call => {
    if (call.method === 'GET') return { body: loaded() };
    if (call.url.endsWith('/preparations')) return { body: { id, ready: false, done, total } };
    if (call.url.endsWith('/advance')) return { body: { id, ready: ++done === total, done, total } };
    assert.ok(call.url.endsWith('/commit')); return { body: result(true) };
  });
  await api.loadAdminContent();
  assert.deepEqual(await api.publishAdminDraft(2), result(true));
  assert.equal(done, total);
  assert.ok(Date.now() - began > 3600000);
}));

test('F4 even the largest admitted plan has a finite deadline before another dispatch', async () => withClock(async ({ jump }) => {
  const upperDeadline = (3 * (maxPreparationTotal + 1) + 2 + 32) * 31000 + 32 * 60000 + 60000;
  const calls = fixture(call => ({ body: call.method === 'GET' ? loaded() : { id, ready: false, done: 0, total: maxPreparationTotal } }));
  await api.loadAdminContent();
  await assert.rejects(api.publishAdminDraft(2, progress => {
    if (progress.phase === 'prepare') jump(upperDeadline + 1);
  }), error => error.code === 'staged_operation_timeout' && error.preserveDraft);
  assert.equal(calls.length, 2, 'expired plan cannot send an advance or commit');
}));

for (const mode of ['publish', 'rollback']) test(`client contract: ${mode} prepares portable 573-part byte batches and 81 artifacts under the write budget`, async () => withClock(async ({ waits }) => {
  const doc = createCmsSeed();
  while (splitCmsDocument(doc).length < 573) {
    const index = Object.keys(doc.uiCopy).length;
    doc.uiCopy[`contract.${index}`] = { en: 'text', fr: 'texte', es: 'texto' };
  }
  const parts = splitCmsDocument(doc);
  const batches = [];
  let count = 0, bytes = 0;
  for (const { value } of parts) {
    const size = Buffer.byteLength(JSON.stringify(value));
    assert.ok(size <= 32768);
    if (count === 40 || bytes + size > 32768) { batches.push(count); count = 0; bytes = 0; }
    count++; bytes += size;
  }
  if (count) batches.push(count);
  const steps = [...batches, ...Array(81).fill(1)];
  const total = parts.length + 81;
  let done = 0, advances = 0, used = 0, resetAt = Date.now() + 60000;
  const calls = fixture(call => {
    if (call.method === 'GET') return { body: loaded() };
    if (Date.now() >= resetAt) { used = 0; resetAt = Date.now() + 60000; }
    if (used >= CMS_REQUEST_LIMITS.write.identity) return { status: 429, headers: { 'Retry-After': '60' }, body: { error: 'cms_request_rate' } };
    used++;
    if (call.url.endsWith('/preparations')) {
      assert.deepEqual(call.body, { expectedVersion: 2, mode, ...(mode === 'rollback' ? { revision: 1 } : {}) });
      return { body: { id, ready: false, done, total } };
    }
    if (call.url.endsWith('/advance')) {
      done += steps[advances++];
      return { body: { id, ready: done === total, done, total } };
    }
    assert.equal(advances, steps.length, 'all projection batches and artifacts must be ready before commit');
    return { body: result(true) };
  });
  await api.loadAdminContent();
  assert.deepEqual(await (mode === 'publish' ? api.publishAdminDraft(2) : api.rollbackAdminRevision(2, 1)), result(true));
  assert.equal(calls.filter(call => call.url.endsWith('/commit')).length, 1);
  assert.equal(advances, batches.length + 81);
  assert.ok(waits.length >= 1 && waits.every(ms => ms === 60000));
}));

test('client contract: 32 total rate retries bound intermittent contention across successful parts', async () => withClock(async () => {
  const attempts = new Map();
  const calls = fixture(call => {
    if (call.method === 'GET') return { body: loaded() };
    if (call.url.endsWith('/save-jobs')) return { body: { id, missing: Array.from({ length: 40 }, (_, index) => index) } };
    assert.ok(call.url.endsWith('/part'));
    const key = JSON.stringify([call.body.part.kind, call.body.part.index]);
    const attempt = (attempts.get(key) ?? 0) + 1; attempts.set(key, attempt);
    return attempt === 1 ? { status: 429, headers: { 'Retry-After': '1' }, body: { error: 'cms_request_rate' } } : { body: { stored: true } };
  });
  await api.loadAdminContent();
  await assert.rejects(api.saveAdminDraft(2, createCmsSeed()), error => error.status === 429 && error.preserveDraft);
  assert.equal(attempts.size, 33);
  assert.equal(calls.some(call => call.url.endsWith('/commit')), false);
}));

test('client contract: overslept write-budget wait cannot send a late save commit', async () => {
  await withClock(async ({ jump }) => {
    const calls = fixture(call => ({ body: call.method === 'GET' ? loaded() : call.url.endsWith('/save-jobs') ? { id, missing: Array.from({ length: 59 }, (_, i) => i) } : call.url.endsWith('/part') ? { stored: true } : result() }));
    await api.loadAdminContent();
    await assert.rejects(api.saveAdminDraft(2, createCmsSeed(), progress => {
      if (progress.phase === 'retry') jump(1800001);
    }), error => error.code === 'staged_operation_timeout' && error.preserveDraft);
    assert.equal(calls.some(call => call.url.endsWith('/commit')), false);
  });
});

test('client contract: excessive Retry-After fails rather than waiting indefinitely or retrying early', async () => {
  await withClock(async ({ waits }) => {
    let attempt = 0;
    const calls = fixture(call => call.method === 'GET' ? { body: loaded() } : ++attempt === 1 ? { status: 429, body: { error: 'rate_limited' }, headers: { 'Retry-After': '999999' } } : { body: { id, ready: true, done: 3, total: 3 } });
    await api.loadAdminContent();
    await assert.rejects(api.publishAdminDraft(2), error => error.status === 429);
    assert.deepEqual(waits, []);
    assert.equal(calls.length, 2);
  });
});

for (const stalled of [true, false]) test(`client contract: preparation ${stalled ? 'stalls' : 'never seals completed progress'} without commit`, async () => withClock(async ({ waits }) => {
  let advances = 0;
  const calls = fixture(call => {
    if (call.method === 'GET') return { body: loaded() };
    if (call.url.endsWith('/commit')) return { body: result(true) };
    if (call.url.endsWith('/advance')) advances++;
    return { body: { id, ready: false, done: stalled ? 0 : Math.min(advances, 6), total: 6 } };
  });
  await api.loadAdminContent();
  await assert.rejects(api.publishAdminDraft(2), error => error.code === 'staged_operation_limit');
  assert.ok(advances <= (stalled ? 3 : 9));
  if (stalled) assert.deepEqual(waits, [250, 500], 'stalled advances must back off rather than poll tightly');
  assert.equal(calls.some(call => call.url.endsWith('/commit')), false);
}));

test('client contract: elapsed operation deadline blocks the next request even after a ready response', async () => {
  await withClock(async ({ jump }) => {
    const calls = fixture(call => {
      if (call.method === 'GET') return { body: loaded() };
      if (call.url.endsWith('/preparations')) { jump(1800001); return { body: { id, ready: true, done: 3, total: 3 } }; }
      return { body: result(true) };
    });
    await api.loadAdminContent();
    await assert.rejects(api.publishAdminDraft(2), error => error.code === 'staged_operation_timeout');
    assert.equal(calls.length, 2);
  });
});

test('client contract: a failed save commit is never automatically resent', async () => {
  await withClock(async () => {
    const calls = fixture(call => call.method === 'GET' ? { body: loaded() } : call.url.endsWith('/save-jobs') ? { body: { id, missing: [] } } : { status: 429, body: { error: 'rate_limited' } });
    await api.loadAdminContent();
    await assert.rejects(api.saveAdminDraft(2, createCmsSeed()), error => error.status === 429);
    assert.equal(calls.filter(call => call.url.endsWith('/commit')).length, 1);
  });
});

for (const mode of ['save', 'publish', 'rollback']) for (const failure of ['network', 429, 500]) test(`client contract: ${mode} ambiguous commit ${failure} is never resent and never falls back`, async () => withClock(async () => {
  const calls = fixture(call => {
    if (call.method === 'GET') return { body: loaded() };
    if (call.url.endsWith('/save-jobs')) return { body: { id, missing: [] } };
    if (call.url.endsWith('/preparations')) return { body: { id, ready: true, done: 1, total: 1 } };
    assert.ok(call.url.endsWith('/commit'));
    if (failure === 'network') throw new TypeError('Connection lost after dispatch');
    return { status: failure, headers: { 'Retry-After': '60' }, body: { error: 'request_failed' } };
  });
  await api.loadAdminContent();
  const operation = mode === 'save' ? api.saveAdminDraft(2, createCmsSeed()) : mode === 'publish' ? api.publishAdminDraft(2) : api.rollbackAdminRevision(2, 1);
  await assert.rejects(operation, error => error.preserveDraft === true);
  assert.equal(calls.filter(call => call.url.endsWith('/commit')).length, 1);
  assert.equal(calls.some(call => /\/(draft|publish|rollback)$/.test(call.url)), false);
}));

test('client contract: stalled fetch is aborted and reported without retry or fallback', async () => {
  const oldTimeout = globalThis.setTimeout;
  globalThis.setTimeout = (callback, ms, ...args) => oldTimeout(callback, ms === 30000 ? 0 : ms, ...args);
  try {
    const calls = fixture(call => {
      if (call.method === 'GET') return { body: loaded() };
      assert.ok(call.init.signal, 'staged request needs a timeout signal');
      return new Promise((resolve, reject) => call.init.signal.addEventListener('abort', () => reject(new DOMException('Timed out', 'AbortError')), { once: true }));
    });
    await api.loadAdminContent();
    await assert.rejects(api.publishAdminDraft(2), error => error.code === 'staged_operation_timeout');
    assert.equal(calls.length, 2);
    assert.equal(calls[1].init.signal.aborted, true);
  } finally { globalThis.setTimeout = oldTimeout; }
});

test('client contract: a response arriving past the operation deadline is not treated as success', async () => {
  await withClock(async ({ jump }) => {
    fixture(call => {
      if (call.method === 'GET') return { body: loaded() };
      if (call.url.endsWith('/preparations')) return { body: { id, ready: true, done: 3, total: 3 } };
      jump(1800001);
      return { body: result(true) };
    });
    await api.loadAdminContent();
    await assert.rejects(api.publishAdminDraft(2), error => error.code === 'staged_operation_timeout');
  });
});

test('client contract: each load resets protocol selection and legacy request bodies remain unchanged', async () => {
  const document = createCmsSeed();
  let processing = 'staged-v1';
  const calls = fixture(call => ({ body: call.method === 'GET' ? loaded(processing) : result(call.url.endsWith('/publish') || call.url.endsWith('/rollback')) }));
  await api.loadAdminContent();
  processing = undefined;
  // Explicitly omit processing; loaded() otherwise defaults to staged.
  processing = '';
  await api.loadAdminContent();
  await api.saveAdminDraft(2, document);
  await api.publishAdminDraft(2);
  await api.rollbackAdminRevision(2, 1);
  assert.deepEqual(calls.slice(2).map(({ url, method, body }) => ({ url, method, body })), [
    { url: '/api/admin/content/draft', method: 'PUT', body: { expectedVersion: 2, document } },
    { url: '/api/admin/content/publish', method: 'POST', body: { expectedVersion: 2 } },
    { url: '/api/admin/content/rollback', method: 'POST', body: { expectedVersion: 2, revision: 1 } },
  ]);
});

for (const invalidResult of [{ version: 4, draftRevision: 4, published: false }, { version: -1, draftRevision: -1, published: false }, { version: 2, draftRevision: 2, published: false }, { version: 3, draftRevision: 3, published: true }, { version: 3, draftRevision: 4, published: false }]) test(`client contract: invalid staged save commit result is not accepted: ${JSON.stringify(invalidResult)}`, async () => {
  const calls = fixture(call => ({ body: call.method === 'GET' ? loaded() : call.url.endsWith('/save-jobs') ? { id, missing: [] } : invalidResult }));
  await api.loadAdminContent();
  await assert.rejects(api.saveAdminDraft(2, createCmsSeed()), error => error.code === 'invalid_response' && error.preserveDraft);
  assert.equal(calls.filter(call => call.url.endsWith('/commit')).length, 1);
});

test('client contract: preparation commit cannot report an unpublished revision', async () => {
  const calls = fixture(call => ({ body: call.method === 'GET' ? loaded() : call.url.endsWith('/preparations') ? { id, ready: true, done: 3, total: 3 } : result(false) }));
  await api.loadAdminContent();
  await assert.rejects(api.publishAdminDraft(2), error => error.code === 'invalid_response');
  assert.equal(calls.filter(call => call.url.endsWith('/commit')).length, 1);
});

test('client contract: staged save hashes every split value, uploads only missing positions and commits once privately', async () => {
  const document = createCmsSeed();
  const before = structuredClone(document);
  const parts = splitCmsDocument(document);
  const missing = [0, parts.length - 1];
  const progress = [];
  const calls = fixture(call => {
    if (call.method === 'GET') return { body: loaded() };
    if (call.url === '/api/admin/content/save-jobs') {
      assert.deepEqual(call.body, { expectedVersion: 2, manifest: parts.map(({ value, ...metadata }) => ({ ...metadata, digest: createHash('sha256').update(JSON.stringify(value), 'utf8').digest('hex') })) });
      return { body: { id, missing } };
    }
    if (call.url.endsWith('/part')) return { body: { stored: true } };
    if (call.url.endsWith('/commit')) return { body: result() };
    assert.fail(`Unexpected ${call.method} ${call.url}`);
  });
  await api.loadAdminContent();
  assert.deepEqual(await api.saveAdminDraft(2, document, event => progress.push(event)), result());
  assert.deepEqual(calls.filter(call => call.url.endsWith('/part')).map(call => call.body), missing.map(index => ({ part: parts[index] })));
  assert.equal(calls.filter(call => call.url.endsWith('/commit')).length, 1);
  assert.deepEqual(calls.at(-1).body, {});
  assert.equal(calls.some(call => /publish|preparations|\/draft$/.test(call.url)), false);
  for (const { init } of calls) {
    assert.equal(init.credentials, 'same-origin');
    assert.equal(init.cache, 'no-store');
    assert.equal(Object.keys(init.headers).some(key => /authorization|token|password/i.test(key)), false);
  }
  assert.ok(progress.some(event => event.phase === 'upload' && event.done === 2 && event.total === 2));
  assert.deepEqual(document, before);
});

for (const mutateAt of ['hash', 'upload']) test(`client contract: pending save is an immutable snapshot during ${mutateAt}`, async () => withClock(async () => {
  const document = createCmsSeed();
  const before = structuredClone(document);
  const expectedParts = splitCmsDocument(before);
  let mutated = false;
  const mutate = () => {
    mutated = true;
    document.pages[0].title.en = 'Must not enter the pending save';
    document.legacy.siteSettings.siteName = 'Also must not enter the pending save';
    document.uiCopy['late-key'] = { en: 'late', fr: 'tard', es: 'tarde' };
  };
  const missing = expectedParts.map((_, index) => index);
  const calls = fixture(call => {
    if (call.method === 'GET') return { body: loaded() };
    if (call.url.endsWith('/save-jobs')) {
      assert.deepEqual(call.body.manifest, expectedParts.map(({ value, ...metadata }) => ({ ...metadata, digest: createHash('sha256').update(JSON.stringify(value)).digest('hex') })));
      return { body: { id, missing } };
    }
    if (call.url.endsWith('/part')) {
      if (mutateAt === 'upload' && !mutated) mutate();
      return { body: { stored: true } };
    }
    return { body: result() };
  });
  await api.loadAdminContent();
  await api.saveAdminDraft(2, document, progress => { if (mutateAt === 'hash' && !mutated && progress.phase === 'hash') mutate(); });
  assert.equal(mutated, true);
  assert.deepEqual(calls.filter(call => call.url.endsWith('/part')).map(call => call.body.part), expectedParts);
}));

let ui;
for (const followOn of ['save-draft', 'publish']) for (const saveStatus of [200, 409, 503]) test(`client contract owner UI: clean A after rollback B and failed readback before ${followOn}, save ${saveStatus}`, async () => {
  const doc = ownerDocument();
  doc.uiCopy = {};
  const target = structuredClone(doc);
  target.pages[0].title.en = 'Distinct historical document B';
  const expectedParts = splitCmsDocument(doc);
  let reads = 0, version = 2, currentMode, saved = false;
  let serverDocument = structuredClone(doc), publishedDocument = structuredClone(doc);
  const uploaded = [];
  const calls = fixture(call => {
    if (call.url.endsWith('/revisions')) return { body: { revisions: [] } };
    if (call.method === 'GET') {
      if (++reads > 1) return { status: 503, body: { error: 'cms_unavailable' } };
      return { body: { ...loaded(), document: serverDocument } };
    }
    if (call.url.endsWith('/save-jobs')) {
      assert.equal(call.body.expectedVersion, 3, 'confirmed rollback version is remembered');
      assert.deepEqual(call.body.manifest, expectedParts.map(({ value, ...metadata }) => ({ ...metadata, digest: createHash('sha256').update(JSON.stringify(value)).digest('hex') })));
      if (saveStatus !== 200) return { status: saveStatus, body: { error: saveStatus === 409 ? 'save_conflict' : 'cms_unavailable' } };
      return { body: { id, missing: expectedParts.map((_, index) => index) } };
    }
    if (call.url.endsWith('/part')) { uploaded.push(call.body.part); return { body: { stored: true } }; }
    if (call.url.endsWith('/preparations')) {
      currentMode = call.body.mode;
      assert.equal(call.body.expectedVersion, version);
      if (currentMode === 'publish') {
        assert.equal(saved, true, 'must not publish server B while displaying A');
        assert.deepEqual(serverDocument, doc, 'publication uses exactly the displayed document');
      } else assert.deepEqual(call.body, { expectedVersion: 2, mode: 'rollback', revision: 1 });
      return { body: { id, ready: true, done: 3, total: 3 } };
    }
    assert.ok(call.url.endsWith('/commit'));
    if (call.url.includes('/save-jobs/')) {
      assert.deepEqual(uploaded, expectedParts);
      serverDocument = assembleCmsDocument(uploaded);
      assert.deepEqual(serverDocument, doc);
      saved = true;
    } else {
      if (currentMode === 'rollback') serverDocument = structuredClone(target);
      publishedDocument = structuredClone(serverDocument);
    }
    return { body: { version: ++version, draftRevision: version, published: !call.url.includes('/save-jobs/') } };
  });
  await mountOwner();
  assert.equal(document.querySelector('.cms-draft-state').classList.contains('is-dirty'), false, 'A starts clean');
  await ui.React.act(async () => {
    const input = document.querySelector('[name="rollback-revision"]');
    Object.getOwnPropertyDescriptor(ui.window.HTMLInputElement.prototype, 'value').set.call(input, '1');
    input.dispatchEvent(new ui.window.Event('input', { bubbles: true }));
  });
  await clickOwner('rollback');
  await waitUi(() => !document.querySelector('[name="rollback"]').disabled);
  assert.deepEqual(serverDocument, target);
  assert.deepEqual(publishedDocument, target);
  assert.equal(reads, 2);
  assert.equal(document.querySelector('[data-path="pages.home.title.en"]').value, doc.pages[0].title.en);
  assert.match(document.querySelector('.cms-version-details').textContent, /Version 3/);
  assert.equal(document.querySelector('.cms-draft-state').classList.contains('is-dirty'), true, 'failed readback invalidates stale saved baseline');
  const createUrl = URL.createObjectURL, revokeUrl = URL.revokeObjectURL;
  const click = ui.window.HTMLAnchorElement.prototype.click;
  let exported;
  try {
    URL.createObjectURL = blob => { exported = blob; return 'blob:client-contract'; };
    URL.revokeObjectURL = () => {};
    ui.window.HTMLAnchorElement.prototype.click = () => {};
    await clickOwner('export-draft');
    assert.deepEqual(JSON.parse(await exported.text()), doc, 'exact displayed A remains exportable');
  } finally { URL.createObjectURL = createUrl; URL.revokeObjectURL = revokeUrl; ui.window.HTMLAnchorElement.prototype.click = click; }
  await clickOwner(followOn);
  await waitUi(() => !document.querySelector('[name="publish"]').disabled);
  assert.equal(saved, saveStatus === 200);
  assert.equal(reads, 2, 'neither follow-on action hides a destructive reload');
  assert.equal(calls.filter(call => call.url.endsWith('/save-jobs')).length, 1);
  assert.equal(calls.filter(call => call.url.endsWith('/commit')).length, saveStatus !== 200 ? 1 : followOn === 'publish' ? 3 : 2);
  assert.deepEqual(publishedDocument, saveStatus === 200 && followOn === 'publish' ? doc : target);
  assert.deepEqual(serverDocument, saveStatus === 200 ? doc : target);
  assert.equal(document.querySelector('.cms-draft-state').classList.contains('is-dirty'), saveStatus !== 200);
  assert.equal(document.querySelector('[data-path="pages.home.title.en"]').value, doc.pages[0].title.en);
  if (saveStatus === 200) assert.equal(document.querySelector('[data-field-errors]'), null);
  else {
    assert.match(document.querySelector('[data-field-errors]').textContent, /edits are kept/i);
    assert.equal(calls.filter(call => call.url.endsWith('/preparations')).length, 1, 'failed private save must not start Publish');
  }
});

// Owner UI wiring, still controlled CLIENT CONTRACT responses, not live browser/server proof.
async function ownerUi() {
  if (ui) return ui;
  registerLoader('data:text/javascript,' + encodeURIComponent(`export async function load(url, context, nextLoad) {
    if (url.endsWith('.css')) return { format: 'module', source: 'export default {};', shortCircuit: true };
    return nextLoad(url, context);
  }`), import.meta.url);
  const { Window } = await import('happy-dom');
  const window = new Window({ url: 'https://client-contract.example/admin' });
  const assign = (key, value) => Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
  for (const key of ['window', 'document', 'navigator']) assign(key, key === 'window' ? window : window[key]);
  for (const key of Object.getOwnPropertyNames(window)) if (!(key in globalThis) && typeof window[key] === 'function' && /^[A-Z]/.test(key)) assign(key, window[key]);
  assign('requestAnimationFrame', window.requestAnimationFrame.bind(window));
  assign('cancelAnimationFrame', window.cancelAnimationFrame.bind(window));
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const React = await import('react');
  const { createRoot } = await import('react-dom/client');
  const { AdminApp } = await import('../src/admin/AdminApp.tsx');
  ui = { window, React, createRoot, AdminApp, root: null };
  return ui;
}
test.after(async () => { if (ui) { if (ui.root) await ui.React.act(async () => ui.root.unmount()); await ui.window.happyDOM.close(); } });
async function settleUi() { await ui.React.act(async () => new Promise(resolve => setTimeout(resolve, 0))); }
async function waitUi(predicate) {
  for (let attempt = 0; attempt < 200; attempt++) { const value = predicate(); if (value) return value; await settleUi(); }
  assert.fail(`UI did not settle: ${document.body.textContent.slice(0, 500)}`);
}
async function mountOwner(language = 'en') {
  const { window, React, createRoot, AdminApp } = await ownerUi();
  if (ui.root) await React.act(async () => ui.root.unmount());
  document.body.replaceChildren();
  const host = document.createElement('div'); document.body.append(host);
  ui.root = createRoot(host);
  await React.act(async () => ui.root.render(React.createElement(AdminApp, { language, onClose() { ui.closed = true; } })));
  await waitUi(() => document.querySelector('[data-admin-status="ready"]'));
  ui.closed = false;
  window.localStorage.clear(); window.sessionStorage.clear();
}
async function editOwnerTitle(value) {
  const input = document.querySelector('textarea[data-path="pages.home.title.en"]');
  assert.ok(input);
  await ui.React.act(async () => {
    Object.getOwnPropertyDescriptor(ui.window.HTMLTextAreaElement.prototype, 'value').set.call(input, value);
    input.dispatchEvent(new ui.window.Event('input', { bubbles: true }));
  });
}
async function clickOwner(name) { await ui.React.act(async () => document.querySelector(`button[name="${name}"]`).click()); }
function ownerDocument() {
  const doc = createCmsSeed();
  doc.pages = doc.pages.filter(page => page.id === 'home').map(page => ({ ...page, sections: [] }));
  doc.navigation = []; doc.footer.links = [];
  for (const field of ['products', 'editorialEntries', 'blogPosts', 'teamMembers', 'faqs', 'media', 'reviews']) doc[field] = [];
  for (const field of ['tours', 'customPages', 'blogPosts', 'teamMembers', 'faqs']) doc.legacy[field] = [];
  return doc;
}

for (const [language, expected] of [['en', 'Uploading draft'], ['fr', 'Envoi du brouillon'], ['es', 'Enviando borrador']]) test(`client contract owner UI: one Save action shows ${language} progress and retains busy/dirty guards`, async () => {
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  const doc = ownerDocument();
  const calls = fixture(call => {
    if (call.method === 'GET') return { body: call.url.endsWith('/revisions') ? { revisions: [] } : { ...loaded(), document: doc } };
    if (call.url.endsWith('/save-jobs')) return { body: { id, missing: [0] } };
    if (call.url.endsWith('/part')) return gate;
    if (call.url.endsWith('/commit')) return { body: result() };
    assert.fail(`Unexpected ${call.url}`);
  });
  await mountOwner(language);
  // The edit locale follows the owner language; select English before editing.
  await ui.React.act(async () => document.querySelector('[data-locale="en"]').click());
  await editOwnerTitle('Client-contract unsaved title');
  try {
    await clickOwner('save-draft');
    await waitUi(() => calls.some(call => call.url.endsWith('/part')));
    const progress = document.querySelector('[data-admin-progress]');
    assert.ok(progress, 'visible staged progress is required');
    assert.match(progress.textContent, new RegExp(expected));
    assert.equal(progress.getAttribute('role'), 'status');
    assert.equal(document.querySelector('[name="save-draft"]').disabled, true);
    assert.equal(document.querySelector('[name="publish"]').disabled, true);
    const navigation = new ui.window.Event('cms-before-navigation', { cancelable: true });
    ui.window.dispatchEvent(navigation);
    assert.equal(navigation.defaultPrevented, true);
    assert.equal(calls.some(call => /preparations|\/publish$/.test(call.url)), false);
  } finally { release({ body: { stored: true } }); await waitUi(() => !document.querySelector('[name="save-draft"]').disabled); }
  assert.equal(calls.filter(call => call.url.endsWith('/commit')).length, 1);
  assert.equal(document.querySelector('[data-admin-progress]'), null);
  assert.equal(ui.window.localStorage.length, 0);
  assert.equal(ui.window.sessionStorage.length, 0);
});

for (const [mode, language, label] of [['publish', 'fr', 'Préparation de la publication'], ['rollback', 'es', 'Preparando publicación']]) test(`client contract owner UI: explicit ${mode} prepares, shows localized progress and commits once`, async () => {
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  const doc = ownerDocument();
  let committed = false;
  const nextVersion = mode === 'publish' ? 4 : 3;
  const calls = fixture(call => {
    if (call.method === 'GET') return { body: call.url.endsWith('/revisions') ? { revisions: [] } : { ...loaded(), ...(committed ? { version: nextVersion, draftRevision: nextVersion, publishedRevision: nextVersion } : {}), document: doc } };
    if (call.url.endsWith('/save-jobs')) return { body: { id, missing: [] } };
    if (call.url.includes('/save-jobs/') && call.url.endsWith('/commit')) return { body: result(false) };
    if (call.url.endsWith('/preparations')) {
      assert.deepEqual(call.body, { expectedVersion: mode === 'publish' ? 3 : 2, mode, ...(mode === 'rollback' ? { revision: 1 } : {}) });
      return { body: { id, ready: false, done: 0, total: 81 } };
    }
    if (call.url.endsWith('/advance')) return gate;
    assert.ok(call.url.includes('/preparations/') && call.url.endsWith('/commit'));
    committed = true;
    return { body: { version: nextVersion, draftRevision: nextVersion, published: true } };
  });
  await mountOwner(language);
  await ui.React.act(async () => document.querySelector('[data-locale="en"]').click());
  await editOwnerTitle('Explicit owner action');
  if (mode === 'rollback') await ui.React.act(async () => {
    const input = document.querySelector('[name="rollback-revision"]');
    Object.getOwnPropertyDescriptor(ui.window.HTMLInputElement.prototype, 'value').set.call(input, '1');
    input.dispatchEvent(new ui.window.Event('input', { bubbles: true }));
  });
  try {
    await clickOwner(mode);
    await waitUi(() => calls.some(call => call.url.endsWith('/advance')));
    assert.match(document.querySelector('[data-admin-progress]').textContent, new RegExp(label));
    assert.equal(committed, false);
    for (const name of ['save-draft', 'publish', 'rollback']) assert.equal(document.querySelector(`[name="${name}"]`).disabled, true);
    await clickOwner(mode);
    assert.equal(calls.filter(call => call.url.endsWith('/preparations')).length, 1);
  } finally {
    release({ body: { id, ready: true, done: 81, total: 81 } });
    await waitUi(() => !document.querySelector('[name="publish"]').disabled);
  }
  assert.equal(committed, true);
  assert.equal(calls.filter(call => call.url.includes('/preparations/') && call.url.endsWith('/commit')).length, 1);
  assert.equal(calls.filter(call => call.url.endsWith('/save-jobs')).length, mode === 'publish' ? 1 : 0);
  assert.equal(calls.some(call => /\/(draft|publish|rollback)$/.test(call.url)), false);
  assert.equal(document.querySelector('[data-admin-progress]'), null);
  assert.equal(document.querySelector('[data-field-errors]'), null);
});

for (const [mode, status, language, kept] of [
  ['save', 409, 'en', /edits are kept/i], ['publish', 410, 'en', /edits are kept/i], ['rollback', 500, 'en', /edits are kept/i],
  ['save', 409, 'fr', /modifications sont conservées/i], ['save', 401, 'es', /cambios se conservan/i],
]) test(`client contract owner UI: failed ${mode} ${language} reports failure without discarding draft or committing`, async () => {
  const doc = ownerDocument();
  const calls = fixture(call => {
    if (call.method === 'GET') return { body: call.url.endsWith('/revisions') ? { revisions: [] } : { ...loaded(), document: doc } };
    if (mode === 'publish' && call.url.endsWith('/save-jobs')) return { body: { id, missing: [] } };
    if (mode === 'publish' && call.url.includes('/save-jobs/') && call.url.endsWith('/commit')) return { body: result() };
    return { status, body: { error: status === 409 ? 'version_conflict' : 'preparation_expired' } };
  });
  await mountOwner(language);
  await ui.React.act(async () => document.querySelector('[data-locale="en"]').click());
  await editOwnerTitle('Keep this unsaved edit');
  if (mode === 'rollback') {
    const input = document.querySelector('[name="rollback-revision"]');
    await ui.React.act(async () => {
      Object.getOwnPropertyDescriptor(ui.window.HTMLInputElement.prototype, 'value').set.call(input, '1');
      input.dispatchEvent(new ui.window.Event('input', { bubbles: true }));
    });
    ui.window.confirm = () => true;
  }
  await clickOwner(mode === 'save' ? 'save-draft' : mode);
  await waitUi(() => !document.querySelector('[name="save-draft"]').disabled);
  const errors = document.querySelector('[data-field-errors]');
  assert.ok(errors, 'owner must see an actionable staged failure');
  assert.match(errors.textContent, kept);
  assert.equal(document.querySelector('[data-path="pages.home.title.en"]').value, 'Keep this unsaved edit');
  assert.equal(calls.filter(call => call.method === 'GET' && call.url === '/api/admin/content?read=meta').length, 1, 'failure must not silently reload/discard edits');
  assert.equal(calls.some(call => call.url.includes('/preparations/') && call.url.endsWith('/commit')), false);
  if (mode === 'save') assert.equal(calls.some(call => call.url.endsWith('/commit')), false);
  assert.equal(document.querySelector('[data-admin-progress]'), null);
});

for (const status of [409, 503]) test(`client contract owner UI: rollback commit followed by failed refresh ${status} keeps working draft without another reload`, async () => {
  const doc = ownerDocument();
  let reads = 0;
  const calls = fixture(call => {
    if (call.url.endsWith('/revisions')) return { body: { revisions: [] } };
    if (call.method === 'GET') {
      if (++reads === 2) return { status, body: { error: 'cms_unavailable' } };
      return { body: { ...loaded(), document: doc } };
    }
    if (call.url.endsWith('/preparations')) return { body: { id, ready: true, done: 3, total: 3 } };
    assert.ok(call.url.endsWith('/commit'));
    return { body: result(true) };
  });
  await mountOwner();
  await editOwnerTitle('Keep this draft if refresh fails');
  await ui.React.act(async () => {
    const input = document.querySelector('[name="rollback-revision"]');
    Object.getOwnPropertyDescriptor(ui.window.HTMLInputElement.prototype, 'value').set.call(input, '1');
    input.dispatchEvent(new ui.window.Event('input', { bubbles: true }));
  });
  await clickOwner('rollback');
  await waitUi(() => !document.querySelector('[name="rollback"]').disabled);
  assert.equal(reads, 2, 'a failed refresh must not trigger another destructive reload');
  assert.equal(document.querySelector('[data-path="pages.home.title.en"]').value, 'Keep this draft if refresh fails');
  assert.match(document.querySelector('[data-field-errors]').textContent, /edits are kept/i);
  assert.equal(calls.filter(call => call.url.endsWith('/commit')).length, 1);
});
