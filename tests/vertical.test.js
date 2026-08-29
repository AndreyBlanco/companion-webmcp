import test from 'node:test';
import assert from 'node:assert/strict';
import { createCompanionCapabilities } from '../src/core/companion.js';
import { InMemoryObservationStore } from '../src/adapters/demo/store.js';
import { createSearchTool, registerWebMcp, SEARCH_TOOL_NAME } from '../src/webmcp/register.js';
import { createDemoServer } from '../src/app/server.js';

let sequence = 0;
const setup = () => {
  const store = new InMemoryObservationStore();
  const capabilities = createCompanionCapabilities({ store, clock: () => new Date('2026-08-29T15:00:00.000Z'), idFactory: () => `synthetic-${++sequence}` });
  return { store, capabilities };
};
const capture = (subjectId, rawText) => ({ subject: { id: subjectId, displayName: `Synthetic ${subjectId}` }, capturedAt: '2026-08-29T14:00:00.000Z', source: 'text', rawText });

test('HG-01 preserves source meaning and leaves absent fields unknown', async () => {
  const { capabilities } = setup();
  const rawText = 'Observation: Juniper assembled three wooden shapes.\nResponse: Asked to try a harder pattern.';
  const draft = await capabilities.structureCapture(capture('subject-juniper', rawText));
  assert.equal(draft.rawText, rawText);
  assert.equal(draft.observation, 'Juniper assembled three wooden shapes.');
  assert.equal(draft.strategy, null);
  assert.equal(draft.followUp, null);
  assert.deepEqual(draft.uncertainties, ['strategy was not explicitly provided', 'followUp was not explicitly provided']);
});

test('camelCase followUp label is preserved instead of marked unknown', async () => {
  const { capabilities } = setup();
  const draft = await capabilities.structureCapture(capture('subject-maple', 'Observation: Maple sorted four synthetic tiles.\nfollowUp: Offer a fifth synthetic tile.'));
  assert.equal(draft.followUp, 'Offer a fifth synthetic tile.');
  assert.doesNotMatch(draft.uncertainties.join(' '), /followUp/);
});

test('confirmation is mandatory, invalid attempts never persist, and token is single-use', async () => {
  const { store, capabilities } = setup();
  const draft = await capabilities.structureCapture(capture('subject-orchid', 'Observation: Orchid completed the blue maze.'));
  await assert.rejects(capabilities.createObservation({ draftId: draft.draftId, confirmationToken: draft.confirmationToken, confirmed: false }), /confirmation/i);
  assert.equal(await store.count(), 0);
  const record = await capabilities.createObservation({ draftId: draft.draftId, confirmationToken: draft.confirmationToken, confirmed: true });
  assert.equal(await store.count(), 1);
  await assert.rejects(capabilities.createObservation({ draftId: draft.draftId, confirmationToken: draft.confirmationToken, confirmed: true }), /invalid/i);
  assert.equal(record.subject.id, 'subject-orchid');
});

test('retrieval filters by subject and returns verifiable record IDs', async () => {
  const { capabilities } = setup();
  const orchid = await capabilities.structureCapture(capture('subject-orchid', 'Observation: Orchid completed the blue maze.\nStrategy: Worked backward from the exit.'));
  const cedar = await capabilities.structureCapture(capture('subject-cedar', 'Observation: Cedar completed the red maze.\nStrategy: Followed the left wall.'));
  const orchidRecord = await capabilities.createObservation({ draftId: orchid.draftId, confirmationToken: orchid.confirmationToken, confirmed: true });
  await capabilities.createObservation({ draftId: cedar.draftId, confirmationToken: cedar.confirmationToken, confirmed: true });
  const answer = await capabilities.searchObservations({ subjectId: 'subject-orchid', question: 'What maze strategy was used?' });
  assert.deepEqual(answer.evidenceRecordIds, [orchidRecord.id]);
  assert.match(answer.answer, /blue maze/);
  assert.match(answer.answer, /Strategy: Worked backward from the exit\./);
  assert.doesNotMatch(answer.answer, /red maze/);
});

test('HG-03 WebMCP tool is discoverable and delegates to the same capability', async () => {
  const calls = [];
  const capabilities = { searchObservations: async (input) => { calls.push(input); return { answer: 'shared result', evidenceRecordIds: ['record-1'], insufficientEvidence: false }; } };
  const tool = createSearchTool(capabilities);
  assert.equal(tool.name, SEARCH_TOOL_NAME);
  assert.equal(tool.annotations.readOnlyHint, true);
  assert.deepEqual(await tool.execute({ subjectId: 'subject-orchid', question: 'maze?' }), { answer: 'shared result', evidenceRecordIds: ['record-1'], insufficientEvidence: false });
  assert.deepEqual(calls, [{ subjectId: 'subject-orchid', question: 'maze?' }]);
  let registered;
  assert.deepEqual(await registerWebMcp({ registerTool: async (candidate) => { registered = candidate; } }, capabilities), { available: true, toolName: SEARCH_TOOL_NAME });
  assert.equal(registered.name, SEARCH_TOOL_NAME);
  assert.equal(registered.execute, capabilities.searchObservations);
});

test('application degrades normally when WebMCP is unavailable', async () => {
  const { capabilities } = setup();
  const status = await registerWebMcp(undefined, capabilities);
  assert.equal(status.available, false);
  const draft = await capabilities.structureCapture(capture('subject-orchid', 'A plain unlabelled synthetic note.'));
  assert.equal(draft.observation, 'A plain unlabelled synthetic note.');
});

test('demo server returns 404 without crashing and remains available', async (t) => {
  const server = createDemoServer();
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  t.after(() => server.close());
  const { port } = server.address();
  const missing = await fetch(`http://127.0.0.1:${port}/favicon.ico`);
  assert.equal(missing.status, 404);
  const page = await fetch(`http://127.0.0.1:${port}/`);
  assert.equal(page.status, 200);
  const html = await page.text();
  assert.match(html, /Companion WebMCP/);
  const modulePath = html.match(/<script type="module" src="([^"]+)"/)[1];
  const clientModule = await fetch(`http://127.0.0.1:${port}${modulePath}`);
  assert.equal(clientModule.status, 200);
  assert.match(clientModule.headers.get('content-type'), /text\/javascript/);
});
