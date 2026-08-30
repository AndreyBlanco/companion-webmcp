import test from 'node:test';
import assert from 'node:assert/strict';
import { createCompanionCapabilities, createDemoId } from '../src/core/companion.js';
import { InMemoryObservationStore } from '../src/adapters/demo/store.js';
import { createSearchTool, registerWebMcp, SEARCH_TOOL_NAME } from '../src/webmcp/register.js';
import { createDemoServer } from '../src/app/server.js';
import { createOpenAITranscriber } from '../src/providers/openai-transcription.js';
import { readFile } from 'node:fs/promises';

let sequence = 0;
const setup = () => {
  const store = new InMemoryObservationStore();
  const capabilities = createCompanionCapabilities({ store, clock: () => new Date('2026-08-29T15:00:00.000Z'), idFactory: () => `synthetic-${++sequence}` });
  return { store, capabilities };
};
const capture = (subjectId, rawText) => ({ subject: { id: subjectId, displayName: `Synthetic ${subjectId}` }, capturedAt: '2026-08-29T14:00:00.000Z', source: 'text', rawText });

test('mobile compatibility generates UUIDs when crypto.randomUUID is unavailable', () => {
  const cryptoApi = { getRandomValues: (bytes) => { bytes.forEach((_, index) => { bytes[index] = index; }); return bytes; } };
  assert.match(createDemoId(cryptoApi), /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
});

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

test('single-paragraph audio transcript labels structure without invented fields', async () => {
  const { capabilities } = setup();
  const rawText = 'Observation: Maple sorted four synthetic tiles. Strategy: Maple grouped them by shape. Response: Maple requested another tile. Follow up: Offer one synthetic hexagon.';
  const draft = await capabilities.structureCapture({ ...capture('subject-maple', rawText), source: 'voice' });
  assert.equal(draft.observation, 'Maple sorted four synthetic tiles.');
  assert.equal(draft.strategy, 'Maple grouped them by shape.');
  assert.equal(draft.response, 'Maple requested another tile.');
  assert.equal(draft.followUp, 'Offer one synthetic hexagon.');
  assert.deepEqual(draft.uncertainties, []);
});

test('Spanish audio transcript labels map to the same generic contract', async () => {
  const { capabilities } = setup();
  const rawText = 'Observación: Orquídea completó el laberinto azul. Estrategia: Comenzó por la salida. Respuesta: Sonrió al terminar. Seguimiento: Ofrecer otro laberinto sintético.';
  const draft = await capabilities.structureCapture({ ...capture('subject-orchid-es', rawText), source: 'voice' });
  assert.equal(draft.observation, 'Orquídea completó el laberinto azul.');
  assert.equal(draft.strategy, 'Comenzó por la salida.');
  assert.equal(draft.response, 'Sonrió al terminar.');
  assert.equal(draft.followUp, 'Ofrecer otro laberinto sintético.');
  assert.deepEqual(draft.uncertainties, []);
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

test('UX hard gate exposes one guided flow and hides technical output by default', async () => {
  const html = await readFile(new URL('../src/app/index.html', import.meta.url), 'utf8');
  const client = await readFile(new URL('../src/app/client.js', import.meta.url), 'utf8');
  assert.match(html, /1\. Hablar/);
  assert.match(html, /2\. Revisar/);
  assert.match(html, /3\. Guardar/);
  assert.match(html, />● Iniciar grabación</);
  assert.match(html, />■ Detener grabación</);
  assert.match(client, /Grabando…/);
  assert.match(client, /Transcribiendo…/);
  assert.match(html, /Revisa la transcripción/);
  assert.match(html, />Guardar observación</);
  assert.match(html, /Observación guardada/);
  assert.match(html, /<details><summary>Detalles técnicos<\/summary>/);
  assert.match(html, /<pre id="output"/);
});

test('audio provider sends one multipart file to gpt-transcribe', async () => {
  let request;
  const transcribe = createOpenAITranscriber({
    apiKey: 'sk-test',
    fetchImpl: async (url, options) => {
      request = { url, options };
      return new Response(JSON.stringify({ text: 'Observation: Synthetic audio.', usage: { type: 'duration', seconds: 1 } }), { status: 200, headers: { 'content-type': 'application/json' } });
    }
  });
  const result = await transcribe({ bytes: new Uint8Array([1, 2, 3]), contentType: 'audio/webm', filename: 'synthetic.webm' });
  assert.equal(result.text, 'Observation: Synthetic audio.');
  assert.equal(request.url, 'https://api.openai.com/v1/audio/transcriptions');
  assert.equal(request.options.method, 'POST');
  assert.equal(request.options.body.get('model'), 'gpt-transcribe');
  assert.equal(request.options.body.get('file').name, 'synthetic.webm');
  assert.match(request.options.headers.authorization, /^Bearer sk-/);
});

test('audio endpoint validates content and returns injected transcript', async (t) => {
  const calls = [];
  const server = createDemoServer({ transcribe: async (input) => { calls.push(input); return { text: 'Observation: Synthetic spoken note.', usage: null }; } });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  t.after(() => server.close());
  const { port } = server.address();
  const response = await fetch(`http://127.0.0.1:${port}/api/transcribe`, {
    method: 'POST', headers: { 'content-type': 'audio/webm', 'x-audio-filename': 'synthetic.webm' }, body: new Uint8Array([1, 2, 3])
  });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { text: 'Observation: Synthetic spoken note.', usage: null });
  assert.equal(calls[0].contentType, 'audio/webm');
  assert.equal(calls[0].filename, 'synthetic.webm');
  const rejected = await fetch(`http://127.0.0.1:${port}/api/transcribe`, { method: 'POST', headers: { 'content-type': 'text/plain' }, body: 'not audio' });
  assert.equal(rejected.status, 400);
});
