import test from 'node:test';
import assert from 'node:assert/strict';
import { createSemanticMemory, InMemorySemanticStore, validateSemanticDelta } from '../src/core/semantic-memory.js';
import { createMemoryTool, registerWebMcp, MEMORY_TOOL_NAME } from '../src/webmcp/register.js';
import { extractSyntheticDemo, selectSyntheticEvidence } from '../src/adapters/demo/semantic.js';

function harness(overrides = {}) {
  let sequence = 0;
  const store = new InMemorySemanticStore();
  const capabilities = createSemanticMemory({ store, extract: extractSyntheticDemo, selectEvidence: selectSyntheticEvidence, idFactory: () => `synthetic-${++sequence}`, clock: () => new Date('2026-08-30T18:00:00.000Z'), ...overrides });
  return { store, capabilities };
}

async function save(capabilities, rawText) {
  const draft = await capabilities.interpret({ rawText });
  const record = await capabilities.confirm({ draftId: draft.draftId, confirmationToken: draft.confirmationToken, confirmed: true });
  return { draft, record };
}

test('raw fidelity, confirmation boundary, provenance and source linkage are preserved', async () => {
  const { capabilities } = harness(); const rawText = 'Hyundai Accent Blue 2013: el cilindro 2 no tiene chispa.';
  const draft = await capabilities.interpret({ rawText });
  await assert.rejects(capabilities.confirm({ draftId: draft.draftId, confirmationToken: draft.confirmationToken, confirmed: false }), /Explicit confirmation/);
  assert.deepEqual(await capabilities.getSubjectMemory('hyundai-accent-blue-2013'), []);
  const record = await capabilities.confirm({ draftId: draft.draftId, confirmationToken: draft.confirmationToken, confirmed: true });
  assert.equal(record.rawText, rawText); assert.equal(record.semanticItems[0].provenance, 'observed'); assert.equal(record.semanticItems[0].sourceRecordId, record.recordId);
});

test('ambiguous subject resolution cannot persist silently', async () => {
  const { capabilities } = harness(); const draft = await capabilities.interpret({ rawText: 'Ahora revisé otro vehículo.' });
  assert.equal(draft.subjectResolution.status, 'ambiguous');
  await assert.rejects(capabilities.confirm({ draftId: draft.draftId, confirmationToken: draft.confirmationToken, confirmed: true }), /Ambiguous/);
});

test('active subject continuity creates progressive memory and retains speaker inference', async () => {
  const { capabilities } = harness(); await save(capabilities, 'Hyundai Accent Blue 2013: el cilindro 2 no tiene chispa.');
  await save(capabilities, 'La batería mide 12.4 voltios con el motor apagado.');
  const { record } = await save(capabilities, 'Creo que la causa parece ser la bobina de encendido.');
  assert.equal(record.subjectResolution.status, 'probable'); assert.equal(record.semanticItems[0].provenance, 'speaker_inference');
  assert.equal((await capabilities.getSubjectMemory('hyundai-accent-blue-2013')).length, 3);
});

test('retrieval isolates subject before selecting positive evidence', async () => {
  const { capabilities } = harness(); const { record } = await save(capabilities, 'Hyundai Accent Blue 2013: el cilindro 2 no tiene chispa.');
  const positive = await capabilities.queryMemory({ subjectId: 'hyundai-accent-blue-2013', question: '¿Qué evidencia apunta específicamente al cilindro 2?' });
  assert.deepEqual(positive.retrievalMetadata.recordsReturned, [record.recordId]);
  assert.deepEqual((await capabilities.queryMemory({ subjectId: 'other-subject', question: 'cilindro 2' })).retrievalMetadata.recordsConsidered, []);
});

test('negative retrieval leaves sufficiency to the external agent without fabrication', async () => {
  const { capabilities } = harness(); await save(capabilities, 'Hyundai Accent Blue 2013: el cilindro 2 no tiene chispa.');
  const payload = await capabilities.queryMemory({ subjectId: 'hyundai-accent-blue-2013', question: '¿Qué resultado tuvo la prueba de compresión de los cilindros?' });
  assert.equal(payload.retrievalMetadata.subjectMemoryEmpty, true); assert.equal(payload.retrievalMetadata.sufficiencyAssessment, 'external_agent'); assert.deepEqual(payload.records, []); assert.equal('answer' in payload, false);
});

test('WebMCP registers the same internal capability and never adds an answer', async () => {
  const { capabilities } = harness(); let registered;
  const status = await registerWebMcp({ registerTool: async (tool) => { registered = tool; } }, capabilities);
  assert.equal(status.toolName, MEMORY_TOOL_NAME); assert.equal(registered.execute, capabilities.queryMemory);
  const payload = await createMemoryTool(capabilities).execute({ subjectId: 'missing', question: 'anything' }); assert.equal('answer' in payload, false);
});

test('semantic validation rejects unsupported provenance', () => {
  assert.throws(() => validateSemanticDelta({ subjectResolution: { status: 'resolved', subject: { id: 'x', type: 'thing', label: 'X' }, reason: 'explicit' }, items: [{ id: 'x', kind: 'claim', subject: 'x', predicate: 'p', value: true, provenance: 'fact', evidence: ['x'] }] }), /provenance/);
});

test('semantic validation rejects non-literal evidence and subject mismatch', async () => {
  const base = { subjectResolution: { status: 'resolved', subject: { id: 'subject-a', type: 'thing', label: 'A' }, reason: 'explicit' }, items: [{ id: 'x', kind: 'claim', subject: 'subject-a', predicate: 'p', value: true, provenance: 'reported', evidence: ['literal'] }] };
  assert.throws(() => validateSemanticDelta({ ...base, items: [{ ...base.items[0], subject: 'subject-b' }] }), /match the resolved subject/);
  const { capabilities } = harness({ extract: async () => base });
  await assert.rejects(capabilities.interpret({ rawText: 'different source' }), /exact excerpt/);
});

test('multiple confirmed entries remain available to deterministic external-agent retrieval', async () => {
  const { capabilities } = harness({ selectEvidence: async ({ records }) => ({ recordIds: records.map((record) => record.recordId) }) });
  await save(capabilities, 'Hyundai Accent Blue 2013: el cilindro 2 no tiene chispa.');
  await save(capabilities, 'La batería mide 12.4 voltios con el motor apagado.');
  const payload = await capabilities.queryMemory({ subjectId: 'hyundai-accent-blue-2013', question: '¿Qué sabemos?' });
  assert.equal(payload.records.length, 2); assert.equal(payload.retrievalMetadata.subjectMemoryEmpty, false); assert.equal(payload.retrievalMetadata.sufficiencyAssessment, 'external_agent'); assert.equal('answer' in payload, false);
});
