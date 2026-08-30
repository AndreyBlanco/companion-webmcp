const TRANSCRIPTIONS_URL = 'https://api.openai.com/v1/audio/transcriptions';

export function createOpenAITranscriber({ apiKey, fetchImpl = fetch }) {
  if (typeof apiKey !== 'string' || !apiKey.startsWith('sk-')) {
    return async () => { throw new Error('Audio transcription is unavailable: OPENAI_API_KEY is not configured.'); };
  }

  return async function transcribe({ bytes, contentType, filename }) {
    const form = new FormData();
    form.append('file', new Blob([bytes], { type: contentType }), filename);
    form.append('model', 'gpt-transcribe');
    const response = await fetchImpl(TRANSCRIPTIONS_URL, {
      method: 'POST',
      headers: { authorization: `Bearer ${apiKey}` },
      body: form
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = payload?.error?.message || `Transcription provider returned HTTP ${response.status}.`;
      throw new Error(message);
    }
    if (typeof payload.text !== 'string') throw new Error('Transcription provider returned no text field.');
    return { text: payload.text, usage: payload.usage ?? null };
  };
}
