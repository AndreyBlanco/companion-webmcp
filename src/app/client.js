import { createDemoId, createSemanticMemory, InMemorySemanticStore } from '../core/semantic-memory.js';
import { SYNTHETIC_DEMO_ENTRIES } from '../adapters/demo/semantic.js';
import { createRemoteSemanticExtractor, selectAllConfirmedEvidence } from '../adapters/remote/semantic.js';
import { registerWebMcp } from '../webmcp/register.js';

const $ = (id) => document.getElementById(id);
const capabilities = createSemanticMemory({ store: new InMemorySemanticStore(), extract: createRemoteSemanticExtractor({ getAccessCode: () => $('access-code').value }), selectEvidence: selectAllConfirmedEvidence, idFactory: createDemoId });
let draft = null; let example = 0; let savedCount = 0;
const show = (value) => { $('output').textContent = JSON.stringify(value, null, 2); };
const status = (message, kind = '') => { $('operation-status').textContent = message; $('operation-status').dataset.kind = kind; };

function step(name) {
  for (const candidate of ['talk', 'review', 'save']) {
    $(`step-${candidate}`).toggleAttribute('aria-current', candidate === name);
    $(`${candidate}-panel`).hidden = candidate !== name;
  }
}

async function review(rawText) {
  status('Generando borrador semántico…', 'working');
  try {
    draft = await capabilities.interpret({ rawText });
    $('raw-text').value = rawText;
    $('resolution').textContent = `${draft.subjectResolution.status}: ${draft.subjectResolution.reason}`;
    show(draft); step('review'); status('Borrador listo. Revisa la fuente y la interpretación antes de guardar.', 'success');
  } catch (error) { status(error.message, 'error'); }
}

$('example').addEventListener('click', () => { const value = SYNTHETIC_DEMO_ENTRIES[example++ % SYNTHETIC_DEMO_ENTRIES.length]; $('entry').value = value; review(value); });
$('text-entry').addEventListener('submit', async (event) => { event.preventDefault(); if (!$('access-code').value) { status('Introduce el código de acceso de la demo.', 'error'); return; } await review($('entry').value); });
$('review-panel').addEventListener('submit', async (event) => {
  event.preventDefault();
  try {
    if ($('raw-text').value !== draft.rawText) { status('Actualizando el borrador semántico…', 'working'); draft = await capabilities.interpret({ rawText: $('raw-text').value }); }
    const record = await capabilities.confirm({ draftId: draft.draftId, confirmationToken: draft.confirmationToken, confirmed: true });
    savedCount += 1; $('memory-count').textContent = String(savedCount); $('subject-id').value = record.subjectId; show(record); step('save'); status('Observación confirmada y guardada en esta sesión.', 'success');
  } catch (error) { $('resolution').textContent = error.message; status(error.message, 'error'); }
});
$('cancel').addEventListener('click', () => { draft = null; step('talk'); status('Borrador descartado. No se guardó información.'); });
$('new-observation').addEventListener('click', () => { $('entry').value = ''; step('talk'); status('Lista para otra entrada.'); });
$('search').addEventListener('submit', async (event) => { event.preventDefault(); try { show(await capabilities.queryMemory({ question: $('question').value, subjectId: $('subject-id').value })); } catch (error) { status(error.message, 'error'); } });

registerWebMcp(document.modelContext, capabilities).then((result) => { $('webmcp-status').textContent = result.available ? `WebMCP disponible: ${result.toolName}` : 'WebMCP no disponible en este navegador; la captura continúa.'; });
