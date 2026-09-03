// Invented for Checkpoint A by Codex; repository-authored MIT fixture, no real source.
export const authoritySubject = { id: 'synthetic-device', type: 'device', label: 'Synthetic Device' };
export const authorityRawText = 'Synthetic Device has a blue cover. Its switch is warm. I think the fan may be worn.';
export function authorityBuild(recordId = 'record-a', subjectId = authoritySubject.id) {
  const nodes = []; const candidates = []; const stageB = [];
  const cases = [
    ['SOURCE_EXPLICIT', 'observed', 'Synthetic Device has a blue cover.', 'cover', 'blue'],
    ['SOURCE_STRONGLY_IMPLIED', 'observed', 'Its switch is warm.', 'Synthetic Device', 'warm switch'],
    ['SOURCE_EXPLICIT', 'speaker_inference', 'I think the fan may be worn.', 'speaker interpretation', 'the fan may be worn'],
    ['AGENT_INFERRED', null, 'Its switch is warm.', 'warm switch', 'possible electrical fault']
  ];
  for (const [index, [epistemicStatus, provenance, quote, fromLabel, toLabel]] of cases.entries()) {
    const sourceEvidence = [{ recordId, quote }]; const from = `n${index}a`; const to = `n${index}b`;
    nodes.push({ id: from, type: 'concept', label: fromLabel, sourceEvidence: structuredClone(sourceEvidence) }, { id: to, type: 'property', label: toLabel, sourceEvidence: structuredClone(sourceEvidence) });
    const edge = { id: `item_${index + 1}`, from, to, type: index === 2 ? 'about' : 'has_property', provenance, sourceEvidence };
    candidates.push(edge); stageB.push({ ...structuredClone(edge), epistemicStatus });
  }
  return { recordId, subjectId, stageA: { nodes, candidates, limitations: [] }, stageB };
}
