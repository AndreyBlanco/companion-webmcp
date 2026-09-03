import test from 'node:test';
import assert from 'node:assert/strict';
import { createSemanticMemory, InMemorySemanticStore } from '../src/core/semantic-memory.js';
import { incorporateSemanticBuild } from '../src/core/semantic-authority.js';
import { createMemoryTool, createVocabularyTool, registerWebMcp, MEMORY_TOOL_NAME, VOCABULARY_TOOL_NAME } from '../src/webmcp/register.js';
import { authorityBuild, authorityRawText, authoritySubject } from '../fixtures/synthetic/semantic-build.js';
import { projectFactualVocabulary, lookupFactualVocabulary } from '../src/core/semantic-retrieval.js';

function harness() {
  const store = new InMemorySemanticStore();
  const forbidden = () => { throw new Error('Retrieval must not invoke a model or ID factory'); };
  const capabilities = createSemanticMemory({ store, detectSubject: forbidden, buildSemantics: forbidden, idFactory: forbidden });
  async function seed(recordId = 'b-record-1', subjectId = authoritySubject.id, semanticStatus = 'ready') {
    const record = { recordId, subjectId, rawText: authorityRawText, capturedAt: '2026-09-02T12:00:00Z', confirmedAt: '2026-09-02T12:01:00Z', semanticStatus };
    const output = authorityBuild(recordId, subjectId);
    // Two persisted fixture relations share an endpoint; lookup must not expand to neighbors.
    output.stageA.candidates[1].from = output.stageA.candidates[0].from;
    output.stageB[1].from = output.stageB[0].from;
    const saved = { ...record, ...incorporateSemanticBuild(output, record) };
    await store.save({ subject: { ...authoritySubject, id: subjectId }, record: saved });
    return saved;
  }
  return { store, capabilities, seed };
}
const allIds = (vocabulary) => vocabulary.items.map((item) => item.id);
const returnedIds = (payload) => payload.records.flatMap((record) => record.evidence.map((edge) => edge.id));

test('P12 vocabulary is readable, versioned and uses stable Companion relation IDs', async () => {
  const { capabilities, seed } = harness(); const saved = await seed();
  const first = await capabilities.getVocabulary({ subjectId: authoritySubject.id });
  assert.match(first.version, /^sha256:[a-f0-9]{64}$/);
  assert.equal(first.items.length, 3);
  assert.deepEqual(new Set(allIds(first)), new Set(saved.semanticGraph.edges.map((edge) => edge.id)));
  assert.ok(first.items.some((item) => item.label.includes('blue')));
  assert.ok(first.items.every((item) => item.label && item.evidenceTypes.length > 0));
  assert.deepEqual(await capabilities.getVocabulary({ subjectId: authoritySubject.id }), first);
});

test('P12 version changes with factual content while existing IDs survive additive Entries', async () => {
  const { capabilities, seed } = harness();
  const empty = await capabilities.getVocabulary({ subjectId: authoritySubject.id });
  await seed(); const first = await capabilities.getVocabulary({ subjectId: authoritySubject.id });
  await seed('b-record-2'); const second = await capabilities.getVocabulary({ subjectId: authoritySubject.id });
  assert.notEqual(empty.version, first.version); assert.notEqual(first.version, second.version);
  assert.ok(allIds(first).every((id) => allIds(second).includes(id)));
  await seed('b-other', 'other-subject');
  await seed('b-failed', authoritySubject.id, 'failed');
  await seed('b-processing', authoritySubject.id, 'processing');
  assert.deepEqual(await capabilities.getVocabulary({ subjectId: authoritySubject.id }), second);
  await capabilities.clearMemory();
  assert.deepEqual(await capabilities.getVocabulary({ subjectId: authoritySubject.id }), empty);
});

test('P12 version covers source content, not just the set of IDs', async () => {
  const { store, capabilities, seed } = harness(); const saved = await seed();
  const before = await capabilities.getVocabulary({ subjectId: authoritySubject.id });
  const changed = structuredClone(saved.semanticGraph);
  changed.nodes[0].label = 'Updated synthetic fixture label';
  await store.update(saved.recordId, { semanticGraph: changed });
  const after = await capabilities.getVocabulary({ subjectId: authoritySubject.id });
  assert.notEqual(before.version, after.version); assert.deepEqual(allIds(before), allIds(after));
});

