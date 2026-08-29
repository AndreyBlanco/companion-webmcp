import { createCompanionCapabilities } from '../core/companion.js';
import { InMemoryObservationStore } from '../adapters/demo/store.js';
import { registerWebMcp } from '../webmcp/register.js';

const capabilities = createCompanionCapabilities({ store: new InMemoryObservationStore() });
let draft = null;
const $ = (id) => document.getElementById(id);
const show = (value) => { $('output').textContent = JSON.stringify(value, null, 2); };

$('capture').addEventListener('submit', async (event) => {
  event.preventDefault();
  draft = await capabilities.structureCapture({
    subject: { id: $('subject-id').value, displayName: $('subject-name').value },
    capturedAt: new Date().toISOString(), source: 'text', rawText: $('raw-text').value
  });
  $('confirm').disabled = false;
  show(draft);
});

$('confirm').addEventListener('click', async () => {
  const record = await capabilities.createObservation({ draftId: draft.draftId, confirmationToken: draft.confirmationToken, confirmed: true });
  draft = null;
  $('confirm').disabled = true;
  show(record);
});

$('cancel').addEventListener('click', () => {
  draft = null;
  $('confirm').disabled = true;
  show({ cancelled: true, persisted: false });
});

$('search').addEventListener('submit', async (event) => {
  event.preventDefault();
  show(await capabilities.searchObservations({ subjectId: $('search-subject').value, question: $('question').value }));
});

registerWebMcp(document.modelContext, capabilities).then((status) => { $('webmcp-status').textContent = status.available ? `Available: ${status.toolName}` : status.reason; });
