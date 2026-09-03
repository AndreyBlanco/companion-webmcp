import test from 'node:test';
import assert from 'node:assert/strict';
import { createSemanticMemory, InMemorySemanticStore } from '../src/core/semantic-memory.js';
import { createMemoryTool, registerWebMcp, MEMORY_TOOL_NAME } from '../src/webmcp/register.js';
import { buildSyntheticSemantics, detectSyntheticSubject } from '../src/adapters/demo/semantic.js';

function harness(overrides = {}) {
  let sequence = 0;
  const store = new InMemorySemanticStore();
  const capabilities = createSemanticMemory({ store, detectSubject: detectSyntheticSubject, buildSemantics: buildSyntheticSemantics, idFactory: () => `synthetic-${++sequence}`, clock: () => new Date('2026-08-30T18:00:00.000Z'), ...overrides });
  return { store, capabilities };
}

async function save(capabilities, rawText) {
  const draft = await capabilities.prepare({ rawText });
  const pending = await capabilities.confirm({ draftId: draft.draftId, confirmationToken: draft.confirmationToken, confirmed: true, confirmedRawText: rawText, confirmedSubject: draft.subjectResolution.subject });
  const record = await capabilities.processRecord(pending.recordId);
  return { draft, record };
}

test('raw fidelity, confirmation boundary, provenance and source linkage are preserved', async () => {
  const { capabilities } = harness(); const rawText = 'Hyundai Accent Blue 2013: el cilindro 2 no tiene chispa.';
  const draft = await capabilities.prepare({ rawText });
  await assert.rejects(capabilities.confirm({ draftId: draft.draftId, confirmationToken: draft.confirmationToken, confirmed: false }), /Explicit confirmation/);
  assert.deepEqual(await capabilities.getSubjectMemory('hyundai-accent-blue-2013'), []);
  const pending = await capabilities.confirm({ draftId: draft.draftId, confirmationToken: draft.confirmationToken, confirmed: true, confirmedRawText: rawText, confirmedSubject: draft.subjectResolution.subject });
  const record = await capabilities.processRecord(pending.recordId);
  assert.equal(record.rawText, rawText); assert.equal(record.semanticGraph.edges[0].provenance, 'observed'); assert.equal(record.semanticGraph.edges[0].sourceRecordId, record.recordId);
});

test('ambiguous subject resolution cannot persist silently', async () => {
  const { capabilities } = harness(); const draft = await capabilities.prepare({ rawText: 'Ahora revisé otro vehículo.' });
  assert.equal(draft.subjectResolution.status, 'ambiguous');
  await assert.rejects(capabilities.confirm({ draftId: draft.draftId, confirmationToken: draft.confirmationToken, confirmed: true, confirmedRawText: draft.rawText, confirmedSubject: draft.subjectResolution.subject }), /confirmedSubject/);
});

test('active subject continuity creates progressive memory and retains speaker inference', async () => {
  const { capabilities } = harness(); await save(capabilities, 'Hyundai Accent Blue 2013: el cilindro 2 no tiene chispa.');
  await save(capabilities, 'La batería mide 12.4 voltios con el motor apagado.');
  const { record } = await save(capabilities, 'Creo que la causa parece ser la bobina de encendido.');
  assert.equal(record.subjectConfirmation.proposal.status, 'probable'); assert.equal(record.semanticGraph.edges[0].provenance, 'speaker_inference');
  assert.equal((await capabilities.getSubjectMemory('hyundai-accent-blue-2013')).length, 3);
});

test('retrieval isolates subject before exact ID lookup', async () => {
  const { capabilities } = harness(); const { record } = await save(capabilities, 'Hyundai Accent Blue 2013: el cilindro 2 no tiene chispa.');
  const ids = record.semanticGraph.edges.map((edge) => edge.id);
  const positive = await capabilities.queryMemory({ subjectId: record.subjectId, relevantVocabularyIds: ids });
  assert.deepEqual(positive.records.map((entry) => entry.recordId), [record.recordId]);
  const other = await capabilities.queryMemory({ subjectId: 'other-subject', relevantVocabularyIds: ids });
  assert.deepEqual(other.records, []); assert.deepEqual(other.unknownVocabularyIds, ids);
});

test('empty external selection returns no evidence or fabricated answer', async () => {
  const { capabilities } = harness(); await save(capabilities, 'Hyundai Accent Blue 2013: el cilindro 2 no tiene chispa.');
  const payload = await capabilities.queryMemory({ subjectId: 'hyundai-accent-blue-2013', relevantVocabularyIds: [] });
  assert.deepEqual(payload.records, []); assert.equal('answer' in payload, false);
});

test('WebMCP registers the same internal capability and never adds an answer', async () => {
  const { capabilities } = harness(); let registered;
  const status = await registerWebMcp({ registerTool: async (tool) => { if (tool.name === MEMORY_TOOL_NAME) registered = tool; } }, capabilities);
  assert.equal(status.toolName, MEMORY_TOOL_NAME); assert.equal(registered.execute, capabilities.queryMemory);
  const payload = await createMemoryTool(capabilities).execute({ subjectId: 'missing', relevantVocabularyIds: [] }); assert.equal('answer' in payload, false);
});

test('multiple confirmed entries retain their boundaries in explicitly selected retrieval', async () => {
  const { capabilities } = harness();
  await save(capabilities, 'Hyundai Accent Blue 2013: el cilindro 2 no tiene chispa.');
  await save(capabilities, 'La bater�a mide 12.4 voltios con el motor apagado.');
  const vocabulary = await capabilities.getVocabulary({ subjectId: 'hyundai-accent-blue-2013' });
  const payload = await capabilities.queryMemory({ subjectId: vocabulary.subjectId, relevantVocabularyIds: vocabulary.items.map((item) => item.id) });
  assert.equal(payload.records.length, 2); assert.equal('answer' in payload, false);
});