test('P13 one externally selected ID returns only its relation and endpoints, never neighbors or whole raw', async () => {
  const { capabilities, seed } = harness(); const saved = await seed();
  const vocabulary = await capabilities.getVocabulary({ subjectId: authoritySubject.id });
  const selected = vocabulary.items.find((item) => item.label.includes('blue'));
  const payload = await capabilities.queryMemory({ subjectId: authoritySubject.id, relevantVocabularyIds: [selected.id] });
  assert.deepEqual(returnedIds(payload), [selected.id]); assert.equal(payload.records.length, 1);
  const record = payload.records[0]; const edge = record.evidence[0];
  assert.deepEqual(new Set(record.nodes.map((node) => node.id)), new Set([edge.from, edge.to]));
  assert.equal(record.recordId, saved.recordId); assert.equal(record.capturedAt, saved.capturedAt); assert.equal(record.confirmedAt, saved.confirmedAt);
  assert.equal(edge.sourceRecordId, saved.recordId); assert.equal(edge.provenance, 'observed');
  assert.deepEqual(edge.sourceEvidence, saved.semanticGraph.edges[0].sourceEvidence);
  assert.equal(payload.vocabularyVersion, vocabulary.version);
  assert.equal('rawText' in record, false); assert.equal('semanticAudit' in record, false);
});

test('P13 multiple IDs across Entries preserve exact selection and provenance', async () => {
  const { capabilities, seed } = harness(); const first = await seed(); const second = await seed('b-record-2');
  const ids = [first.semanticGraph.edges[1].id, second.semanticGraph.edges[2].id];
  const payload = await capabilities.queryMemory({ subjectId: authoritySubject.id, relevantVocabularyIds: ids });
  assert.deepEqual(new Set(returnedIds(payload)), new Set(ids)); assert.equal(payload.records.length, 2);
  assert.deepEqual(payload.unknownVocabularyIds, []);
  assert.ok(payload.records.every((record) => record.evidence.every((edge) => edge.sourceRecordId === record.recordId && edge.sourceEvidence.every((quote) => quote.recordId === record.recordId))));
  assert.equal(payload.records[1].evidence[0].provenance, 'speaker_inference');
});

test('P13 unknown and other-subject IDs are explicit; empty selection never broadens retrieval', async () => {
  const { capabilities, seed } = harness(); const saved = await seed(); const other = await seed('b-other', 'other-subject');
  const known = saved.semanticGraph.edges[0].id; const foreign = other.semanticGraph.edges[0].id;
  const request = { subjectId: authoritySubject.id, relevantVocabularyIds: ['unknown', foreign, known] };
  const payload = await capabilities.queryMemory(request);
  assert.deepEqual(returnedIds(payload), [known]); assert.deepEqual(payload.unknownVocabularyIds, [foreign, 'unknown'].sort());
  assert.deepEqual(await capabilities.queryMemory(request), payload);
  assert.deepEqual((await capabilities.queryMemory({ subjectId: authoritySubject.id, relevantVocabularyIds: [] })).records, []);
  assert.deepEqual((await capabilities.queryMemory({ subjectId: 'missing-subject', relevantVocabularyIds: [known] })).unknownVocabularyIds, [known]);
});

test('P13 invalid inputs fail explicitly rather than falling back to a question or all memory', async () => {
  const { capabilities, seed } = harness(); await seed();
  for (const ids of [undefined, null, 'id', [null], [''], ['  '], [42], [{}]]) {
    await assert.rejects(capabilities.queryMemory({ subjectId: authoritySubject.id, relevantVocabularyIds: ids }), /relevantVocabularyIds/);
  }
  await assert.rejects(capabilities.queryMemory({ subjectId: authoritySubject.id, question: 'all memory' }), /Lookup requires/);
  await assert.rejects(capabilities.queryMemory({ relevantVocabularyIds: [] }), /subjectId/);
});

test('P13 repeated lookup and duplicate IDs are deterministic and do not mutate memory or call models', async (t) => {
  const { store, capabilities, seed } = harness(); await seed();
  const before = await store.bySubject(authoritySubject.id);
  t.mock.method(globalThis, 'fetch', () => { throw new Error('Network call in retrieval'); });
  const vocabulary = await capabilities.getVocabulary({ subjectId: authoritySubject.id });
  const ids = allIds(vocabulary);
  const first = await capabilities.queryMemory({ subjectId: authoritySubject.id, relevantVocabularyIds: ids });
  const repeated = await capabilities.queryMemory({ subjectId: authoritySubject.id, relevantVocabularyIds: [...ids].reverse().concat(ids[0]) });
  assert.deepEqual(first, repeated); assert.deepEqual(first.requestedVocabularyIds, ids.sort());
  assert.deepEqual(await store.bySubject(authoritySubject.id), before);
});

