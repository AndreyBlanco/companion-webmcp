import test from 'node:test';
import assert from 'node:assert/strict';
import { createOpenAISemanticBuilder, createOpenAISubjectDetector } from '../src/providers/openai-semantic.js';
import { MAX_RAW_TEXT_CHARS, MAX_SEMANTIC_BODY_BYTES, processSemanticRequest } from '../src/providers/semantic-endpoint.js';
import { createRemoteSemanticBuilder, createRemoteSubjectDetector, selectAllConfirmedEvidence } from '../src/adapters/remote/semantic.js';

const subject = { id: 'synthetic-device', type: 'device', label: 'Synthetic Device' };
const resolution = { status: 'resolved', subject, reason: 'Explicitly named.' };
const items = [{ id: 'status', kind: 'claim', subject: subject.id, predicate: 'status', value: 'ready', unit: null, condition: null, provenance: 'reported', evidence: ['is ready'] }];
const request = (body, overrides = {}) => processSemanticRequest({ method: 'POST', headers: { 'content-type': 'application/json', 'x-companion-demo-code': 'judge-code' }, bodyText: JSON.stringify(body), accessCode: 'judge-code', detectSubject: async () => resolution, buildSemantics: async () => items, ...overrides });

test('semantic endpoint requires authorization, operation and a 1000-character rawText limit', async () => {
  assert.equal((await request({ operation: 'detect_subject', rawText: 'x' }, { method: 'GET' })).status, 405);
  assert.equal((await request({ operation: 'detect_subject', rawText: 'x' }, { headers: { 'content-type': 'application/json', 'x-companion-demo-code': 'wrong' } })).status, 401);
  assert.equal((await request({ operation: 'detect_subject', rawText: 'x' }, { headers: { 'content-type': 'text/plain', 'x-companion-demo-code': 'judge-code' } })).status, 415);
  assert.equal((await request({ rawText: 'x' })).status, 400); assert.equal((await request({ operation: 'detect_subject', rawText: 'x'.repeat(MAX_RAW_TEXT_CHARS + 1) })).status, 413);
  assert.equal((await request({}, { bodyText: 'x'.repeat(MAX_SEMANTIC_BODY_BYTES + 1) })).status, 413);
});

test('subject detection and semantic building are separate normalized operations', async () => {
  const calls = [];
  const first = await request({ operation: 'detect_subject', rawText: 'Synthetic Device is ready.', activeSubject: null, existingSubjects: [] }, { detectSubject: async (input) => { calls.push(['subject', input]); return resolution; } });
  const second = await request({ operation: 'build_semantics', rawText: 'Synthetic Device is ready.', confirmedSubject: subject }, { buildSemantics: async (input) => { calls.push(['semantics', input]); return items; } });
  assert.deepEqual(first.body, resolution); assert.deepEqual(second.body, { items }); assert.equal(calls[0][0], 'subject'); assert.deepEqual(calls[1][1].confirmedSubject, subject);
  assert.equal((await request({ operation: 'build_semantics', rawText: 'x' })).status, 400);
});

test('OpenAI provider uses distinct strict schemas and never re-resolves a confirmed subject', async () => {
  const calls = []; const fetchImpl = async (url, options) => { const payload = JSON.parse(options.body); calls.push({ url, options, payload }); const text = payload.text.format.name === 'companion_subject_resolution' ? JSON.stringify(resolution) : JSON.stringify({ items }); return new Response(JSON.stringify({ output: [{ content: [{ type: 'output_text', text }] }] }), { status: 200 }); };
  const detect = createOpenAISubjectDetector({ apiKey: 'synthetic-key', fetchImpl }); const build = createOpenAISemanticBuilder({ apiKey: 'synthetic-key', fetchImpl });
  assert.deepEqual(await detect({ rawText: 'Synthetic Device is ready.', activeSubject: null, existingSubjects: [] }), resolution); assert.deepEqual(await build({ rawText: 'Synthetic Device is ready.', confirmedSubject: subject }), items);
  assert.equal(calls[0].payload.text.format.name, 'companion_subject_resolution'); assert.equal(calls[1].payload.text.format.name, 'companion_semantic_items'); assert.equal(calls[1].payload.reasoning.effort, 'minimal'); assert.match(calls[1].payload.input, /already human-confirmed subject/); assert.equal(calls[0].options.headers.Authorization, 'Bearer synthetic-key');
});

test('remote adapters send explicit operations and retrieval excludes unfinished records', async () => {
  const calls = []; const fetchImpl = async (url, options) => { const body = JSON.parse(options.body); calls.push(body); return Response.json(body.operation === 'detect_subject' ? resolution : { items }); };
  const options = { getAccessCode: () => 'judge-code', fetchImpl }; assert.deepEqual(await createRemoteSubjectDetector(options)({ rawText: 'x' }), resolution); assert.deepEqual(await createRemoteSemanticBuilder(options)({ rawText: 'x', confirmedSubject: subject }), items);
  assert.deepEqual(calls.map((call) => call.operation), ['detect_subject', 'build_semantics']); assert.deepEqual((await selectAllConfirmedEvidence({ records: [{ recordId: 'r1', semanticStatus: 'ready' }, { recordId: 'r2', semanticStatus: 'failed' }] })).recordIds, ['r1']);
});
