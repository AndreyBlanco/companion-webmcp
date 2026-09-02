import { createDemoId, createSemanticMemory, InMemorySemanticStore } from '../core/semantic-memory.js';
import { createRemoteSemanticBuilder, createRemoteSubjectDetector, selectAllConfirmedEvidence } from '../adapters/remote/semantic.js';
import { registerWebMcp } from '../webmcp/register.js';
const MAX_RAW_TEXT_CHARS = 1000;
const $ = (id) => document.getElementById(id);
const remote = { getAccessCode: () => $('access-code').value };
const capabilities = createSemanticMemory({ store: new InMemorySemanticStore(), detectSubject: createRemoteSubjectDetector(remote), buildSemantics: createRemoteSemanticBuilder(remote), selectEvidence: selectAllConfirmedEvidence, idFactory: createDemoId });
let draft = null; let savedCount = 0; let busy = false; let elapsedTimer = null; let startedAt = 0;
const show = (value) => { $('output').textContent = JSON.stringify(value, null, 2); };
const status = (message, kind = '') => { $('operation-status').textContent = message; $('operation-status').dataset.kind = kind; };
function setBusy(value, message = 'Procesando con IA…') { busy = value; document.body.toggleAttribute('aria-busy', value); $('processing-indicator').hidden = !value; for (const control of document.querySelectorAll('[data-busy-lock]')) control.disabled = value; clearInterval(elapsedTimer); if (value) { startedAt = performance.now(); const update = () => { $('processing-message').textContent = `${message} ${Math.floor((performance.now() - startedAt) / 1000)} s`; }; update(); elapsedTimer = setInterval(update, 1000); } }
function step(name) { for (const candidate of ['talk', 'review', 'save']) { $(`step-${candidate}`).toggleAttribute('aria-current', candidate === name); $(`${candidate}-panel`).hidden = candidate !== name; } }
function updateCount() { $('character-count').textContent = `${$('entry').value.length}/${MAX_RAW_TEXT_CHARS}`; }

async function prepare(rawText) {
  if (busy) return; setBusy(true, 'Identificando el sujeto…'); status('Preparando la confirmación del sujeto…', 'working');
  try { draft = await capabilities.prepare({ rawText }); $('raw-text').value = rawText; const subject = draft.subjectResolution.subject; $('subject-label').value = subject?.label ?? ''; $('subject-type').value = subject?.type ?? ''; $('confirmed-subject-id').value = subject?.id ?? ''; $('resolution').textContent = `${draft.subjectResolution.status}: ${draft.subjectResolution.reason}`; show(draft); step('review'); status('Revisa el texto y aprueba o corrige el sujeto antes de guardar.', 'success'); }
  catch (error) { status(error.message, 'error'); } finally { setBusy(false); }
}

$('entry').addEventListener('input', updateCount); updateCount();
$('text-entry').addEventListener('submit', async (event) => { event.preventDefault(); if (!$('access-code').value) return status('Introduce el código de acceso de la demo.', 'error'); await prepare($('entry').value); });
$('review-panel').addEventListener('submit', async (event) => {
  event.preventDefault(); if (busy) return; const confirmedSubject = { id: $('confirmed-subject-id').value.trim(), type: $('subject-type').value.trim(), label: $('subject-label').value.trim() };
  if (!confirmedSubject.id || !confirmedSubject.type || !confirmedSubject.label) return status('Completa el nombre, tipo e identificador del sujeto.', 'error');
  setBusy(true, 'Evidencia guardada. Construyendo el grafo…'); status('Texto y sujeto confirmados. Procesando la memoria semántica…', 'working');
  try { const record = await capabilities.confirm({ draftId: draft.draftId, confirmationToken: draft.confirmationToken, confirmed: true, confirmedRawText: $('raw-text').value, confirmedSubject }); savedCount += 1; $('memory-count').textContent = String(savedCount); $('subject-id').value = record.subjectId; show(record); step('save'); status(record.semanticStatus === 'ready' ? 'Entrada guardada y grafo semántico listo.' : 'La entrada quedó guardada, pero el grafo no pudo completarse.', record.semanticStatus === 'ready' ? 'success' : 'error'); }
  catch (error) { status(error.message, 'error'); } finally { setBusy(false); }
});
$('cancel').addEventListener('click', () => { draft = null; step('talk'); status('Borrador descartado. No se guardó información.'); });
$('new-observation').addEventListener('click', () => { $('entry').value = ''; updateCount(); step('talk'); status('Lista para otra entrada.'); });
$('clear-memory').addEventListener('click', async () => { await capabilities.clearMemory(); draft = null; savedCount = 0; $('memory-count').textContent = '0'; $('entry').value = ''; $('raw-text').value = ''; $('subject-id').value = ''; $('question').value = ''; updateCount(); show({ records: [], message: 'La memoria de esta sesión está vacía.' }); step('talk'); status('Memoria de sesión eliminada. La demo está vacía.', 'success'); });
$('search').addEventListener('submit', async (event) => { event.preventDefault(); try { show(await capabilities.queryMemory({ question: $('question').value, subjectId: $('subject-id').value })); } catch (error) { status(error.message, 'error'); } });
registerWebMcp(document.modelContext, capabilities).then((result) => { $('webmcp-status').textContent = result.available ? `WebMCP disponible: ${result.toolName}` : 'WebMCP no disponible en este navegador; la captura continúa.'; });
