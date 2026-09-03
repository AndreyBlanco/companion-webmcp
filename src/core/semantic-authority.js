// Repository-authored Checkpoint A contract (Codex); MIT. No Lab B protocol dependency.
export const NODE_TYPES = Object.freeze(['concept', 'property', 'value', 'procedure', 'assertion', 'inference', 'composition']);
export const RELATION_TYPES = Object.freeze(['about', 'has_property', 'asserts_property', 'has_value', 'obtained_through', 'targets', 'subject', 'predicate', 'object', 'supported_by', 'derived_from', 'composed_from']);
export const HUMAN_PROVENANCE = Object.freeze(['observed', 'measured', 'reported', 'speaker_inference']);
export const EPISTEMIC_STATUSES = Object.freeze(['SOURCE_EXPLICIT', 'SOURCE_STRONGLY_IMPLIED', 'AGENT_INFERRED']);

const object = (properties) => ({ type: 'object', additionalProperties: false, required: Object.keys(properties), properties });
const string = { type: 'string', minLength: 1 };
const array = (items, minItems = 0) => ({ type: 'array', items, minItems });
const evidence = array(object({ recordId: string, quote: string }), 1);
const relation = { id: string, from: string, to: string, type: { enum: RELATION_TYPES }, provenance: { enum: [...HUMAN_PROVENANCE, null] }, sourceEvidence: evidence };
export const SEMANTIC_BUILD_SCHEMA = object({
  recordId: string,
  subjectId: string,
  stageA: object({
    nodes: array(object({ id: string, type: { enum: NODE_TYPES }, label: string, sourceEvidence: evidence })),
    candidates: array(object(relation)),
    limitations: array(string)
  }),
  stageB: array(object({ ...relation, epistemicStatus: { enum: EPISTEMIC_STATUSES } }))
});

function fail(code, path) { const error = new TypeError(`${code}: ${path}`); error.code = code; throw error; }

// Checks only the schema keywords used above; this is not a general JSON Schema engine.
function validateShape(value, schema, path = 'build') {
  if (schema.enum) { if (!schema.enum.includes(value)) fail('STRUCTURE_INVALID', path); return; }
  if (schema.type === 'object') {
    if (!value || typeof value !== 'object' || Array.isArray(value)) fail('STRUCTURE_INVALID', path);
    if (Object.keys(value).some((key) => !Object.hasOwn(schema.properties, key))) fail('STRUCTURE_INVALID', path);
    for (const key of schema.required) {
      if (!Object.hasOwn(value, key)) fail('STRUCTURE_INVALID', `${path}.${key}`);
      validateShape(value[key], schema.properties[key], `${path}.${key}`);
    }
  } else if (schema.type === 'array') {
    if (!Array.isArray(value) || value.length < schema.minItems) fail('STRUCTURE_INVALID', path);
    value.forEach((entry, index) => validateShape(entry, schema.items, `${path}[${index}]`));
  } else if (typeof value !== 'string' || !value.trim()) fail('STRUCTURE_INVALID', path);
}

// Whitespace only: collapse runs and trim; never lowercase, paraphrase, or remove punctuation.
export const normalizeSourceSpaces = (text) => text.replace(/\s+/gu, ' ').trim();
function validateEvidence(excerpts, record, path) {
  const source = normalizeSourceSpaces(record.rawText);
  for (const excerpt of excerpts) {
    const quote = normalizeSourceSpaces(excerpt.quote);
    if (excerpt.recordId !== record.recordId || !quote || !source.includes(quote)) fail('GROUNDING_REFERENCE_INVALID', path);
  }
}

function sameRelation(a, b) {
  return ['id', 'from', 'to', 'type', 'provenance'].every((key) => a[key] === b[key]) &&
    a.sourceEvidence.length === b.sourceEvidence.length && a.sourceEvidence.every((entry, index) =>
      entry.recordId === b.sourceEvidence[index].recordId && entry.quote === b.sourceEvidence[index].quote);
}

