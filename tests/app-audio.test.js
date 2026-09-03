import test from 'node:test';
import assert from 'node:assert/strict';
import { createDemoServer } from '../src/app/server.js';
import { createOpenAITranscriber } from '../src/providers/openai-transcription.js';

test('demo server loads Companion and remains available after 404', async (t) => {
  const server = createDemoServer();
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  t.after(() => server.close()); const { port } = server.address();
  assert.equal((await fetch(`http://127.0.0.1:${port}/favicon.ico`)).status, 404);
  const page = await fetch(`http://127.0.0.1:${port}/`); assert.equal(page.status, 200); assert.match(await page.text(), /human memory for agents/);
});

test('local semantic endpoint enforces the demo code and returns injected structured output', async (t) => {
  const calls = []; const resolution = { status: 'ambiguous', subject: null, reason: 'Synthetic ambiguity.' };
  const server = createDemoServer({ demoAccessCode: 'judge-code', detectSubject: async (input) => { calls.push(input); return resolution; }, buildSemantics: async () => [] });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  t.after(() => server.close()); const { port } = server.address();
  const denied = await fetch(`http://127.0.0.1:${port}/api/semantic-extract`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-companion-demo-code': 'wrong' }, body: JSON.stringify({ operation: 'detect_subject', rawText: 'Synthetic input.' }) });
  assert.equal(denied.status, 401); assert.equal(calls.length, 0);
  const accepted = await fetch(`http://127.0.0.1:${port}/api/semantic-extract`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-companion-demo-code': 'judge-code' }, body: JSON.stringify({ operation: 'detect_subject', rawText: 'Synthetic input.' }) });
  assert.equal(accepted.status, 200); assert.deepEqual(await accepted.json(), resolution); assert.equal(calls[0].rawText, 'Synthetic input.');
});

test('audio provider sends one multipart file to gpt-transcribe', async () => {
  let request;
  const transcribe = createOpenAITranscriber({ apiKey: 'sk-test', fetchImpl: async (url, options) => { request = { url, options }; return new Response(JSON.stringify({ text: 'Synthetic audio.' }), { status: 200, headers: { 'content-type': 'application/json' } }); } });
  assert.equal((await transcribe({ bytes: new Uint8Array([1, 2, 3]), contentType: 'audio/webm', filename: 'synthetic.webm' })).text, 'Synthetic audio.');
  assert.equal(request.url, 'https://api.openai.com/v1/audio/transcriptions'); assert.equal(request.options.body.get('model'), 'gpt-transcribe'); assert.equal(request.options.body.get('file').name, 'synthetic.webm');
});

test('audio endpoint validates content and returns injected transcript', async (t) => {
  const calls = []; const server = createDemoServer({ transcribe: async (input) => { calls.push(input); return { text: 'Synthetic spoken note.', usage: null }; } });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  t.after(() => server.close()); const { port } = server.address();
  const response = await fetch(`http://127.0.0.1:${port}/api/transcribe`, { method: 'POST', headers: { 'content-type': 'audio/webm', 'x-audio-filename': 'synthetic.webm' }, body: new Uint8Array([1, 2, 3]) });
  assert.equal(response.status, 200); assert.deepEqual(await response.json(), { text: 'Synthetic spoken note.', usage: null }); assert.equal(calls[0].filename, 'synthetic.webm');
  assert.equal((await fetch(`http://127.0.0.1:${port}/api/transcribe`, { method: 'POST', headers: { 'content-type': 'text/plain' }, body: 'not audio' })).status, 400);
});
