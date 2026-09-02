export const SEMANTIC_KINDS = Object.freeze(['entity', 'claim', 'measurement', 'event', 'relationship', 'hypothesis']);
export const PROVENANCE_TYPES = Object.freeze(['observed', 'measured', 'reported', 'speaker_inference', 'system_inference']);
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

export function validateSemanticItems(items, subject, rawText) {
  if (!Array.isArray(items)) throw new TypeError('items must be an array');
  for (const [index, item] of items.entries()) {
    if (!SEMANTIC_KINDS.includes(item.kind)) throw new TypeError(`items[${index}].kind is invalid`);
    requiredString(item.id, `items[${index}].id`); requiredString(item.subject, `items[${index}].subject`); requiredString(item.predicate, `items[${index}].predicate`);
    if (!PROVENANCE_TYPES.includes(item.provenance)) throw new TypeError(`items[${index}].provenance is invalid`);
    if (item.value === undefined || item.value === null || item.value === '') throw new TypeError(`items[${index}].value is required`);
    if (!Array.isArray(item.evidence) || item.evidence.length === 0) throw new TypeError(`items[${index}].evidence is required`);
    for (const excerpt of item.evidence) { requiredString(excerpt, `items[${index}].evidence excerpt`); if (!rawText.includes(excerpt)) throw new TypeError(`items[${index}].evidence must be an exact excerpt of rawText`); }
    if (item.subject !== subject.id) throw new TypeError(`items[${index}].subject must match the confirmed subject`);
  }
  return items;
}

export function validateSemanticDelta(delta) { validateSubjectResolution(delta?.subjectResolution); validateSemanticItems(delta?.items, delta.subjectResolution.subject ?? { id: '' }, delta.items?.flatMap((item) => item.evidence ?? []).join(' ') ?? ''); return delta; }

export class InMemorySemanticStore {
  #subjects = new Map(); #records = [];
  async save({ subject, record }) { this.#subjects.set(subject.id, structuredClone(subject)); this.#records.push(structuredClone(record)); return structuredClone(record); }
  async update(recordId, changes) { const index = this.#records.findIndex((record) => record.recordId === recordId); if (index < 0) throw new Error('Record not found'); this.#records[index] = { ...this.#records[index], ...structuredClone(changes) }; return structuredClone(this.#records[index]); }
  async subjects() { return [...this.#subjects.values()].map((subject) => structuredClone(subject)); }
  async bySubject(subjectId) { return this.#records.filter((record) => record.subjectId === subjectId).map((record) => structuredClone(record)); }
  async clear() { this.#subjects.clear(); this.#records = []; }
}

export function createSemanticMemory({ store, detectSubject, buildSemantics, selectEvidence, idFactory, clock = () => new Date() }) {
  const drafts = new Map(); let activeSubject = null;
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
    const record = { recordId, subjectId: confirmedSubject.id, rawText: confirmedRawText, capturedAt: draft.capturedAt, confirmedAt, subjectConfirmation: { confirmedBy: 'user', corrected: JSON.stringify(draft.subjectResolution.subject) !== JSON.stringify(confirmedSubject), proposal: draft.subjectResolution }, semanticStatus: 'processing', semanticItems: [] };
    await store.save({ subject: confirmedSubject, record }); activeSubject = structuredClone(confirmedSubject);
    try { const items = validateSemanticItems(await buildSemantics({ rawText: confirmedRawText, confirmedSubject }), confirmedSubject, confirmedRawText); return await store.update(recordId, { semanticStatus: 'ready', semanticItems: items.map((item) => ({ ...item, sourceRecordId: recordId })) }); }
    catch { return await store.update(recordId, { semanticStatus: 'failed', semanticItems: [] }); }
  }
  async function queryMemory({ question, subjectId = activeSubject?.id, evidenceTypes }) {
    requiredString(question, 'question'); requiredString(subjectId, 'subjectId'); const recordsConsidered = await store.bySubject(subjectId); const selection = await selectEvidence({ question, subjectId, records: recordsConsidered, evidenceTypes }); const allowed = new Map(recordsConsidered.map((record) => [record.recordId, record])); const selectedIds = [...new Set(selection.recordIds ?? [])].filter((id) => allowed.has(id)); const records = selectedIds.map((id) => allowed.get(id)).map((record) => ({ recordId: record.recordId, rawText: record.rawText, evidence: record.semanticItems.filter((item) => !evidenceTypes || evidenceTypes.includes(item.kind)) })).filter((record) => record.evidence.length > 0); return { subjectId, question, records, retrievalMetadata: { interpretation: selection.interpretation ?? null, recordsConsidered: recordsConsidered.map((record) => record.recordId), recordsReturned: records.map((record) => record.recordId), subjectMemoryEmpty: records.length === 0, sufficiencyAssessment: 'external_agent' } };
  }
  async function clearMemory() { drafts.clear(); activeSubject = null; await store.clear(); }
  return Object.freeze({ prepare, confirm, queryMemory, clearMemory, getSubjectMemory: (subjectId) => store.bySubject(subjectId), getActiveSubject: () => structuredClone(activeSubject) });
}
