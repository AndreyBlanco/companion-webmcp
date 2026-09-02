export function createRemoteSemanticExtractor({ getAccessCode, fetchImpl = fetch } = {}) {
  return async (input) => {
    const response = await fetchImpl('/api/semantic-extract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Companion-Demo-Code': getAccessCode?.() ?? '' },
      body: JSON.stringify(input)
    });
    let body;
    try { body = await response.json(); } catch { body = {}; }
    if (!response.ok) throw new Error(body.error ?? `Semantic extraction failed (${response.status}).`);
    return body;
  };
}

export async function selectAllConfirmedEvidence({ records }) {
  return {
    interpretation: 'Deterministic subject-scoped lookup. The calling agent evaluates relevance and sufficiency.',
    recordIds: records.map((record) => record.recordId)
  };
}