test('session memory can be explicitly cleared without retaining an active subject or draft', async () => {
  const { capabilities } = harness();
  const pending = await capabilities.prepare({ rawText: 'Hyundai Accent Blue 2013: el cilindro 2 no tiene chispa.' });
  await capabilities.clearMemory();
  assert.equal(capabilities.getActiveSubject(), null);
  assert.deepEqual(await capabilities.getSubjectMemory('hyundai-accent-blue-2013'), []);
  await assert.rejects(capabilities.confirm({ draftId: pending.draftId, confirmationToken: pending.confirmationToken, confirmed: true, confirmedRawText: pending.rawText, confirmedSubject: pending.subjectResolution.subject }), /invalid/);
});

test('human-confirmed subject overrides the model proposal before semantic processing', async () => {
  let semanticInput; const { capabilities } = harness({ buildSemantics: async (input) => { semanticInput = input; return buildSyntheticSemantics(input); } });
  const rawText = 'Hyundai Accent Blue 2013: el cilindro 2 no tiene chispa.'; const draft = await capabilities.prepare({ rawText }); const corrected = { id: 'corrected-device', type: 'device', label: 'Corrected Device' };
  const pending = await capabilities.confirm({ draftId: draft.draftId, confirmationToken: draft.confirmationToken, confirmed: true, confirmedRawText: rawText, confirmedSubject: corrected });
  const record = await capabilities.processRecord(pending.recordId);
  assert.deepEqual(semanticInput.confirmedSubject, corrected); assert.equal(record.subjectId, corrected.id); assert.equal(record.subjectConfirmation.corrected, true);
});

test('raw evidence remains saved when semantic processing fails', async () => {
  const { capabilities } = harness({ buildSemantics: async () => { throw new Error('provider unavailable'); } }); const rawText = 'Hyundai Accent Blue 2013: el cilindro 2 no tiene chispa.'; const draft = await capabilities.prepare({ rawText });
  const pending = await capabilities.confirm({ draftId: draft.draftId, confirmationToken: draft.confirmationToken, confirmed: true, confirmedRawText: rawText, confirmedSubject: draft.subjectResolution.subject });
  const record = await capabilities.processRecord(pending.recordId);
  assert.equal(record.semanticStatus, 'failed'); assert.equal(record.rawText, rawText); assert.equal((await capabilities.getSubjectMemory(record.subjectId)).length, 1);
});

test('background processing retries twice then succeeds without saving duplicate records', async () => {
  let calls = 0;
  const { capabilities } = harness({ buildSemantics: async (input) => { calls += 1; if (calls < 3) throw new Error('temporary'); return buildSyntheticSemantics(input); } });
  const draft = await capabilities.prepare({ rawText: 'Hyundai Accent Blue 2013: el cilindro 2 no tiene chispa.' });
  const pending = await capabilities.confirm({ draftId: draft.draftId, confirmationToken: draft.confirmationToken, confirmed: true, confirmedRawText: draft.rawText, confirmedSubject: draft.subjectResolution.subject });
  assert.equal(calls, 0);
  assert.equal(pending.semanticStatus, 'processing');
  const subjects = await capabilities.getSubjects();
  assert.deepEqual(subjects, [draft.subjectResolution.subject]);
  const attempts = [];
  const done = await capabilities.processRecord(pending.recordId, { onAttempt: ({ attempt }) => attempts.push(attempt) });
  assert.deepEqual(attempts, [1, 2, 3]); assert.equal(done.semanticStatus, 'ready');
  assert.equal((await capabilities.getSubjectMemory(pending.subjectId)).length, 1);
});

test('three failed attempts are final and absent from factual vocabulary', async () => {
  let calls = 0;
  const { capabilities } = harness({ buildSemantics: async () => { calls += 1; throw new Error('temporary'); } });
  const draft = await capabilities.prepare({ rawText: 'Hyundai Accent Blue 2013: el cilindro 2 no tiene chispa.' });
  const pending = await capabilities.confirm({ draftId: draft.draftId, confirmationToken: draft.confirmationToken, confirmed: true, confirmedRawText: draft.rawText, confirmedSubject: draft.subjectResolution.subject });
  const done = await capabilities.processRecord(pending.recordId, { maxAttempts: 99 });
  await capabilities.processRecord(pending.recordId);
  assert.equal(calls, 3); assert.equal(done.semanticStatus, 'failed');
  assert.deepEqual((await capabilities.getVocabulary({ subjectId: pending.subjectId })).items, []);
  assert.equal((await capabilities.getSubjectMemory(pending.subjectId))[0].semanticStatus, 'failed');
});

test('clearing a session during processing does not restore erased records', async () => {
  let release; let started;
  const entered = new Promise((resolve) => { started = resolve; });
  const { capabilities } = harness({ buildSemantics: async () => { started(); return new Promise((resolve) => { release = resolve; }); } });
  const draft = await capabilities.prepare({ rawText: 'Hyundai Accent Blue 2013: el cilindro 2 no tiene chispa.' });
  const pending = await capabilities.confirm({ draftId: draft.draftId, confirmationToken: draft.confirmationToken, confirmed: true, confirmedRawText: draft.rawText, confirmedSubject: draft.subjectResolution.subject });
  const task = capabilities.processRecord(pending.recordId);
  await entered; await capabilities.clearMemory(); release([]);
  assert.equal(await task, null);
  assert.deepEqual(await capabilities.getSubjects(), []);
  assert.deepEqual(await capabilities.getSubjectMemory(pending.subjectId), []);
});
