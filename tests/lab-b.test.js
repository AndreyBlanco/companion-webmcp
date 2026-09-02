import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { applyDelta, buildSemanticClosure, diffVocabulary, executeNeedPackage, mergeGraph, planQuestion, projectVocabulary, runLab, stableJson, validateIngestion } from '../src/lab-b/index.js';
import { dryIngest, questions, records, SUBJECT_ID } from '../src/lab-b/fixtures.js';

function ingested() {
  let graph = { subjectId: SUBJECT_ID, nodes: [], edges: [] };
  for (const record of records) { const output = dryIngest(record); assert.equal(validateIngestion(record, output, graph).valid, true); graph = mergeGraph(graph, output); }
  return graph;
}

test('dry ingestion validates literal quotes and rejects a fabricated quote atomically', () => {
  const output = dryIngest(records[0]); assert.equal(validateIngestion(records[0], output).valid, true);
  output.nodes.find((node) => node.evidence).evidence[0].quote = 'fabricated';
  assert.match(validateIngestion(records[0], output).errors.join('\n'), /non-literal evidence/);
});

test('vocabulary versions and deltas reconstruct the final projection', () => {
  let graph = { subjectId: SUBJECT_ID, nodes: [], edges: [] }; let vocabulary = projectVocabulary(graph, 0);
  for (const record of records) { graph = mergeGraph(graph, dryIngest(record)); const projection = projectVocabulary(graph, vocabulary.version); vocabulary = applyDelta(vocabulary, diffVocabulary(vocabulary, projection, vocabulary.version + 1)); }
  assert.equal(vocabulary.version, 4); assert.deepEqual(vocabulary, projectVocabulary(graph, 4));
});

test('retrieval and closure are deterministic and closure includes predicates and subject', () => {
  const graph = ingested(); const vocabulary = projectVocabulary(graph, 4); const context = { knownNodeIds: [], fullGraph: graph };
  const pkg = planQuestion(questions[0], vocabulary, context); const a = executeNeedPackage(graph, pkg); const b = executeNeedPackage(graph, pkg);
  assert.equal(stableJson(a), stableJson(b)); const closure = buildSemanticClosure(graph, a);
  assert.ok(closure.graph.nodes.some((node) => node.id === SUBJECT_ID)); assert.ok(closure.graph.nodes.some((node) => node.vocabularyRole === 'predicate'));
  assert.equal(closure.graph.nodes.some((node) => node.key === 'injector_2_stuck_open'), false, 'closure must not pull neighboring facts through the subject');
});

test('warm planning asks only for missing evidence and negative control is unsupported', () => {
  const graph = ingested(); const vocabulary = projectVocabulary(graph, 4);
  const q1Node = graph.nodes.find((node) => node.key === 'oil_level_above_maximum' && node.type === 'assertion');
  const warm = planQuestion(questions[1], vocabulary, { knownNodeIds: [q1Node.id], fullGraph: graph });
  assert.ok(warm.alreadyCovered.some((need) => need.knownNodeIds.includes(q1Node.id))); assert.ok(warm.needs.length > 0);
  const negative = planQuestion(questions[4], vocabulary, { knownNodeIds: [], fullGraph: graph }); assert.equal(negative.unsupportedNeeds.length, 1); assert.equal(negative.needs.length, 0);
});

test('end-to-end dry-agent run writes a PASS summary and all five question checkpoints', async () => {
  const root = await mkdtemp(join(tmpdir(), 'companion-lab-b-')); const { runDir, summary } = await runLab({ outputRoot: root, runId: 'test' });
  assert.equal(summary.status, 'PASS'); assert.equal(summary.questions.length, 5); assert.equal(summary.questions[4].unsupportedNeedCount, 1);
  assert.ok(summary.questions[1].requestedNeedCount > 0); assert.ok(summary.questions[1].alreadyCoveredNeedCount > 0); assert.ok(summary.questions[1].evidenceDeltaNodeCount > 0);
  for (const [index, question] of questions.entries()) JSON.parse(await readFile(join(runDir, `${String(index + 3).padStart(2, '0')}-${question.id}`, 'evidence-package.json'), 'utf8'));
});