test('P12/P13 exclude AGENT_INFERRED and audit-only nodes even when their IDs are requested', async () => {
  const { capabilities, seed } = harness(); const saved = await seed();
  const vocabulary = await capabilities.getVocabulary({ subjectId: authoritySubject.id });
  const excluded = JSON.stringify([saved.recordId, 'relation', 4]);
  const payload = await capabilities.queryMemory({ subjectId: authoritySubject.id, relevantVocabularyIds: [...allIds(vocabulary), excluded] });
  assert.deepEqual(payload.unknownVocabularyIds, [excluded]);
  assert.doesNotMatch(JSON.stringify({ vocabulary, payload }), /AGENT_INFERRED|possible electrical fault|semanticAudit/);
  assert.ok(payload.records[0].evidence.some((edge) => edge.epistemicStatus === 'SOURCE_STRONGLY_IMPLIED'));
});

test('P12/P13 WebMCP registers separate projection and explicit-ID lookup on the same core capabilities', async () => {
  const { capabilities, seed } = harness(); await seed(); const registered = [];
  await registerWebMcp({ registerTool: async (tool) => registered.push(tool) }, capabilities);
  assert.deepEqual(registered.map((tool) => tool.name), [VOCABULARY_TOOL_NAME, MEMORY_TOOL_NAME]);
  assert.equal(registered[0].execute, capabilities.getVocabulary); assert.equal(registered[1].execute, capabilities.queryMemory);
  const vocabulary = await createVocabularyTool(capabilities).execute({ subjectId: authoritySubject.id });
  const selected = vocabulary.items.find((item) => item.label.includes('blue')).id;
  const tool = createMemoryTool(capabilities);
  assert.deepEqual(tool.inputSchema.required, ['subjectId', 'relevantVocabularyIds']);
  assert.equal('question' in tool.inputSchema.properties, false);
  const payload = await tool.execute({ subjectId: authoritySubject.id, relevantVocabularyIds: [selected] });
  assert.deepEqual(returnedIds(payload), [selected]); assert.equal('answer' in payload, false);
  assert.equal((await registerWebMcp(null, capabilities)).available, false);
});

test('P14 supports incremental external-agent retrieval without internal sufficiency planning', async () => {
  const { capabilities, seed } = harness();

  await seed();
  const vocabulary = await capabilities.getVocabulary({
    subjectId: authoritySubject.id
  });

  assert.ok(
    vocabulary.items.length >= 3,
    'fixture must expose at least three factual vocabulary items'
  );

  const [firstItem, secondItem, thirdItem] = vocabulary.items;

  // Round 1:
  // The external agent chooses an initial subset.
  const firstLookup = await capabilities.queryMemory({
    subjectId: authoritySubject.id,
    relevantVocabularyIds: [firstItem.id]
  });

  assert.deepEqual(
    firstLookup.requestedVocabularyIds,
    [firstItem.id]
  );

  assert.deepEqual(
    returnedIds(firstLookup),
    [firstItem.id],
    'first lookup must return only the externally selected evidence'
  );

  // Companion does not evaluate sufficiency.
  // The external agent decides more evidence is needed and requests
  // only additional vocabulary IDs.
  const secondRequestedIds = [secondItem.id, thirdItem.id];

  const secondLookup = await capabilities.queryMemory({
    subjectId: authoritySubject.id,
    relevantVocabularyIds: secondRequestedIds
  });

  assert.deepEqual(
    secondLookup.requestedVocabularyIds,
    [...secondRequestedIds].sort()
  );

  const secondEvidenceIds = returnedIds(secondLookup);

  assert.deepEqual(
    [...secondEvidenceIds].sort(),
    [...secondRequestedIds].sort(),
    'second lookup must return only the newly requested evidence'
  );

  assert.equal(
    secondEvidenceIds.includes(firstItem.id),
    false,
    'Companion must not automatically repeat previously retrieved evidence'
  );

  // Prior context is retained by the external agent, not by Companion.
  const retainedByExternalAgent = [
    ...returnedIds(firstLookup),
    ...secondEvidenceIds
  ];

  assert.deepEqual(
    [...retainedByExternalAgent].sort(),
    [firstItem.id, secondItem.id, thirdItem.id].sort()
  );

  // Repeating the second request over unchanged memory remains deterministic.
  const repeatedSecondLookup = await capabilities.queryMemory({
    subjectId: authoritySubject.id,
    relevantVocabularyIds: secondRequestedIds
  });

  assert.deepEqual(
    repeatedSecondLookup,
    secondLookup,
    'incremental lookup must remain deterministic'
  );

  // Companion never produces an answer or sufficiency decision.
  assert.equal('answer' in firstLookup, false);
  assert.equal('answer' in secondLookup, false);
  assert.equal('sufficient' in firstLookup, false);
  assert.equal('sufficient' in secondLookup, false);
});
