import test from 'node:test';
import assert from 'node:assert/strict';
import { createOpenAISemanticExtractor } from '../src/providers/openai-semantic.js';
import { MAX_SEMANTIC_BODY_BYTES, processSemanticRequest } from '../src/providers/semantic-endpoint.js';
import { createRemoteSemanticExtractor, selectAllConfirmedEvidence } from '../src/adapters/remote/semantic.js';

const validDelta = {
  subjectResolution: { status: 'resolved', subject: { id: 'synthetic-device', type: 'device', label: 'Synthetic Device' }, reason: 'Explicitly named.' },
  items: [{ id: 'status', kind: 'claim', subject: 'synthetic-device', predicate: 'status', value: 'ready', unit: null, condition: null, provenance: 'reported', evidence: ['is ready'] }]
};

const request = (overrides = {}) => processSemanticRequest({
  method: 'POST',
  headers: { 'content-type': 'application/json', 'x-companion-demo-code': 'judge-code' },
  bodyText: JSON.stringify({ rawText: 'Synthetic Device is ready.', activeSubject: null, existingSubjects: [] }),
  accessCode: 'judge-code',
  extract: async () => validDelta,
  ...overrides
});

test('semantic endpoint requires method, access code, JSON and bounded rawText', async () => {
  assert.equal((await request({ method: 'GET' })).status, 405);
  assert.equal((await request({ headers: { 'content-type': 'application/json', 'x-companion-demo-code': 'wrong' } })).status, 401);
  assert.equal((await request({ headers: { 'content-type': 'text/plain', 'x-companion-demo-code': 'judge-code' } })).status, 415);
  assert.equal((await request({ bodyText: '{' })).status, 400);
  assert.equal((await request({ bodyText: JSON.stringify({ rawText: '' }) })).status, 400);
  assert.equal((await request({ bodyText: 'x'.repeat(MAX_SEMANTIC_BODY_BYTES + 1) })).status, 413);
});

test('semantic endpoint passes only normalized inputs and sanitizes provider failures', async () => {
  let input;
  const ok = await request({ extract: async (value) => { input = value; return validDelta; } });
  assert.equal(ok.status, 200); assert.equal(input.rawText, 'Synthetic Device is ready.'); assert.deepEqual(input.existingSubjects, []);
  const busy = await request({ extract: async () => { const error = new Error('secret upstream body'); error.providerStatus = 429; throw error; } });
  assert.deepEqual(busy, { status: 429, body: { error: 'Semantic extraction is temporarily busy. Try again.' } });
  const failed = await request({ extract: async () => { throw new Error('secret upstream body'); } });
  assert.deepEqual(failed, { status: 502, body: { error: 'Semantic extraction failed. Try again.' } });
});

test('OpenAI semantic provider uses strict structured output without leaking its key', async () => {
  let call;
  const extract = createOpenAISemanticExtractor({ apiKey: 'synthetic-key', fetchImpl: async (url, options) => {
    call = { url, options };
    return new Response(JSON.stringify({ output: [{ content: [{ type: 'output_text', text: JSON.stringify(validDelta) }] }] }), { status: 200 });
  } });
  assert.deepEqual(await extract({ rawText: 'Synthetic Device is ready.', capturedAt: '2026-09-02T00:00:00Z', activeSubject: null, existingSubjects: [] }), validDelta);
  assert.equal(call.url, 'https://api.openai.com/v1/responses');
  assert.equal(call.options.headers.Authorization, 'Bearer synthetic-key');
  const payload = JSON.parse(call.options.body); assert.equal(payload.model, 'gpt-5-mini'); assert.equal(payload.text.format.strict, true);
});

test('remote adapter sends the demo code and deterministic lookup returns every confirmed subject record', async () => {
  let call;
  const extract = createRemoteSemanticExtractor({ getAccessCode: () => 'judge-code', fetchImpl: async (url, options) => { call = { url, options }; return Response.json(validDelta); } });
  assert.deepEqual(await extract({ rawText: 'Synthetic Device is ready.' }), validDelta);
  assert.equal(call.url, '/api/semantic-extract'); assert.equal(call.options.headers['X-Companion-Demo-Code'], 'judge-code');
  assert.deepEqual((await selectAllConfirmedEvidence({ records: [{ recordId: 'r1' }, { recordId: 'r2' }] })).recordIds, ['r1', 'r2']);
});
