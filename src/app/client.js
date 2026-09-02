import { createDemoId, createSemanticMemory, InMemorySemanticStore } from '../core/semantic-memory.js';
import { createRemoteSemanticExtractor, selectAllConfirmedEvidence } from '../adapters/remote/semantic.js';
import { registerWebMcp } from '../webmcp/register.js';

const $ = (id) => document.getElementById(id);
const capabilities = createSemanticMemory({ store: new InMemorySemanticStore(), extract: createRemoteSemanticExtractor({ getAccessCode: () => $('access-code').value }), selectEvidence: selectAllConfirmedEvidence, idFactory: createDemoId });
let draft = null; let savedCount = 0; let busy = false;
const show = (value) => { $('output').textContent = JSON.stringify(value, null, 2); };
const status = (message, kind = '') => { $('operation-status').textContent = message; $('operation-status').dataset.kind = kind; };
function setBusy(value, message = 'Procesando con IA…') {
  busy = value;
  document.body.toggleAttribute('aria-busy', value);
  $('processing-indicator').hidden = !value;
  $('processing-message').textContent = message;
  for (const control of document.querySelectorAll('[data-busy-lock]')) control.disabled = value;
}

function step(name) {
  for (const candidate of ['talk', 'review', 'save']) {
    $(`step-${candidate}`).toggleAttribute('aria-current', candidate === name);
    $(`${candidate}-panel`).hidden = candidate !== name;
  }
}

async function review(rawText) {
  if (busy) return;
  setBusy(true, 'Interpretando el texto con IA. Esto puede tomar unos segundos…');
  status('Generando borrador semántico…', 'working');
  try {
    draft = await capabilities.interpret({ rawText });
    $('raw-text').value = rawText;
    $('resolution').textContent = `${draft.subjectResolution.status}: ${draft.subjectResolution.reason}`;
    show(draft); step('review'); status('Borrador listo. Revisa la fuente y la interpretación antes de guardar.', 'success');
  } catch (error) { status(error.message, 'error'); }
  finally { setBusy(false); }
}

$('text-entry').addEventListener('submit', async (event) => { event.preventDefault(); if (!$('access-code').value) { status('Introduce el código de acceso de la demo.', 'error'); return; } await review($('entry').value); });
$('review-panel').addEventListener('submit', async (event) => {
  event.preventDefault();
  if (busy) return;
  try {
    if ($('raw-text').value !== draft.rawText) {
      setBusy(true, 'Actualizando la interpretación con IA…');
      status('Actualizando el borrador semántico…', 'working');
      draft = await capabilities.interpret({ rawText: $('raw-text').value });
    }
    const record = await capabilities.confirm({ draftId: draft.draftId, confirmationToken: draft.confirmationToken, confirmed: true });
    savedCount += 1; $('memory-count').textContent = String(savedCount); $('subject-id').value = record.subjectId; show(record); step('save'); status('Observación confirmada y guardada en esta sesión.', 'success');
  } catch (error) { $('resolution').textContent = error.message; status(error.message, 'error'); }
  finally { setBusy(false); }
});
$('cancel').addEventListener('click', () => { draft = null; step('talk'); status('Borrador descartado. No se guardó información.'); });
$('new-observation').addEventListener('click', () => { $('entry').value = ''; step('talk'); status('Lista para otra entrada.'); });
$('clear-memory').addEventListener('click', async () => {
  await capabilities.clearMemory(); draft = null; savedCount = 0;
  $('memory-count').textContent = '0'; $('entry').value = ''; $('raw-text').value = ''; $('subject-id').value = ''; $('question').value = '';
  show({ records: [], message: 'La memoria de esta sesión está vacía.' }); step('talk'); status('Memoria de sesión eliminada. La demo está vacía.', 'success');
});
$('search').addEventListener('submit', async (event) => { event.preventDefault(); try { show(await capabilities.queryMemory({ question: $('question').value, subjectId: $('subject-id').value })); } catch (error) { status(error.message, 'error'); } });

registerWebMcp(document.modelContext, capabilities).then((result) => { $('webmcp-status').textContent = result.available ? `WebMCP disponible: ${result.toolName}` : 'WebMCP no disponible en este navegador; la captura continúa.'; });
