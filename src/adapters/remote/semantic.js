function createRemoteOperation({ operation, getAccessCode, fetchImpl = fetch }) {
  return async (input) => {
    const response = await fetchImpl('/api/semantic-extract', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Companion-Demo-Code': getAccessCode?.() ?? '' }, body: JSON.stringify({ operation, ...input }) });
    let body; try { body = await response.json(); } catch { body = {}; }
    if (!response.ok) throw new Error(body.error ?? `Semantic operation failed (${response.status}).`);
    return body;
  };
}
export const createRemoteSubjectDetector = (options) => createRemoteOperation({ operation: 'detect_subject', ...options });
export function createRemoteSemanticBuilder(options) { const operation = createRemoteOperation({ operation: 'build_semantics', ...options }); return async (input) => (await operation(input)).items; }
export async function selectAllConfirmedEvidence({ records }) { return { interpretation: 'Deterministic subject-scoped lookup. The calling agent evaluates relevance and sufficiency.', recordIds: records.filter((record) => record.semanticStatus === 'ready').map((record) => record.recordId) }; }
