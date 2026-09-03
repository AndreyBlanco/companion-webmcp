// Repository-authored P12/P13 projection; MIT. No second memory store or model call.
const factualStatuses = new Set(['SOURCE_EXPLICIT', 'SOURCE_STRONGLY_IMPLIED']);
const compare = (a, b) => a < b ? -1 : a > b ? 1 : 0;
function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
  return value;
}

export async function projectFactualVocabulary(records, subjectId) {
  const entries = [];
  for (const record of records) {
    if (record.subjectId !== subjectId || record.semanticStatus !== 'ready') continue;
    const nodes = new Map(record.semanticGraph.nodes.map((node) => [node.id, node]));
    for (const edge of record.semanticGraph.edges) {
      if (!factualStatuses.has(edge.epistemicStatus)) continue;
      const endpoints = [...new Set([edge.from, edge.to])].map((id) => nodes.get(id));
      if (endpoints.some((node) => !node)) throw new TypeError('Stored factual relation has an unresolved endpoint');
      const item = { id: edge.id, label: `${nodes.get(edge.from).label} — ${edge.type} → ${nodes.get(edge.to).label}`, evidenceTypes: [...new Set(endpoints.map((node) => node.type))].sort() };
      entries.push({ item, recordId: record.recordId, subjectId, capturedAt: record.capturedAt, confirmedAt: record.confirmedAt, edge, nodes: endpoints });
    }
  }
  entries.sort((a, b) => compare(a.item.id, b.item.id));
  const byId = new Map(entries.map((entry) => [entry.item.id, entry]));
  if (byId.size !== entries.length) throw new TypeError('Stored factual identities are not unique');
  const bytes = new TextEncoder().encode(JSON.stringify(canonical({ subjectId, entries })));
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  const version = `sha256:${[...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')}`;
  return { version, items: entries.map((entry) => entry.item), byId };
}

export function lookupFactualVocabulary(projection, subjectId, ids) {
  const requestedVocabularyIds = [...new Set(ids)].sort();
  const unknownVocabularyIds = []; const records = new Map();
  for (const id of requestedVocabularyIds) {
    const entry = projection.byId.get(id);
    if (!entry) { unknownVocabularyIds.push(id); continue; }
    if (!records.has(entry.recordId)) records.set(entry.recordId, {
      recordId: entry.recordId, subjectId, capturedAt: entry.capturedAt, confirmedAt: entry.confirmedAt, evidence: [], nodes: []
    });
    const record = records.get(entry.recordId);
    record.evidence.push(entry.edge);
    for (const node of entry.nodes) if (!record.nodes.some((existing) => existing.id === node.id)) record.nodes.push(node);
  }
  return structuredClone({ subjectId, vocabularyVersion: projection.version, requestedVocabularyIds, unknownVocabularyIds, records: [...records.values()] });
}
