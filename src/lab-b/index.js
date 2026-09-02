import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { answers, dryIngest, needKeys, questions, records, SUBJECT_ID } from './fixtures.js';

export const NODE_TYPES = ['concept', 'property', 'value', 'procedure', 'assertion', 'inference', 'composition'];
export const EDGE_TYPES = ['about', 'has_property', 'asserts_property', 'has_value', 'obtained_through', 'targets', 'subject', 'predicate', 'object', 'supported_by', 'derived_from', 'composed_from'];
export const PROVENANCE = ['observed', 'measured', 'reported', 'speaker_inference', 'system_inference'];

export function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
  return value;
}
export const stableJson = (value) => `${JSON.stringify(canonical(value), null, 2)}\n`;

function sameNode(a, b) {
  const strip = ({ sourceRecordIds: _sources, ...rest }) => canonical(rest);
  return JSON.stringify(strip(a)) === JSON.stringify(strip(b));
}

export function validateIngestion(record, output, existingGraph = { nodes: [], edges: [] }) {
  const errors = []; const warnings = []; const allIds = new Set([...existingGraph.nodes.map((n) => n.id), ...output.nodes.map((n) => n.id)]);
  const local = new Set();
  for (const node of output.nodes) {
    if (!NODE_TYPES.includes(node.type)) errors.push(`unsupported node type: ${node.type}`);
    if (local.has(node.id)) errors.push(`duplicate node id: ${node.id}`); local.add(node.id);
    if (node.provenance && !PROVENANCE.includes(node.provenance)) errors.push(`unsupported provenance: ${node.provenance}`);
    for (const evidence of node.evidence ?? []) {
      if (evidence.recordId !== record.id || !record.rawText.includes(evidence.quote)) errors.push(`non-literal evidence: ${node.id}`);
    }
    if (node.type === 'inference' && !(node.evidence?.length || output.edges.some((e) => e.from === node.id && ['supported_by', 'derived_from'].includes(e.type)))) errors.push(`unsupported inference: ${node.id}`);
    const prior = existingGraph.nodes.find((candidate) => candidate.id === node.id); if (prior && !sameNode(prior, node)) errors.push(`incompatible node id: ${node.id}`);
  }
  for (const edge of output.edges) {
    if (!EDGE_TYPES.includes(edge.type)) errors.push(`unsupported edge type: ${edge.type}`);
    if (!allIds.has(edge.from) || !allIds.has(edge.to)) errors.push(`broken edge: ${edge.id}`);
  }
  for (const node of output.nodes.filter((n) => n.type === 'composition')) if (output.edges.filter((e) => e.from === node.id && e.type === 'composed_from').length < 2) errors.push(`composition has fewer than two parts: ${node.id}`);
  const connected = new Set(output.edges.flatMap((edge) => [edge.from, edge.to]));
  for (const node of output.nodes) if (!connected.has(node.id)) warnings.push(`isolated node: ${node.id}`);
  return { valid: errors.length === 0, errors, warnings };
}

export function mergeGraph(graph, delta) {
  const nodes = new Map(graph.nodes.map((node) => [node.id, structuredClone(node)]));
  for (const node of delta.nodes) {
    const prior = nodes.get(node.id);
    nodes.set(node.id, prior ? { ...prior, sourceRecordIds: [...new Set([...(prior.sourceRecordIds ?? []), ...(node.sourceRecordIds ?? [])])].sort() } : structuredClone(node));
  }
  const edges = new Map(graph.edges.map((edge) => [edge.id, structuredClone(edge)])); for (const edge of delta.edges) edges.set(edge.id, structuredClone(edge));
  return { subjectId: SUBJECT_ID, nodes: [...nodes.values()].sort((a, b) => a.id.localeCompare(b.id)), edges: [...edges.values()].sort((a, b) => a.id.localeCompare(b.id)) };
}

export function projectVocabulary(graph, version = 0) {
  const buckets = { concepts: [], properties: [], procedures: [], predicates: [], compositions: [] };
  for (const node of graph.nodes) {
    if (!node.key) continue;
    const entry = { nodeId: node.id, key: node.key };
    if (node.vocabularyRole === 'predicate') buckets.predicates.push(entry);
    else if (node.type === 'concept') buckets.concepts.push(entry);
    else if (node.type === 'property') buckets.properties.push(entry);
    else if (node.type === 'procedure') buckets.procedures.push(entry);
    else if (node.type === 'composition') buckets.compositions.push(entry);
  }
  for (const entries of Object.values(buckets)) entries.sort((a, b) => a.key.localeCompare(b.key));
  return { subjectId: graph.subjectId, version, ...buckets };
}

