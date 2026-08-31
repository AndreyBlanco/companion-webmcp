import { createDemoId, createSemanticMemory, InMemorySemanticStore } from '../core/semantic-memory.js';
import { extractSyntheticDemo, selectSyntheticEvidence, SYNTHETIC_DEMO_ENTRIES } from '../adapters/demo/semantic.js';
import { registerWebMcp } from '../webmcp/register.js';

const capabilities = createSemanticMemory({ store: new InMemorySemanticStore(), extract: extractSyntheticDemo, selectEvidence: selectSyntheticEvidence, idFactory: createDemoId });
let draft = null; let example = 0;
const $ = (id) => document.getElementById(id);
const show = (value) => { $('output').textContent = JSON.stringify(value, null, 2); };

function step(name) {
  for (const candidate of ['talk', 'review', 'save']) {
    $(`step-${candidate}`).toggleAttribute('aria-current', candidate === name);
    $(`${candidate}-panel`).hidden = candidate !== name;
  }
}

async function review(rawText) {
  draft = await capabilities.interpret({ rawText });
  $('raw-text').value = rawText;
  $('resolution').textContent = `${draft.subjectResolution.status}: ${draft.subjectResolution.reason}`;
  show(draft); step('review');
}

$('example').addEventListener('click', () => review(SYNTHETIC_DEMO_ENTRIES[example++ % SYNTHETIC_DEMO_ENTRIES.length]));
$('text-entry').addEventListener('submit', async (event) => { event.preventDefault(); await review($('entry').value); });
$('review-panel').addEventListener('submit', async (event) => {
  event.preventDefault();
  if ($('raw-text').value !== draft.rawText) draft = await capabilities.interpret({ rawText: $('raw-text').value });
  try { show(await capabilities.confirm({ draftId: draft.draftId, confirmationToken: draft.confirmationToken, confirmed: true })); step('save'); }
  catch (error) { $('resolution').textContent = error.message; }
});
$('cancel').addEventListener('click', () => step('talk'));
$('new-observation').addEventListener('click', () => { $('entry').value = ''; step('talk'); });
$('search').addEventListener('submit', async (event) => { event.preventDefault(); show(await capabilities.queryMemory({ question: $('question').value, subjectId: $('subject-id').value })); });

registerWebMcp(document.modelContext, capabilities).then((status) => { $('webmcp-status').textContent = status.available ? `WebMCP disponible: ${status.toolName}` : 'WebMCP no disponible en este navegador; la demo continúa.'; });
