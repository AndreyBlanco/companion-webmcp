import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('public demo starts neutral and exposes an accessible processing state', async () => {
  const [html, client] = await Promise.all([
    readFile(new URL('../src/app/index.html', import.meta.url), 'utf8'),
    readFile(new URL('../src/app/client.js', import.meta.url), 'utf8')
  ]);
  assert.doesNotMatch(html, /Hyundai|cilindro 2|value="hyundai/i);
  assert.doesNotMatch(client, /SYNTHETIC_DEMO_ENTRIES|adapters\/demo/);
  assert.match(html, /id="processing-indicator"[^>]*role="status"[^>]*aria-live="assertive"[^>]*hidden/);
  assert.match(html, /@keyframes spin/);
  assert.match(client, /document\.body\.toggleAttribute\('aria-busy', value\)/);
  assert.match(client, /capabilities\.clearMemory\(\)/);
  assert.match(html, /id="entry"[^>]*maxlength="1000"/);
  assert.match(html, /id="subject-label"[^>]*required/);
  assert.match(html, /id="confirmed-subject-id"[^>]*required/);
  assert.match(client, /capabilities\.prepare\(/);
  assert.match(client, /confirmedSubject/);
  assert.match(html, /id="subject-choice"/);
  assert.match(client, /capabilities\.getSubjects\(\)/);
  assert.match(client, /capabilities\.processRecord\(/);
  assert.match(html, /id="background-job-list"/);
});