export function reconcileCandidates(stageA, stageB) {
  const classified = new Map();
  for (const entry of stageB) {
    if (classified.has(entry.id)) fail('CANDIDATE_CORRESPONDENCE_INVALID', 'duplicate Stage B candidate');
    classified.set(entry.id, entry);
  }
  if (classified.size !== stageA.candidates.length) fail('CANDIDATE_CORRESPONDENCE_INVALID', 'candidate count');
  for (const candidate of stageA.candidates) {
    if (!classified.has(candidate.id) || !sameRelation(candidate, classified.get(candidate.id))) fail('CANDIDATE_CORRESPONDENCE_INVALID', 'missing or mutated candidate');
  }
  return stageA.candidates.map((candidate) => classified.get(candidate.id));
}

export function incorporateSemanticBuild(output, record) {
  validateShape(output, SEMANTIC_BUILD_SCHEMA);
  if (output.recordId !== record.recordId || output.subjectId !== record.subjectId) fail('ENTRY_BOUNDARY_INVALID', 'build');
  const ids = new Set();
  for (const entry of [...output.stageA.nodes, ...output.stageA.candidates]) {
    if (ids.has(entry.id)) fail('LOCAL_ID_DUPLICATE', 'Stage A');
    ids.add(entry.id);
  }
  const classified = reconcileCandidates(output.stageA, output.stageB);
  const nodeIds = new Set(output.stageA.nodes.map((node) => node.id));
  for (const node of output.stageA.nodes) validateEvidence(node.sourceEvidence, record, 'node.sourceEvidence');
  for (const edge of classified) {
    if (!nodeIds.has(edge.from) || !nodeIds.has(edge.to)) fail('REFERENCE_INVALID', 'candidate endpoints');
    validateEvidence(edge.sourceEvidence, record, 'candidate.sourceEvidence');
    if (edge.epistemicStatus !== 'AGENT_INFERRED' && edge.provenance === null) fail('STRUCTURE_INVALID', 'source relation requires human provenance');
  }
  if (!classified.length && !output.stageA.limitations.length) fail('STRUCTURE_INVALID', 'empty discovery requires an explicit limitation');

  // Identity uses Companion's record namespace and ordinal, never the model's local ID.
  const nodeMap = new Map(output.stageA.nodes.map((node, index) => [node.id, JSON.stringify([record.recordId, 'node', index + 1])]));
  const edgeMap = new Map(classified.map((edge, index) => [edge.id, JSON.stringify([record.recordId, 'relation', index + 1])]));
  const factual = classified.filter((edge) => edge.epistemicStatus !== 'AGENT_INFERRED');
  const usedNodes = new Set(factual.flatMap((edge) => [edge.from, edge.to]));
  const semanticGraph = {
    nodes: output.stageA.nodes.filter((node) => usedNodes.has(node.id)).map((node) => ({ ...structuredClone(node), id: nodeMap.get(node.id), sourceRecordId: record.recordId })),
    edges: factual.map((edge) => ({ ...structuredClone(edge), id: edgeMap.get(edge.id), from: nodeMap.get(edge.from), to: nodeMap.get(edge.to), sourceRecordId: record.recordId }))
  };
  // This is an explicitly non-factual, session-only audit. Retrieval never returns it.
  const semanticAudit = {
    interpretationVersion: 'checkpoint-a-v1', origin: 'external_model_reasoning',
    stageA: structuredClone(output.stageA), stageB: structuredClone(output.stageB),
    routing: classified.map((edge) => ({ localCandidateId: edge.id, factual: edge.epistemicStatus !== 'AGENT_INFERRED', persistentId: edge.epistemicStatus === 'AGENT_INFERRED' ? null : edgeMap.get(edge.id) }))
  };
  return { semanticGraph, semanticAudit };
}
