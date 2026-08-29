import { assertCapture, assertSubject, SCHEMA_VERSION } from '../contracts/index.js';

const LABELS = new Map([
  ['observation', 'observation'],
  ['strategy', 'strategy'],
  ['response', 'response'],
  ['follow up', 'followUp'],
  ['follow-up', 'followUp'],
  ['followup', 'followUp']
]);

function extractExplicitFields(rawText) {
  const result = { observation: null, strategy: null, response: null, followUp: null };
  const pattern = /(?:^|\n)\s*(observation|strategy|response|follow[- ]?up)\s*:\s*([^\n]+)/gi;
  for (const match of rawText.matchAll(pattern)) result[LABELS.get(match[1].toLowerCase())] = match[2].trim();
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

export function createCompanionCapabilities({ store, clock = () => new Date(), idFactory = () => crypto.randomUUID() }) {
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
