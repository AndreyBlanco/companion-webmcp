import { timingSafeEqual } from 'node:crypto';
export const MAX_SEMANTIC_BODY_BYTES = 32 * 1024;
export const MAX_RAW_TEXT_CHARS = 1000;
function sameSecret(received, expected) { const left = Buffer.from(String(received ?? ''), 'utf8'); const right = Buffer.from(String(expected ?? ''), 'utf8'); return left.length === right.length && left.length > 0 && timingSafeEqual(left, right); }
function response(status, body) { return { status, body }; }
function providerError(error, operation) { const label = operation === 'detect_subject' ? 'Subject detection' : 'Semantic processing'; if (error?.name === 'TimeoutError' || error?.name === 'AbortError') return response(504, { error: `${label} timed out. Try again.` }); if (error?.providerStatus === 429) return response(429, { error: `${label} is temporarily busy. Try again.` }); return response(502, { error: `${label} failed. Try again.` }); }

export async function processSemanticRequest({ method, headers, bodyText, detectSubject, buildSemantics, accessCode }) {
  if (method !== 'POST') return response(405, { error: 'Method not allowed.' });
  if (!accessCode) return response(503, { error: 'Semantic extraction is not configured.' });
  if (!sameSecret(headers?.['x-companion-demo-code'], accessCode)) return response(401, { error: 'Invalid demo access code.' });
  if (!String(headers?.['content-type'] ?? '').toLowerCase().startsWith('application/json')) return response(415, { error: 'application/json is required.' });
  if (Buffer.byteLength(bodyText, 'utf8') > MAX_SEMANTIC_BODY_BYTES) return response(413, { error: 'Request is too large.' });
  let input; try { input = JSON.parse(bodyText); } catch { return response(400, { error: 'Invalid JSON.' }); }
  if (typeof input?.rawText !== 'string' || !input.rawText.trim()) return response(400, { error: 'rawText is required.' });
  if (input.rawText.length > MAX_RAW_TEXT_CHARS) return response(413, { error: `rawText exceeds the ${MAX_RAW_TEXT_CHARS}-character demo limit.` });
  if (!['detect_subject', 'build_semantics'].includes(input.operation)) return response(400, { error: 'A valid operation is required.' });
  try {
    if (input.operation === 'detect_subject') return response(200, await detectSubject({ rawText: input.rawText, activeSubject: input.activeSubject ?? null, existingSubjects: Array.isArray(input.existingSubjects) ? input.existingSubjects : [] }));
    const subject = input.confirmedSubject;
    if (!subject || typeof subject.id !== 'string' || !subject.id.trim() || typeof subject.type !== 'string' || !subject.type.trim() || typeof subject.label !== 'string' || !subject.label.trim()) return response(400, { error: 'A complete confirmedSubject is required.' });
    return response(200, { items: await buildSemantics({ rawText: input.rawText, confirmedSubject: subject }) });
  } catch (error) { return providerError(error, input.operation); }
}
