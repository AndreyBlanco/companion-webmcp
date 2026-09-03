import { projectFactualVocabulary, lookupFactualVocabulary } from './semantic-retrieval.js';
import { incorporateSemanticBuild } from './semantic-authority.js';
export const RESOLUTION_STATUSES = Object.freeze(['resolved', 'probable', 'ambiguous']);
function requiredString(value, name) { if (typeof value !== 'string' || !value.trim()) throw new TypeError(`${name} is required`); }

export function createDemoId(cryptoApi = globalThis.crypto) {
  if (typeof cryptoApi?.randomUUID === 'function') return cryptoApi.randomUUID();
  if (typeof cryptoApi?.getRandomValues === 'function') { const bytes = cryptoApi.getRandomValues(new Uint8Array(16)); bytes[6] = (bytes[6] & 0x0f) | 0x40; bytes[8] = (bytes[8] & 0x3f) | 0x80; const hex = [...bytes].map((value) => value.toString(16).padStart(2, '0')); return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex.slice(6, 8).join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10).join('')}`; }
  return `demo-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

export function validateSubjectResolution(resolution) {
  if (!resolution || !RESOLUTION_STATUSES.includes(resolution.status)) throw new TypeError('invalid subject resolution status');
  requiredString(resolution.reason, 'subjectResolution.reason');
  if (resolution.subject !== null) { requiredString(resolution.subject?.id, 'subject.id'); requiredString(resolution.subject?.type, 'subject.type'); requiredString(resolution.subject?.label, 'subject.label'); }
  if (resolution.status === 'ambiguous' && resolution.subject !== null) throw new TypeError('ambiguous resolution cannot contain a subject');
  return resolution;
}

