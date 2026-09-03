import { authorityBuild, authorityRawText } from '../fixtures/synthetic/semantic-build.js';
import { createSemanticMemory, InMemorySemanticStore } from '../src/core/semantic-memory.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createOpenAISemanticBuilder, createOpenAISubjectDetector } from '../src/providers/openai-semantic.js';
import { MAX_RAW_TEXT_CHARS, MAX_SEMANTIC_BODY_BYTES, processSemanticRequest } from '../src/providers/semantic-endpoint.js';
import { createRemoteSemanticBuilder, createRemoteSubjectDetector, selectAllConfirmedEvidence } from '../src/adapters/remote/semantic.js';

const subject = { id: 'synthetic-device', type: 'device', label: 'Synthetic Device' };
const resolution = { status: 'resolved', subject, reason: 'Explicitly named.' };
const output = authorityBuild('record-a', subject.id);
const request = (body, overrides = {}) => processSemanticRequest({ method: 'POST', headers: { 'content-type': 'application/json', 'x-companion-demo-code': 'judge-code' }, bodyText: JSON.stringify(body), accessCode: 'judge-code', detectSubject: async () => resolution, buildSemantics: async () => output, ...overrides });

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
  const second = await request({ operation: 'build_semantics', recordId: 'record-a', rawText: 'Synthetic Device is ready.', confirmedSubject: subject }, { buildSemantics: async (input) => { calls.push(['semantics', input]); return output; } });
  assert.deepEqual(first.body, resolution); assert.deepEqual(second.body, output); assert.equal(calls[0][0], 'subject'); assert.deepEqual(calls[1][1].confirmedSubject, subject);
  assert.equal((await request({ operation: 'build_semantics', recordId: 'record-a', rawText: 'x' })).status, 400);
  assert.equal((await request({ operation: 'build_semantics', rawText: 'x', confirmedSubject: subject })).status, 400);
});

test('OpenAI provider uses distinct strict schemas and never re-resolves a confirmed subject', async () => {
  const calls = []; const fetchImpl = async (url, options) => { const payload = JSON.parse(options.body); calls.push({ url, options, payload }); const text = payload.text.format.name === 'companion_subject_resolution' ? JSON.stringify(resolution) : JSON.stringify(output); return new Response(JSON.stringify({ status: 'completed', output: [{ content: [{ type: 'output_text', text }] }] }), { status: 200 }); };
  const detect = createOpenAISubjectDetector({ apiKey: 'synthetic-key', fetchImpl }); const build = createOpenAISemanticBuilder({ apiKey: 'synthetic-key', fetchImpl });
  assert.deepEqual(await detect({ rawText: 'Synthetic Device is ready.', activeSubject: null, existingSubjects: [] }), resolution); assert.deepEqual(await build({ recordId: 'record-a', rawText: 'Synthetic Device is ready.', confirmedSubject: subject }), output);
  assert.equal(calls[0].payload.text.format.name, 'companion_subject_resolution'); assert.equal(calls[1].payload.text.format.name, 'companion_semantic_build'); assert.equal(calls[1].payload.reasoning.effort, 'minimal'); assert.match(calls[1].payload.input[0].content, /already human-confirmed subject/); assert.equal(calls[0].options.headers.Authorization, 'Bearer synthetic-key');
});

test('remote adapters send explicit operations and retrieval excludes unfinished records', async () => {
  const calls = []; const fetchImpl = async (url, options) => { const body = JSON.parse(options.body); calls.push(body); return Response.json(body.operation === 'detect_subject' ? resolution : output); };
  const options = { getAccessCode: () => 'judge-code', fetchImpl }; assert.deepEqual(await createRemoteSubjectDetector(options)({ rawText: 'x' }), resolution); assert.deepEqual(await createRemoteSemanticBuilder(options)({ recordId: 'record-a', rawText: 'x', confirmedSubject: subject }), output);
  assert.equal(calls[1].recordId, 'record-a');
  assert.deepEqual(calls.map((call) => call.operation), ['detect_subject', 'build_semantics']); assert.deepEqual((await selectAllConfirmedEvidence({ records: [{ recordId: 'r1', semanticStatus: 'ready' }, { recordId: 'r2', semanticStatus: 'failed' }] })).recordIds, ['r1']);
});

test('active remote/provider/core pipeline validates and routes before incorporation with one semantic call', async () => {
  let semanticCalls = 0; let sequence = 0;
  const provider = createOpenAISemanticBuilder({ apiKey: 'synthetic-key', fetchImpl: async (_url, options) => {
    semanticCalls += 1;
    const request = JSON.parse(options.body); const input = JSON.parse(request.input[1].content);
    const output = authorityBuild(input.recordId, input.confirmedSubject.id);
    return Response.json({ status: 'completed', output: [{ content: [{ type: 'output_text', text: JSON.stringify(output) }] }] });
  } });
  const remote = { getAccessCode: () => 'judge-code', fetchImpl: async (_url, options) => {
    const result = await processSemanticRequest({ method: options.method, headers: { 'content-type': 'application/json', 'x-companion-demo-code': options.headers['X-Companion-Demo-Code'] }, bodyText: options.body, accessCode: 'judge-code', detectSubject: async () => resolution, buildSemantics: provider });
    return Response.json(result.body, { status: result.status });
  } };
  const memory = createSemanticMemory({ store: new InMemorySemanticStore(), idFactory: () => `integration-${++sequence}`, detectSubject: createRemoteSubjectDetector(remote), buildSemantics: createRemoteSemanticBuilder(remote) });
  const draft = await memory.prepare({ rawText: authorityRawText });
  const pending = await memory.confirm({ draftId: draft.draftId, confirmationToken: draft.confirmationToken, confirmed: true, confirmedRawText: authorityRawText, confirmedSubject: subject });
  assert.equal(semanticCalls, 0); assert.equal((await memory.getSubjectMemory(subject.id))[0].rawText, authorityRawText);
  const saved = await memory.processRecord(pending.recordId);
  assert.equal(saved.semanticStatus, 'ready'); assert.equal(semanticCalls, 1);
  assert.equal(saved.semanticAudit.stageA.candidates.length, 4); assert.equal(saved.semanticGraph.edges.length, 3);
  const payload = await memory.queryMemory({ relevantVocabularyIds: saved.semanticGraph.edges.map((edge) => edge.id), subjectId: subject.id });
  assert.equal(payload.records[0].evidence.length, 3);
});

test('provider rejects incomplete output even when its JSON is parseable', async () => {
  for (const status of ['incomplete', 'failed']) {
    const build = createOpenAISemanticBuilder({ apiKey: 'synthetic-key', fetchImpl: async () => Response.json({ status, output: [{ content: [{ type: 'output_text', text: JSON.stringify(output) }] }] }) });
    await assert.rejects(build({ recordId: 'record-a', rawText: authorityRawText, confirmedSubject: subject }), /incomplete/);
  }
});
