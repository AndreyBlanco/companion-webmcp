/** @typedef {{id: string, displayName: string}} SubjectRef */
/** @typedef {{subject: SubjectRef, capturedAt: string, source: 'voice'|'text', rawText: string}} CaptureInput */

export const SCHEMA_VERSION = 1;

export function assertSubject(subject) {
  if (!subject || typeof subject.id !== 'string' || !subject.id.trim()) {
    throw new TypeError('subject.id is required');
  }
  if (typeof subject.displayName !== 'string' || !subject.displayName.trim()) {
    throw new TypeError('subject.displayName is required');
  }
}

export function assertCapture(input) {
  assertSubject(input?.subject);
  if (!['voice', 'text'].includes(input.source)) throw new TypeError('source must be voice or text');
  if (typeof input.rawText !== 'string' || !input.rawText.trim()) throw new TypeError('rawText is required');
  if (Number.isNaN(Date.parse(input.capturedAt))) throw new TypeError('capturedAt must be an ISO date');
}
