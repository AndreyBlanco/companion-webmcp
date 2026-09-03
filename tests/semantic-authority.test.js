import test from 'node:test';
import assert from 'node:assert/strict';
import { incorporateSemanticBuild, NODE_TYPES, RELATION_TYPES } from '../src/core/semantic-authority.js';
import { createSemanticMemory, InMemorySemanticStore } from '../src/core/semantic-memory.js';
import { createMemoryTool } from '../src/webmcp/register.js';
import { authorityBuild, authorityRawText, authoritySubject } from '../fixtures/synthetic/semantic-build.js';

const record = { recordId: 'record-a', subjectId: authoritySubject.id, rawText: authorityRawText };
const reject = (mutate, code) => { const output = authorityBuild(); mutate(output); assert.throws(() => incorporateSemanticBuild(output, record), { code }); };
function memory(build = ({ recordId, confirmedSubject }) => authorityBuild(recordId, confirmedSubject.id)) {
  let sequence = 0;
  return createSemanticMemory({ store: new InMemorySemanticStore(), idFactory: () => `record-${++sequence}`,
    detectSubject: async () => ({ status: 'resolved', subject: authoritySubject, reason: 'Synthetic fixture' }),
    buildSemantics: build });
}
async function save(capabilities) {
  const draft = await capabilities.prepare({ rawText: authorityRawText });
  const pending = await capabilities.confirm({ draftId: draft.draftId, confirmationToken: draft.confirmationToken, confirmed: true, confirmedRawText: draft.rawText, confirmedSubject: authoritySubject });
  return capabilities.processRecord(pending.recordId);
}

test('explicit and strongly implied relations are factual-eligible; human inference retains attribution', () => {
  const result = incorporateSemanticBuild(authorityBuild(), record);
  assert.deepEqual(result.semanticGraph.edges.map((edge) => edge.epistemicStatus), ['SOURCE_EXPLICIT', 'SOURCE_STRONGLY_IMPLIED', 'SOURCE_EXPLICIT']);
  assert.equal(result.semanticGraph.edges[2].provenance, 'speaker_inference');
  assert.ok(result.semanticGraph.nodes.some((node) => node.label === 'the fan may be worn'));
  assert.equal(result.semanticAudit.stageA.candidates.length, 4);
  assert.equal(result.semanticAudit.stageB.length, 4);
  assert.equal(result.semanticAudit.routing[3].factual, false);
  assert.equal(result.semanticAudit.routing[3].persistentId, null);
});

test('AGENT_INFERRED and its exclusive nodes never enter factual persistence or WebMCP evidence', async () => {
  const capabilities = memory(); const saved = await save(capabilities);
  assert.equal(saved.semanticStatus, 'ready');
  assert.equal(saved.semanticGraph.edges.length, 3); assert.equal(saved.semanticGraph.nodes.length, 6);
  assert.equal(saved.semanticAudit.stageB[3].epistemicStatus, 'AGENT_INFERRED');
  const payload = await createMemoryTool(capabilities).execute({ relevantVocabularyIds: saved.semanticGraph.edges.map((edge) => edge.id), subjectId: authoritySubject.id });
  assert.equal(payload.records.length, 1);
  assert.equal(JSON.stringify(payload).includes('possible electrical fault'), false);
  assert.equal(JSON.stringify(payload).includes('AGENT_INFERRED'), false);
  assert.equal('semanticAudit' in payload.records[0], false);
  assert.equal(payload.records[0].capturedAt, saved.capturedAt);
  assert.equal(payload.records[0].confirmedAt, saved.confirmedAt);
  assert.equal(saved.rawText, authorityRawText);
  assert.ok(payload.records[0].evidence.every((edge) => edge.sourceEvidence.every((quote) => quote.recordId === saved.recordId)));
});

test('duplicate local IDs between Entries become distinct persistent IDs and remapped references', async () => {
  const capabilities = memory(); const first = await save(capabilities); const second = await save(capabilities);
  assert.deepEqual(first.semanticAudit.stageA.candidates.map((edge) => edge.id), second.semanticAudit.stageA.candidates.map((edge) => edge.id));
  const ids = [first, second].flatMap((entry) => [...entry.semanticGraph.nodes, ...entry.semanticGraph.edges].map((item) => item.id));
  assert.equal(new Set(ids).size, ids.length);
  for (const entry of [first, second]) for (const edge of entry.semanticGraph.edges) {
    assert.equal(edge.sourceRecordId, entry.recordId);
    assert.ok(entry.semanticGraph.nodes.some((node) => node.id === edge.from));
    assert.ok(entry.semanticGraph.nodes.some((node) => node.id === edge.to));
    assert.equal(edge.sourceEvidence[0].recordId, entry.recordId);
  }
  const request = { subjectId: authoritySubject.id, relevantVocabularyIds: [first, second].flatMap((record) => record.semanticGraph.edges.map((edge) => edge.id)) };
  const a = await capabilities.queryMemory(request);
  const b = await capabilities.queryMemory(request);
  assert.deepEqual(a, b); assert.equal(a.records.length, 2);
  assert.deepEqual((await capabilities.queryMemory({ relevantVocabularyIds: request.relevantVocabularyIds, subjectId: 'other' })).records, []);
});

test('candidate deletion, duplication, replacement and mutation are rejected, even with equal counts', () => {
  for (const mutate of [
    (o) => o.stageB.pop(),
    (o) => { o.stageB[1] = structuredClone(o.stageB[0]); },
    (o) => { o.stageB[0].id = 'replacement'; },
    (o) => { o.stageB[0].from = o.stageB[1].from; },
    (o) => { o.stageB[0].to = o.stageB[1].to; },
    (o) => { o.stageB[0].type = 'about'; },
    (o) => { o.stageB[0].provenance = 'reported'; },
    (o) => { o.stageB[0].sourceEvidence[0].quote = 'Synthetic Device'; }
  ]) reject(mutate, 'CANDIDATE_CORRESPONDENCE_INVALID');
});