export function diffVocabulary(before, after, toVersion) {
  const added = {}; const removed = {};
  for (const bucket of ['concepts', 'properties', 'procedures', 'predicates', 'compositions']) {
    const oldIds = new Set(before[bucket].map((entry) => entry.nodeId)); const newIds = new Set(after[bucket].map((entry) => entry.nodeId));
    added[bucket] = after[bucket].filter((entry) => !oldIds.has(entry.nodeId)); removed[bucket] = before[bucket].filter((entry) => !newIds.has(entry.nodeId)).map((entry) => entry.nodeId);
  }
  return { fromVersion: before.version, toVersion, added, removed };
}

export function applyDelta(vocabulary, delta) {
  if (vocabulary.version !== delta.fromVersion) throw new Error('vocabulary delta version mismatch');
  const next = structuredClone(vocabulary);
  for (const bucket of Object.keys(delta.added)) {
    const removed = new Set(delta.removed[bucket]); next[bucket] = next[bucket].filter((entry) => !removed.has(entry.nodeId));
    next[bucket].push(...structuredClone(delta.added[bucket])); next[bucket].sort((a, b) => a.key.localeCompare(b.key));
  }
  next.version = delta.toVersion; return next;
}

export function planQuestion(question, vocabulary, context) {
  const keys = needKeys[question.id]; const known = new Set(context.knownNodeIds); const needs = []; const alreadyCovered = []; const unsupportedNeeds = [];
  for (const [index, key] of keys.entries()) {
    const entry = vocabulary.predicates.find((candidate) => candidate.key === key);
    if (!entry) { unsupportedNeeds.push({ description: key, reason: 'concept_not_available' }); continue; }
    const assertion = [...context.fullGraph.nodes].find((node) => node.key === key && ['assertion', 'inference'].includes(node.type));
    const id = `${question.id}-need-${index + 1}`;
    if (assertion && known.has(assertion.id)) alreadyCovered.push({ needId: id, knownNodeIds: [assertion.id] });
    else needs.push({ id, anchor: { keys: [key] }, find: { nodeTypes: ['assertion', 'inference'] } });
  }
  return { subjectId: SUBJECT_ID, vocabularyVersion: vocabulary.version, needs, alreadyCovered, unsupportedNeeds };
}

export function executeNeedPackage(graph, pkg) {
  const matchedNeeds = {}; const unmatchedNeeds = []; const matched = [];
  for (const need of pkg.needs) {
    const keys = need.anchor?.keys ?? []; const ids = graph.nodes.filter((node) => keys.includes(node.key) && need.find.nodeTypes.includes(node.type)).map((node) => node.id).sort();
    matchedNeeds[need.id] = ids; if (!ids.length) unmatchedNeeds.push(need.id); matched.push(...ids);
  }
  const matchedNodeIds = [...new Set(matched)]; const selected = new Set(matchedNodeIds);
  const matchedEdges = graph.edges.filter((edge) => selected.has(edge.from) || selected.has(edge.to)).sort((a, b) => a.id.localeCompare(b.id));
  return { matchedNeeds, unmatchedNeeds, matchedNodeIds, matchedEdges };
}

export function buildSemanticClosure(graph, matched, knownNodeIds = new Set(), vocabularyVersion = 0) {
  const includeNodes = new Set(matched.matchedNodeIds); const includeEdges = new Set(); let changed = true;
  while (changed) {
    changed = false;
    for (const edge of graph.edges) {
      if (includeNodes.has(edge.from) && ['about', 'subject', 'predicate', 'object', 'has_property', 'has_value', 'obtained_through', 'supported_by', 'derived_from', 'composed_from'].includes(edge.type)) {
        includeEdges.add(edge.id); if (!includeNodes.has(edge.to)) { includeNodes.add(edge.to); changed = true; }
      }
    }
  }
  const supportingNodeIds = [...includeNodes].filter((id) => !matched.matchedNodeIds.includes(id)).sort();
  const transportNodes = [...includeNodes].filter((id) => !knownNodeIds.has(id)); const transport = new Set(transportNodes);
  const edges = graph.edges.filter((edge) => includeEdges.has(edge.id) && (transport.has(edge.from) || transport.has(edge.to)));
  return { subjectId: graph.subjectId, vocabularyVersion, matchedNeeds: matched.matchedNeeds, unmatchedNeeds: matched.unmatchedNeeds, matchedNodeIds: matched.matchedNodeIds, supportingNodeIds, graph: { subjectId: graph.subjectId, nodes: graph.nodes.filter((node) => transport.has(node.id)), edges }, evidenceDelta: knownNodeIds.size > 0 };
}

