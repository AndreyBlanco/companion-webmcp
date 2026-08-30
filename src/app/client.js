import { createCompanionCapabilities } from '../core/companion.js';
import { InMemoryObservationStore } from '../adapters/demo/store.js';
import { registerWebMcp } from '../webmcp/register.js';

const capabilities = createCompanionCapabilities({ store: new InMemoryObservationStore() });
let draft = null;
let captureSource = 'text';
let recorder = null;
let recordingStream = null;
let recordingChunks = [];
const $ = (id) => document.getElementById(id);
const showTechnical = (value) => { $('output').textContent = JSON.stringify(value, null, 2); };

function setStep(step) {
  for (const name of ['talk', 'review', 'save']) {
    const item = $(`step-${name}`);
    if (name === step) item.setAttribute('aria-current', 'step');
    else item.removeAttribute('aria-current');
  }
  $('talk-panel').hidden = step !== 'talk';
  $('review-panel').hidden = step !== 'review';
  $('success-panel').hidden = step !== 'save';
}

function resetCapture() {
  draft = null;
  captureSource = 'text';
  $('raw-text').value = '';
  $('audio-file').value = '';
  $('audio-status').textContent = 'Lista para grabar.';
  $('audio-status').classList.remove('recording');
  $('record').hidden = false;
  $('stop-recording').hidden = true;
  $('stop-recording').disabled = true;
  setStep('talk');
}

async function structureCurrentCapture() {
  draft = await capabilities.structureCapture({
    subject: { id: $('subject-id').value, displayName: $('subject-name').value },
    capturedAt: new Date().toISOString(), source: captureSource, rawText: $('raw-text').value
  });
  showTechnical(draft);
  return draft;
}

async function transcribeAudio(blob, filename) {
  $('audio-status').classList.remove('recording');
  $('audio-status').textContent = 'Transcribiendo…';
  $('record').disabled = true;
  $('stop-recording').disabled = true;
  try {
    const response = await fetch('/api/transcribe', {
      method: 'POST',
      headers: { 'content-type': blob.type || 'audio/webm', 'x-audio-filename': filename.replace(/[^a-zA-Z0-9._-]/g, '_') },
      body: blob
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || `La transcripción falló (HTTP ${response.status}).`);
    if (!payload.text.trim()) throw new Error('No se detectó voz. Inténtalo nuevamente con una observación sintética.');
    $('raw-text').value = payload.text;
    captureSource = 'voice';
    await structureCurrentCapture();
    setStep('review');
    $('raw-text').focus();
  } catch (error) {
    $('audio-status').textContent = error.message;
    $('record').hidden = false;
  } finally {
    $('record').disabled = !navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined';
    $('stop-recording').hidden = true;
  }
}

$('record').addEventListener('click', async () => {
  try {
    recordingStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    recordingChunks = [];
    recorder = new MediaRecorder(recordingStream);
    recorder.addEventListener('dataavailable', (event) => { if (event.data.size) recordingChunks.push(event.data); });
    recorder.addEventListener('stop', async () => {
      const type = recorder.mimeType || 'audio/webm';
      recordingStream.getTracks().forEach((track) => track.stop());
      await transcribeAudio(new Blob(recordingChunks, { type }), `capture-${Date.now()}.webm`);
    }, { once: true });
    recorder.start();
    $('record').disabled = true;
    $('record').hidden = true;
    $('stop-recording').hidden = false;
    $('stop-recording').disabled = false;
    $('audio-status').textContent = 'Grabando…';
    $('audio-status').classList.add('recording');
  } catch (error) {
    $('audio-status').textContent = `Micrófono no disponible: ${error.message}`;
  }
});

$('stop-recording').addEventListener('click', () => {
  if (recorder?.state === 'recording') recorder.stop();
  $('stop-recording').disabled = true;
  $('audio-status').classList.remove('recording');
  $('audio-status').textContent = 'Transcribiendo…';
});

$('audio-file').addEventListener('change', async (event) => {
  const [file] = event.target.files;
  if (file) await transcribeAudio(file, file.name || 'capture.webm');
});

$('text-entry').addEventListener('submit', async (event) => {
  event.preventDefault();
  $('raw-text').value = 'Observación: Orquídea completó el laberinto azul. Estrategia: Comenzó por la salida y trabajó hacia atrás. Respuesta: Sonrió después de encontrar la ruta.';
  captureSource = 'text';
  await structureCurrentCapture();
  setStep('review');
});

$('review-panel').addEventListener('submit', async (event) => {
  event.preventDefault();
  await structureCurrentCapture();
  const record = await capabilities.createObservation({ draftId: draft.draftId, confirmationToken: draft.confirmationToken, confirmed: true });
  draft = null;
  showTechnical(record);
  setStep('save');
});

$('cancel').addEventListener('click', resetCapture);
$('new-observation').addEventListener('click', resetCapture);

$('search').addEventListener('submit', async (event) => {
  event.preventDefault();
  showTechnical(await capabilities.searchObservations({ subjectId: $('subject-id').value, question: $('question').value }));
});

if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
  $('record').disabled = true;
  $('audio-status').textContent = window.isSecureContext
    ? 'Este navegador no ofrece grabación directa; selecciona un archivo de audio sintético.'
    : 'El micrófono requiere HTTPS; selecciona un archivo de audio sintético.';
}

registerWebMcp(document.modelContext, capabilities).then((status) => {
  $('webmcp-status').textContent = status.available ? `WebMCP disponible: ${status.toolName}` : 'WebMCP no está disponible; la aplicación continúa funcionando.';
});
