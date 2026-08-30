import { assertCapture, assertSubject, SCHEMA_VERSION } from '../contracts/index.js';

const LABELS = new Map([
  ['observation', 'observation'],
  ['strategy', 'strategy'],
  ['response', 'response'],
  ['follow up', 'followUp'],
  ['follow-up', 'followUp'],
  ['followup', 'followUp'],
  ['observación', 'observation'],
  ['observacion', 'observation'],
  ['estrategia', 'strategy'],
  ['respuesta', 'response'],
  ['seguimiento', 'followUp'],
  ['próximo paso', 'followUp'],
  ['proximo paso', 'followUp']
]);

function extractExplicitFields(rawText) {
  const result = { observation: null, strategy: null, response: null, followUp: null };
  const pattern = /(?:^|\s)(observation|strategy|response|follow[- ]?up|observaci[oó]n|estrategia|respuesta|seguimiento|pr[oó]ximo paso)\s*:\s*/gi;
  const matches = [...rawText.matchAll(pattern)];
  for (let index = 0; index < matches.length; index += 1) {
    const match = matches[index];
    const valueStart = match.index + match[0].length;
    const valueEnd = matches[index + 1]?.index ?? rawText.length;
    result[LABELS.get(match[1].toLowerCase())] = rawText.slice(valueStart, valueEnd).trim();
  }
  if (!result.observation) result.observation = rawText.trim();
  return result;
}

function terms(text) {
  return new Set(text.toLocaleLowerCase().match(/[\p{L}\p{N}]{3,}/gu) ?? []);
}

function groundedSummary(record) {
  return [
    ['Observation', record.observation],
    ['Strategy', record.strategy],
    ['Response', record.response],
    ['Follow-up', record.followUp]
  ].filter(([, value]) => value !== null).map(([label, value]) => `${label}: ${value}`).join('\n');
}

export function createDemoId(cryptoApi = globalThis.crypto) {
  if (typeof cryptoApi?.randomUUID === 'function') return cryptoApi.randomUUID();
  if (typeof cryptoApi?.getRandomValues === 'function') {
    const bytes = cryptoApi.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = [...bytes].map((value) => value.toString(16).padStart(2, '0'));
    return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex.slice(6, 8).join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10).join('')}`;
  }
  return `demo-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

export function createCompanionCapabilities({ store, clock = () => new Date(), idFactory = createDemoId }) {
  const drafts = new Map();

  async function structureCapture(input) {
    assertCapture(input);
    const fields = extractExplicitFields(input.rawText);
    const missing = ['strategy', 'response', 'followUp'].filter((field) => fields[field] === null);
    const draft = Object.freeze({
      draftId: idFactory(),
      confirmationToken: idFactory(),
      schemaVersion: SCHEMA_VERSION,
      subject: structuredClone(input.subject),
      capturedAt: input.capturedAt,
      source: input.source,
      rawText: input.rawText,
      ...fields,
      uncertainties: missing.map((field) => `${field} was not explicitly provided`)
    });
    drafts.set(draft.draftId, draft);
    return structuredClone(draft);
  }

  async function createObservation({ draftId, confirmationToken, confirmed }) {
    if (confirmed !== true) throw new Error('Explicit confirmation is required');
    const draft = drafts.get(draftId);
    if (!draft || draft.confirmationToken !== confirmationToken) throw new Error('Draft or confirmation token is invalid');
    drafts.delete(draftId);
    const { confirmationToken: omitted, ...confirmedDraft } = draft;
    void omitted;
    const record = { ...confirmedDraft, id: idFactory(), confirmedAt: clock().toISOString() };
    return store.save(record);
  }

  async function getSubjectContext(subjectId) {
    if (typeof subjectId !== 'string' || !subjectId.trim()) throw new TypeError('subjectId is required');
    return store.bySubject(subjectId);
  }

  async function searchObservations({ subjectId, question }) {
    if (typeof question !== 'string' || !question.trim()) throw new TypeError('question is required');
    const context = await getSubjectContext(subjectId); // Isolation occurs before any content scoring.
    const queryTerms = terms(question);
    const ranked = context
      .map((record) => ({ record, score: [...terms([record.observation, record.strategy, record.response, record.followUp].filter(Boolean).join(' '))].filter((term) => queryTerms.has(term)).length }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score || a.record.confirmedAt.localeCompare(b.record.confirmedAt));
    if (!ranked.length) return { answer: 'Insufficient evidence for this subject.', evidenceRecordIds: [], insufficientEvidence: true };
    return {
      answer: ranked.map(({ record }) => groundedSummary(record)).join('\n\n'),
      evidenceRecordIds: ranked.map(({ record }) => record.id),
      insufficientEvidence: false
    };
  }

  return Object.freeze({ structureCapture, createObservation, searchObservations, getSubjectContext });
}
