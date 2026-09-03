import { createDemoId, createSemanticMemory, InMemorySemanticStore } from '../core/semantic-memory.js';
import { createRemoteSemanticBuilder, createRemoteSubjectDetector } from '../adapters/remote/semantic.js';
import { registerWebMcp } from '../webmcp/register.js';
const MAX_RAW_TEXT_CHARS = 1000;
const $ = (id) => document.getElementById(id);
const remote = { getAccessCode: () => $('access-code').value };
const capabilities = createSemanticMemory({ store: new InMemorySemanticStore(), detectSubject: createRemoteSubjectDetector(remote), buildSemantics: createRemoteSemanticBuilder(remote), idFactory: createDemoId });
let draft = null; let savedCount = 0; let busy = false; let elapsedTimer = null; let startedAt = 0;
let subjectChoices = [];
const status = (message, kind = '') => { $('operation-status').textContent = message; $('operation-status').dataset.kind = kind; };
function setBusy(value, message = 'Processing with AI…') { busy = value; document.body.toggleAttribute('aria-busy', value); $('processing-indicator').hidden = !value; for (const control of document.querySelectorAll('[data-busy-lock]')) control.disabled = value; clearInterval(elapsedTimer); if (value) { startedAt = performance.now(); const update = () => { $('processing-message').textContent = `${message} ${Math.floor((performance.now() - startedAt) / 1000)} s`; }; update(); elapsedTimer = setInterval(update, 1000); } }
function step(name) { for (const candidate of ['talk', 'review', 'save']) { $(`step-${candidate}`).toggleAttribute('aria-current', candidate === name); $(`${candidate}-panel`).hidden = candidate !== name; } }
function updateCount() { $('character-count').textContent = `${$('entry').value.length}/${MAX_RAW_TEXT_CHARS}`; }
function resetCapture() { draft = null; subjectChoices = []; $('entry').value = ''; $('raw-text').value = ''; $('resolution').textContent = ''; $('subject-choice').replaceChildren(); applySubject(null); updateCount(); }
function applySubject(subject) { $('subject-label').value = subject?.label ?? ''; $('subject-type').value = subject?.type ?? ''; $('confirmed-subject-id').value = subject?.id ?? ''; }
async function populateSubjectChoices(proposal) {
  subjectChoices = await capabilities.getSubjects(); const select = $('subject-choice'); select.replaceChildren();
  if (proposal) { const option = new Option(`Detected: ${proposal.label}`, '__proposal__', true, true); select.add(option); }
  for (const subject of subjectChoices) select.add(new Option(`Existing: ${subject.label} (${subject.type})`, subject.id));
  select.add(new Option('Create or edit manually', '__manual__', !proposal, !proposal)); applySubject(proposal);
}
function runGraphInBackground(record) {
  const item = document.createElement('li'); item.className = 'job-processing'; item.textContent = `${record.subjectId}: pending`; $('background-jobs').hidden = false; $('background-job-list').prepend(item);
  capabilities.processRecord(record.recordId, { maxAttempts: 3, onAttempt: ({ attempt, maxAttempts }) => { item.textContent = `${record.subjectId}: processing, attempt ${attempt}/${maxAttempts}`; } }).then((result) => {
    if (!result) return; item.classList.remove('job-processing'); item.textContent = result.semanticStatus === 'ready' ? `${record.subjectId}: graph ready after ${result.semanticAttempts} attempt(s)` : `${record.subjectId}: failed after ${result.semanticAttempts} attempts`;
    status(result.semanticStatus === 'ready' ? `Graph for ${result.subjectId} is ready.` : `Evidence for ${result.subjectId} is still saved; graph processing failed after 3 attempts.`, result.semanticStatus === 'ready' ? 'success' : 'error');
  }).catch(() => { item.classList.remove('job-processing'); item.textContent = `${record.subjectId}: could not retrieve status`; status('Could not update graph status.', 'error'); });
}

async function prepare(rawText) {
  if (busy) return; setBusy(true, 'Identifying the subject…'); status('Preparing subject confirmation…', 'working');
  try { draft = await capabilities.prepare({ rawText }); $('raw-text').value = rawText; await populateSubjectChoices(draft.subjectResolution.subject); $('resolution').textContent = `${draft.subjectResolution.status}: ${draft.subjectResolution.reason}`; step('review'); status('Choose an existing subject or approve/edit the proposal before saving.', 'success'); }
  catch (error) { status(error.message, 'error'); } finally { setBusy(false); }
}

$('entry').addEventListener('input', updateCount); updateCount();
$('subject-choice').addEventListener('change', () => { const value = $('subject-choice').value; if (value === '__proposal__') applySubject(draft?.subjectResolution.subject); else if (value === '__manual__') applySubject(null); else applySubject(subjectChoices.find((subject) => subject.id === value)); });
$('text-entry').addEventListener('submit', async (event) => { event.preventDefault(); if (!$('access-code').value) return status('Enter the demo access code.', 'error'); await prepare($('entry').value); });
$('review-panel').addEventListener('submit', async (event) => {
  event.preventDefault(); if (busy) return; const confirmedSubject = { id: $('confirmed-subject-id').value.trim(), type: $('subject-type').value.trim(), label: $('subject-label').value.trim() };
  if (!confirmedSubject.id || !confirmedSubject.type || !confirmedSubject.label) return status('Enter the subject name, type and identifier.', 'error');
  setBusy(true, 'Saving text and subject…'); status('Confirming human evidence…', 'working');
  try { const record = await capabilities.confirm({ draftId: draft.draftId, confirmationToken: draft.confirmationToken, confirmed: true, confirmedRawText: $('raw-text').value, confirmedSubject }); savedCount += 1; $('memory-count').textContent = String(savedCount); resetCapture(); step('save'); status('Entry saved. Graph processing will continue in the background for up to 3 attempts.', 'working'); runGraphInBackground(record); }
  catch (error) { status(error.message, 'error'); } finally { setBusy(false); }
});
$('cancel').addEventListener('click', () => { resetCapture(); step('talk'); status('Draft discarded. No information was saved.'); });
$('new-observation').addEventListener('click', () => { $('entry').value = ''; updateCount(); step('talk'); status('Ready for another entry.'); });
$('clear-memory').addEventListener('click', async () => { await capabilities.clearMemory(); resetCapture(); savedCount = 0; $('memory-count').textContent = '0'; $('background-job-list').replaceChildren(); $('background-jobs').hidden = true; step('talk'); status('Session memory cleared. The demo is empty.', 'success'); });
registerWebMcp(navigator.modelContext, capabilities);