async function writeJson(path, value) { await mkdir(join(path, '..'), { recursive: true }); await writeFile(path, stableJson(value)); }
function tokenEstimate(value) { return { value: Math.ceil(stableJson(value).length / 4), source: 'estimated' }; }

export async function runLab({ outputRoot = 'runs', runId = `lab-b-${Date.now()}`, overwrite = false } = {}) {
  const runDir = join(outputRoot, runId);
  try { await readFile(join(runDir, 'summary.json')); if (!overwrite) throw new Error(`run already exists: ${runId}`); } catch (error) { if (!error.message.includes('ENOENT') && !overwrite) throw error; }
  await mkdir(runDir, { recursive: true }); await writeJson(join(runDir, '00-input-records.json'), { subject: { id: SUBJECT_ID }, records });
  await writeJson(join(runDir, '00-config.json'), { protocolVersion: '0.1.1', provider: 'dry-agent', runId });
  let graph = { subjectId: SUBJECT_ID, nodes: [], edges: [] }; let vocabulary = projectVocabulary(graph, 0); const deltas = []; const validations = [];
  await writeJson(join(runDir, '02-vocabulary', 'v0.json'), vocabulary);
  for (const record of records) {
    const input = { subjectId: SUBJECT_ID, recordId: record.id, rawText: record.rawText, existingVocabulary: vocabulary, existingGraphSummary: { nodeCount: graph.nodes.length, edgeCount: graph.edges.length, keys: graph.nodes.flatMap((n) => n.key ? [n.key] : []) } };
    const output = dryIngest(record); const validation = validateIngestion(record, output, graph); validations.push(validation);
    await writeJson(join(runDir, '01-ingestion', `${record.id}.llm-input.json`), { metadata: { model: 'dry-agent', parameters: {}, timestamp: new Date().toISOString(), usage: null }, input });
    await writeJson(join(runDir, '01-ingestion', `${record.id}.llm-output.json`), { metadata: { model: 'dry-agent', parameters: {}, timestamp: new Date().toISOString(), usage: null }, output });
    await writeJson(join(runDir, '01-ingestion', `${record.id}.validation.json`), validation); if (!validation.valid) throw new Error(`ingestion failed: ${record.id}`);
    graph = mergeGraph(graph, output); await writeJson(join(runDir, '01-ingestion', `${record.id}.graph.json`), graph);
    const projected = projectVocabulary(graph, vocabulary.version); const delta = diffVocabulary(vocabulary, projected, vocabulary.version + 1); deltas.push(delta); vocabulary = { ...projected, version: delta.toVersion };
    await writeJson(join(runDir, '02-vocabulary', `v${vocabulary.version}.json`), vocabulary);
  }
  await writeJson(join(runDir, '01-ingestion', 'merged.graph.json'), graph); await writeJson(join(runDir, '02-vocabulary', 'deltas.json'), deltas);
  const reconstructed = deltas.reduce(applyDelta, projectVocabulary({ subjectId: SUBJECT_ID, nodes: [], edges: [] }, 0));
  const context = { subjectId: SUBJECT_ID, knownVocabularyVersion: 0, knownNodeIds: [], knownEdgeIds: [], knownEvidenceGraph: { subjectId: SUBJECT_ID, nodes: [], edges: [] }, satisfiedNeedIds: [], interactionCount: 0, fullGraph: graph };
  const queryMetrics = [];
  for (const [index, question] of questions.entries()) {
    const dir = join(runDir, `${String(index + 3).padStart(2, '0')}-${question.id}`); const before = { ...context, fullGraph: undefined };
    const queryPackage = question.mode === 'cold' ? { protocolVersion: '0.1.1', subjectId: SUBJECT_ID, question: question.text, vocabulary } : { protocolVersion: '0.1.1', subjectId: SUBJECT_ID, question: question.text, vocabularyVersion: context.knownVocabularyVersion, ...(context.knownVocabularyVersion < vocabulary.version ? { vocabularyDelta: deltas.slice(context.knownVocabularyVersion) } : {}) };
    const needPackage = planQuestion(question, vocabulary, context); const matched = executeNeedPackage(graph, needPackage); const replay = executeNeedPackage(graph, needPackage);
    const evidence = buildSemanticClosure(graph, matched, new Set(context.knownNodeIds), vocabulary.version); const replayEvidence = buildSemanticClosure(graph, replay, new Set(context.knownNodeIds), vocabulary.version);
    const reused = needPackage.alreadyCovered.flatMap((item) => item.knownNodeIds); const newIds = evidence.graph.nodes.map((node) => node.id);
    const metrics = { questionId: question.id, mode: question.mode, requestedNeedCount: needPackage.needs.length, alreadyCoveredNeedCount: needPackage.alreadyCovered.length, unsupportedNeedCount: needPackage.unsupportedNeeds.length, matchedNeedCount: Object.values(matched.matchedNeeds).filter((ids) => ids.length).length, unmatchedNeedCount: matched.unmatchedNeeds.length, matchedNodeCount: matched.matchedNodeIds.length, supportingNodeCount: evidence.supportingNodeIds.length, evidenceDeltaNodeCount: newIds.length, reusedKnownNodeCount: reused.length, evidenceReuseRatio: reused.length / Math.max(1, reused.length + newIds.length), closureExpansionRatio: evidence.supportingNodeIds.length / Math.max(1, matched.matchedNodeIds.length), deterministicReplayEqual: stableJson(matched) === stableJson(replay) && stableJson(evidence) === stableJson(replayEvidence), answerExpectationPass: question.id === 'q5' ? needPackage.unsupportedNeeds.length > 0 && newIds.length === 0 : Object.values(matched.matchedNeeds).every((ids) => ids.length > 0), payloadTokens: { queryPackage: tokenEstimate(queryPackage), needPackage: tokenEstimate(needPackage), newEvidenceTransferred: tokenEstimate(evidence.graph), answer: tokenEstimate(answers[question.id]) } };
    for (const [name, value] of Object.entries({ 'query-package.json': queryPackage, 'working-context.before.json': before, 'need-package.json': needPackage, 'matched-graph.json': matched, 'evidence-package.json': evidence, 'agent-answer.json': { text: answers[question.id] }, 'metrics.json': metrics })) await writeJson(join(dir, name), value);
    const nodeMap = new Map(context.knownEvidenceGraph.nodes.map((n) => [n.id, n])); for (const node of evidence.graph.nodes) nodeMap.set(node.id, node);
    const edgeMap = new Map(context.knownEvidenceGraph.edges.map((e) => [e.id, e])); for (const edge of evidence.graph.edges) edgeMap.set(edge.id, edge);
    context.knownNodeIds = [...new Set([...context.knownNodeIds, ...newIds])].sort(); context.knownEdgeIds = [...new Set([...context.knownEdgeIds, ...evidence.graph.edges.map((e) => e.id)])].sort(); context.knownEvidenceGraph = { subjectId: SUBJECT_ID, nodes: [...nodeMap.values()], edges: [...edgeMap.values()] }; context.satisfiedNeedIds.push(...Object.keys(matched.matchedNeeds)); context.knownVocabularyVersion = vocabulary.version; context.interactionCount += 1;
    await writeJson(join(dir, 'working-context.after.json'), { ...context, fullGraph: undefined }); queryMetrics.push(metrics);
  }
  const expectedKeys = Object.values(needKeys).flat().filter((key) => key !== 'coolant_temperature'); const graphKeys = new Set(graph.nodes.map((node) => node.key));
  const golden = { expectedConceptsFound: expectedKeys.filter((key) => graphKeys.has(key)), expectedKnowledgeMissing: expectedKeys.filter((key) => !graphKeys.has(key)), unsupportedAdditions: [], literalQuotesValid: validations.every((v) => v.valid) };
  await writeJson(join(runDir, '08-golden-comparison.json'), golden);
  const pass = validations.every((v) => v.valid) && reconstructed.version === vocabulary.version && golden.expectedKnowledgeMissing.length === 0 && queryMetrics.every((m) => m.deterministicReplayEqual && m.answerExpectationPass);
  const summary = { protocolVersion: '0.1.1', runId, scope: 'dry-agent-milestone', status: pass ? 'PASS' : 'FAIL', fullSpecificationStatus: 'NOT_EVALUATED', errors: validations.flatMap((v) => v.errors), warnings: validations.flatMap((v) => v.warnings), limitations: ['No live LLM provider path was executed.', 'JSON Schema files are versioned references; runtime validation is dependency-free and explicit.', 'Golden evaluation covers required keys and literal evidence, not general semantic equivalence.'], ingestion: { records: records.length, graphNodes: graph.nodes.length, graphEdges: graph.edges.length, vocabularyVersion: vocabulary.version, deltasReconstructFinal: stableJson(reconstructed) === stableJson(vocabulary) }, questions: queryMetrics, tokenAccounting: { source: 'estimated', note: 'Dry-agent payload estimates are not billed API usage.' } };
  await writeJson(join(runDir, 'summary.json'), summary); return { runDir, summary };
}
