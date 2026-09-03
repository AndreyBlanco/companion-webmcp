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

test('public interface uses English throughout the entry lifecycle', async () => {
  const html = await readFile(new URL('../src/app/index.html', import.meta.url), 'utf8');
  const client = await readFile(new URL('../src/app/client.js', import.meta.url), 'utf8');
  assert.match(html, /<html lang="en">/);
  for (const text of ['Detect subject', 'Review and confirm', 'Confirm subject, save and process', 'Add another entry', 'Clear session memory']) {
    assert.ok(html.includes(text), `Missing English label: ${text}`);
  }
  for (const text of ['Detected:', 'Existing:', 'Create or edit manually', 'Identifying the subject', 'processing, attempt', 'failed after', 'Draft discarded.', 'Session memory cleared.']) {
    assert.ok(client.includes(text), `Missing English status: ${text}`);
  }
  assert.doesNotMatch(html + client, /[áéíóúñ¿¡]/i);
});

test('production rendering has no technical memory inspector or JSON output sink', async () => {
  const [html, client] = await Promise.all([
    readFile(new URL('../src/app/index.html', import.meta.url), 'utf8'),
    readFile(new URL('../src/app/client.js', import.meta.url), 'utf8')
  ]);
  assert.doesNotMatch(html, /WebMCP and technical evidence|Inspect payload|<pre\b|id="(?:output|search|question|subject-id|webmcp-status)"/);
  assert.doesNotMatch(client, /JSON\.stringify|semanticGraph|semanticAudit|capabilities\.queryMemory|\$\('(?:output|search|question|subject-id|webmcp-status)'\)/);
  assert.match(client, /registerWebMcp\(document\.modelContext, capabilities\)/);
});