test('sourceEvidence uses the correct Entry and whitespace-only exact matching', () => {
  const output = authorityBuild();
  assert.doesNotThrow(() => incorporateSemanticBuild(output, { ...record, rawText: authorityRawText.replaceAll(' ', ' \n\t ') }));
  for (const quote of ['A blue cover is on the device.', 'Synthetic...blue cover.', 'synthetic Device has a blue cover.']) {
    reject((o) => { o.stageA.candidates[0].sourceEvidence[0].quote = quote; o.stageB[0].sourceEvidence[0].quote = quote; }, 'GROUNDING_REFERENCE_INVALID');
  }
  reject((o) => { o.stageA.nodes[0].sourceEvidence[0].recordId = 'another-entry'; }, 'GROUNDING_REFERENCE_INVALID');
  reject((o) => { o.stageA.candidates[3].sourceEvidence[0].recordId = 'another-entry'; o.stageB[3].sourceEvidence[0].recordId = 'another-entry'; }, 'GROUNDING_REFERENCE_INVALID');
});

test('closed structure, metamodel, IDs, endpoints, Entry and epistemic enum are enforced mechanically', () => {
  for (const mutate of [
    (o) => { o.stageB[0].epistemicStatus = 'AMBIGUOUS'; },
    (o) => { delete o.stageB[0].epistemicStatus; },
    (o) => { o.stageA.nodes[0].type = 'diagnosis'; },
    (o) => { o.stageA.candidates[0].type = 'causes'; },
    (o) => { o.stageA.candidates[0].provenance = 'system_inference'; },
    (o) => { o.stageA.nodes[0].label = {}; },
    (o) => { o.stageB[0].confidence = 1; },
    (o) => { o.stageA.nodes[0].sourceEvidence = []; },
    (o) => { o.stageA.candidates[0].provenance = null; o.stageB[0].provenance = null; }
  ]) reject(mutate, 'STRUCTURE_INVALID');
  reject((o) => { o.stageA.nodes[1].id = o.stageA.nodes[0].id; }, 'LOCAL_ID_DUPLICATE');
  reject((o) => { o.stageA.candidates[1].id = o.stageA.candidates[0].id; }, 'LOCAL_ID_DUPLICATE');
  reject((o) => { o.stageA.candidates[0].from = 'foreign-node'; o.stageB[0].from = 'foreign-node'; }, 'REFERENCE_INVALID');
  reject((o) => { o.subjectId = 'other'; }, 'ENTRY_BOUNDARY_INVALID');
  reject((o) => { o.recordId = 'other'; }, 'ENTRY_BOUNDARY_INVALID');
  assert.equal(NODE_TYPES.length, 7); assert.equal(RELATION_TYPES.length, 12);
});

test('validation failure remains visible and preserves raw evidence without factual incorporation', async () => {
  const capabilities = memory(({ recordId }) => { const output = authorityBuild(recordId); output.stageA.nodes[0].sourceEvidence[0].quote = 'fabricated'; return output; });
  const saved = await save(capabilities);
  assert.equal(saved.semanticStatus, 'failed'); assert.equal(saved.rawText, authorityRawText);
  assert.deepEqual(saved.semanticGraph, { nodes: [], edges: [] });
  assert.deepEqual(saved.semanticErrors.map((error) => error.code), Array(3).fill('GROUNDING_REFERENCE_INVALID'));
  assert.equal((await capabilities.getSubjectMemory(authoritySubject.id)).length, 1);
});

test('A/B reconciliation failure cannot incorporate a partial factual graph', async () => {
  const capabilities = memory(({ recordId }) => { const output = authorityBuild(recordId); output.stageB.pop(); return output; });
  const saved = await save(capabilities);
  assert.equal(saved.semanticStatus, 'failed'); assert.equal(saved.rawText, authorityRawText);
  assert.deepEqual(saved.semanticGraph, { nodes: [], edges: [] });
  assert.ok(saved.semanticErrors.every((error) => error.code === 'CANDIDATE_CORRESPONDENCE_INVALID'));
  assert.deepEqual((await capabilities.queryMemory({ subjectId: authoritySubject.id, relevantVocabularyIds: [] })).records, []);
});

test('record identity collisions cannot overwrite or merge confirmed Entries', async () => {
  const store = new InMemorySemanticStore();
  await store.save({ subject: authoritySubject, record });
  await assert.rejects(store.save({ subject: authoritySubject, record: { ...record, rawText: 'different' } }), /identity collision/);
  assert.equal((await store.byId(record.recordId)).rawText, authorityRawText);
  assert.equal((await store.bySubject(authoritySubject.id)).length, 1);
});

test('an expressive limitation is visible without inventing types or factual relations', async () => {
  const capabilities = memory(({ recordId }) => ({ recordId, subjectId: authoritySubject.id, stageA: { nodes: [], candidates: [], limitations: ['No relation representable in this synthetic case.'] }, stageB: [] }));
  const saved = await save(capabilities); assert.equal(saved.semanticStatus, 'ready');
  assert.deepEqual(saved.semanticGraph.edges, []);
  assert.equal(saved.semanticAudit.stageA.limitations.length, 1);
  assert.deepEqual((await capabilities.getVocabulary({ subjectId: authoritySubject.id })).items, []);
});