export class InMemorySemanticStore {
  #subjects = new Map(); #records = [];
  async save({ subject, record }) { if (this.#records.some((entry) => entry.recordId === record.recordId)) throw new Error('Record identity collision'); this.#subjects.set(subject.id, structuredClone(subject)); this.#records.push(structuredClone(record)); return structuredClone(record); }
  async update(recordId, changes) { const index = this.#records.findIndex((record) => record.recordId === recordId); if (index < 0) throw new Error('Record not found'); this.#records[index] = { ...this.#records[index], ...structuredClone(changes) }; return structuredClone(this.#records[index]); }
  async byId(recordId) { const record = this.#records.find((candidate) => candidate.recordId === recordId); return record ? structuredClone(record) : null; }
  async subjects() { return [...this.#subjects.values()].map((subject) => structuredClone(subject)); }
  async bySubject(subjectId) { return this.#records.filter((record) => record.subjectId === subjectId).map((record) => structuredClone(record)); }
  async clear() { this.#subjects.clear(); this.#records = []; }
}

export function createSemanticMemory({ store, detectSubject, buildSemantics, idFactory, clock = () => new Date() }) {
  const drafts = new Map(); const processing = new Map(); let activeSubject = null; let sessionVersion = 0;
  async function prepare({ rawText, capturedAt = clock().toISOString() }) {
    requiredString(rawText, 'rawText');
    const subjectResolution = validateSubjectResolution(await detectSubject({ rawText, activeSubject, existingSubjects: await store.subjects() }));
    const draft = { draftId: idFactory(), confirmationToken: idFactory(), rawText, capturedAt, activeSubjectBefore: activeSubject ? structuredClone(activeSubject) : null, subjectResolution: structuredClone(subjectResolution) };
    drafts.set(draft.draftId, draft); return structuredClone(draft);
  }
  async function confirm({ draftId, confirmationToken, confirmed, confirmedRawText, confirmedSubject }) {
    if (confirmed !== true) throw new Error('Explicit confirmation is required');
    const draft = drafts.get(draftId); if (!draft || draft.confirmationToken !== confirmationToken) throw new Error('Draft or confirmation token is invalid');
    requiredString(confirmedRawText, 'confirmedRawText'); requiredString(confirmedSubject?.id, 'confirmedSubject.id'); requiredString(confirmedSubject?.type, 'confirmedSubject.type'); requiredString(confirmedSubject?.label, 'confirmedSubject.label');
    drafts.delete(draftId); const recordId = idFactory(); const confirmedAt = clock().toISOString();
    const record = { recordId, subjectId: confirmedSubject.id, rawText: confirmedRawText, capturedAt: draft.capturedAt, confirmedAt, subjectConfirmation: { confirmedBy: 'user', corrected: JSON.stringify(draft.subjectResolution.subject) !== JSON.stringify(confirmedSubject), proposal: draft.subjectResolution }, semanticStatus: 'processing', semanticAttempts: 0, semanticGraph: { nodes: [], edges: [] }, semanticAudit: null, semanticErrors: [] };
    record.confirmedSubject = structuredClone(confirmedSubject);
    await store.save({ subject: confirmedSubject, record }); activeSubject = structuredClone(confirmedSubject); return structuredClone(record);
  }
  async function processRecord(recordId, { maxAttempts = 3, onAttempt } = {}) {
    if (processing.has(recordId)) return processing.get(recordId);
    const version = sessionVersion;
    const task = (async () => {
      const record = await store.byId(recordId); if (!record) throw new Error('Record not found');
      if (record.semanticStatus === 'ready' || record.semanticStatus === 'failed') return record;
      const confirmedSubject = record.confirmedSubject;
      const attemptLimit = Number.isInteger(maxAttempts) ? Math.min(3, Math.max(1, maxAttempts)) : 3;
      for (let attempt = 1; attempt <= attemptLimit; attempt += 1) {
        if (version !== sessionVersion) return null;
        await store.update(recordId, { semanticStatus: 'processing', semanticAttempts: attempt }); onAttempt?.({ recordId, attempt, maxAttempts: attemptLimit });
        try {
          const output = await buildSemantics({ recordId, rawText: record.rawText, confirmedSubject });
          if (version !== sessionVersion) return null;
          const result = incorporateSemanticBuild(output, record);
          result.semanticAudit.processedAt = clock().toISOString();
          if (version !== sessionVersion) return null;
          return await store.update(recordId, { semanticStatus: 'ready', semanticAttempts: attempt, ...result });
        } catch (error) {
          if (version !== sessionVersion) return null;
          record.semanticErrors.push({ attempt, code: error.code ?? 'SEMANTIC_PROCESSING_FAILED' });
          await store.update(recordId, { semanticErrors: record.semanticErrors });
          if (attempt === attemptLimit) return store.update(recordId, { semanticStatus: 'failed', semanticAttempts: attempt, semanticGraph: { nodes: [], edges: [] } });
        }
      }
      return null;
    })().finally(() => processing.delete(recordId));
    processing.set(recordId, task); return task;
  }
  async function getVocabulary({ subjectId = activeSubject?.id } = {}) {
    requiredString(subjectId, 'subjectId');
    const projection = await projectFactualVocabulary(await store.bySubject(subjectId), subjectId);
    return { subjectId, version: projection.version, items: projection.items };
  }
  async function queryMemory(input) {
    if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).some((key) => !['subjectId', 'relevantVocabularyIds'].includes(key))) throw new TypeError('Lookup requires subjectId and relevantVocabularyIds only');
    const { subjectId, relevantVocabularyIds } = input;
    requiredString(subjectId, 'subjectId');
    if (!Array.isArray(relevantVocabularyIds) || relevantVocabularyIds.some((id) => typeof id !== 'string' || !id.trim())) throw new TypeError('relevantVocabularyIds must be an array of nonempty strings');
    const projection = await projectFactualVocabulary(await store.bySubject(subjectId), subjectId);
    return lookupFactualVocabulary(projection, subjectId, relevantVocabularyIds);
  }
  async function clearMemory() { sessionVersion += 1; drafts.clear(); activeSubject = null; await store.clear(); }
  return Object.freeze({ prepare, confirm, processRecord, getVocabulary, queryMemory, clearMemory, getSubjects: () => store.subjects(), getSubjectMemory: (subjectId) => store.bySubject(subjectId), getActiveSubject: () => structuredClone(activeSubject) });
}
