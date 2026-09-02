import { createDemoId, createSemanticMemory, InMemorySemanticStore } from '../core/semantic-memory.js';
import { createRemoteSemanticBuilder, createRemoteSubjectDetector, selectAllConfirmedEvidence } from '../adapters/remote/semantic.js';
import { registerWebMcp } from '../webmcp/register.js';
const MAX_RAW_TEXT_CHARS = 1000;
const $ = (id) => document.getElementById(id);
const remote = { getAccessCode: () => $('access-code').value };
const capabilities = createSemanticMemory({ store: new InMemorySemanticStore(), detectSubject: createRemoteSubjectDetector(remote), buildSemantics: createRemoteSemanticBuilder(remote), selectEvidence: selectAllConfirmedEvidence, idFactory: createDemoId });
let draft = null; let savedCount = 0; let busy = false; let elapsedTimer = null; let startedAt = 0;
let subjectChoices = [];
const show = (value) => { $('output').textContent = JSON.stringify(value, null, 2); };
const status = (message, kind = '') => { $('operation-status').textContent = message; $('operation-status').dataset.kind = kind; };
function setBusy(value, message = 'Procesando con IA…') { busy = value; document.body.toggleAttribute('aria-busy', value); $('processing-indicator').hidden = !value; for (const control of document.querySelectorAll('[data-busy-lock]')) control.disabled = value; clearInterval(elapsedTimer); if (value) { startedAt = performance.now(); const update = () => { $('processing-message').textContent = `${message} ${Math.floor((performance.now() - startedAt) / 1000)} s`; }; update(); elapsedTimer = setInterval(update, 1000); } }
function step(name) { for (const candidate of ['talk', 'review', 'save']) { $(`step-${candidate}`).toggleAttribute('aria-current', candidate === name); $(`${candidate}-panel`).hidden = candidate !== name; } }
function updateCount() { $('character-count').textContent = `${$('entry').value.length}/${MAX_RAW_TEXT_CHARS}`; }
function applySubject(subject) { $('subject-label').value = subject?.label ?? ''; $('subject-type').value = subject?.type ?? ''; $('confirmed-subject-id').value = subject?.id ?? ''; }
async function populateSubjectChoices(proposal) {
  subjectChoices = await capabilities.getSubjects(); const select = $('subject-choice'); select.replaceChildren();
  if (proposal) { const option = new Option(`Detectado: ${proposal.label}`, '__proposal__', true, true); select.add(option); }
  for (const subject of subjectChoices) select.add(new Option(`Registrado: ${subject.label} (${subject.type})`, subject.id));
  select.add(new Option('Crear o corregir manualmente', '__manual__', !proposal, !proposal)); applySubject(proposal);
}
function runGraphInBackground(record) {
  const item = document.createElement('li'); item.className = 'job-processing'; item.textContent = `${record.subjectId}: pendiente`; $('background-jobs').hidden = false; $('background-job-list').prepend(item);
  capabilities.processRecord(record.recordId, { maxAttempts: 3, onAttempt: ({ attempt, maxAttempts }) => { item.textContent = `${record.subjectId}: procesando, intento ${attempt}/${maxAttempts}`; } }).then((result) => {
    if (!result) return; item.classList.remove('job-processing'); item.textContent = result.semanticStatus === 'ready' ? `${record.subjectId}: grafo listo en ${result.semanticAttempts} intento(s)` : `${record.subjectId}: failed después de ${result.semanticAttempts} intentos`;
    if ($('subject-id').value === result.subjectId) show(result);
    status(result.semanticStatus === 'ready' ? `Grafo de ${result.subjectId} listo.` : `La evidencia de ${result.subjectId} sigue guardada; el grafo falló tras 3 intentos.`, result.semanticStatus === 'ready' ? 'success' : 'error');
  }).catch(() => { item.classList.remove('job-processing'); item.textContent = `${record.subjectId}: no se pudo consultar el estado`; status('No se pudo actualizar el estado del grafo.', 'error'); });
}

async function prepare(rawText) {
  if (busy) return; setBusy(true, 'Identificando el sujeto…'); status('Preparando la confirmación del sujeto…', 'working');
  try { draft = await capabilities.prepare({ rawText }); $('raw-text').value = rawText; await populateSubjectChoices(draft.subjectResolution.subject); $('resolution').textContent = `${draft.subjectResolution.status}: ${draft.subjectResolution.reason}`; show(draft); step('review'); status('Elige un sujeto registrado o aprueba/corrige la propuesta antes de guardar.', 'success'); }
  catch (error) { status(error.message, 'error'); } finally { setBusy(false); }
}

$('entry').addEventListener('input', updateCount); updateCount();
$('subject-choice').addEventListener('change', () => { const value = $('subject-choice').value; if (value === '__proposal__') applySubject(draft?.subjectResolution.subject); else if (value === '__manual__') applySubject(null); else applySubject(subjectChoices.find((subject) => subject.id === value)); });
$('text-entry').addEventListener('submit', async (event) => { event.preventDefault(); if (!$('access-code').value) return status('Introduce el código de acceso de la demo.', 'error'); await prepare($('entry').value); });
$('review-panel').addEventListener('submit', async (event) => {
  event.preventDefault(); if (busy) return; const confirmedSubject = { id: $('confirmed-subject-id').value.trim(), type: $('subject-type').value.trim(), label: $('subject-label').value.trim() };
  if (!confirmedSubject.id || !confirmedSubject.type || !confirmedSubject.label) return status('Completa el nombre, tipo e identificador del sujeto.', 'error');
  setBusy(true, 'Guardando texto y sujeto…'); status('Confirmando la evidencia humana…', 'working');
  try { const record = await capabilities.confirm({ draftId: draft.draftId, confirmationToken: draft.confirmationToken, confirmed: true, confirmedRawText: $('raw-text').value, confirmedSubject }); savedCount += 1; $('memory-count').textContent = String(savedCount); $('subject-id').value = record.subjectId; show(record); step('save'); status('Entrada guardada. El grafo continuará en segundo plano hasta 3 intentos.', 'working'); runGraphInBackground(record); }
  catch (error) { status(error.message, 'error'); } finally { setBusy(false); }
});
$('cancel').addEventListener('click', () => { draft = null; step('talk'); status('Borrador descartado. No se guardó información.'); });
$('new-observation').addEventListener('click', () => { $('entry').value = ''; updateCount(); step('talk'); status('Lista para otra entrada.'); });
$('clear-memory').addEventListener('click', async () => { await capabilities.clearMemory(); draft = null; savedCount = 0; subjectChoices = []; $('memory-count').textContent = '0'; $('entry').value = ''; $('raw-text').value = ''; $('subject-id').value = ''; $('question').value = ''; $('background-job-list').replaceChildren(); $('background-jobs').hidden = true; updateCount(); show({ records: [], message: 'La memoria de esta sesión está vacía.' }); step('talk'); status('Memoria de sesión eliminada. La demo está vacía.', 'success'); });
$('search').addEventListener('submit', async (event) => { event.preventDefault(); try { show(await capabilities.queryMemory({ question: $('question').value, subjectId: $('subject-id').value })); } catch (error) { status(error.message, 'error'); } });
registerWebMcp(document.modelContext, capabilities).then((result) => { $('webmcp-status').textContent = result.available ? `WebMCP disponible: ${result.toolName}` : 'WebMCP no disponible en este navegador; la captura continúa.'; });
