const SUBJECT_FORMAT = {
  name: 'companion_subject_resolution', strict: true,
  schema: { type: 'object', additionalProperties: false, required: ['status', 'subject', 'reason'], properties: {
    status: { enum: ['resolved', 'probable', 'ambiguous'] },
    subject: { anyOf: [{ type: 'null' }, { type: 'object', additionalProperties: false, required: ['id', 'type', 'label'], properties: { id: { type: 'string' }, type: { type: 'string' }, label: { type: 'string' } } }] },
    reason: { type: 'string' }
  } }
};

const ITEMS_FORMAT = {
  name: 'companion_semantic_items', strict: true,
  schema: { type: 'object', additionalProperties: false, required: ['items'], properties: { items: { type: 'array', items: {
    type: 'object', additionalProperties: false, required: ['id', 'kind', 'subject', 'predicate', 'value', 'unit', 'condition', 'provenance', 'evidence'], properties: {
      id: { type: 'string' }, kind: { enum: ['entity', 'claim', 'measurement', 'event', 'relationship', 'hypothesis'] }, subject: { type: 'string' }, predicate: { type: 'string' }, value: { type: ['string', 'number', 'boolean'] }, unit: { type: ['string', 'null'] }, condition: { type: ['string', 'null'] }, provenance: { enum: ['observed', 'measured', 'reported', 'speaker_inference', 'system_inference'] }, evidence: { type: 'array', minItems: 1, items: { type: 'string' } }
    }
  } } } }
};

function outputText(body) {
  const text = body.output?.flatMap((item) => item.content ?? []).find((item) => item.type === 'output_text')?.text;
  if (!text) throw new Error('The semantic provider returned no structured output.');
  return text;
}

function createStructuredCall({ apiKey, model, fetchImpl, timeoutMs, reasoningEffort }) {
  if (!apiKey) throw new Error('Semantic extraction is not configured.');
  return async (input, format) => {
    const response = await fetchImpl('https://api.openai.com/v1/responses', { method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model, input, reasoning: { effort: reasoningEffort }, text: { format: { type: 'json_schema', ...format } } }), signal: AbortSignal.timeout(timeoutMs) });
    if (!response.ok) { const error = new Error(`Semantic provider request failed (${response.status}).`); error.providerStatus = response.status; throw error; }
    return JSON.parse(outputText(await response.json()));
  };
}

export function createOpenAISubjectDetector({ apiKey, model = 'gpt-5-mini', fetchImpl = fetch, timeoutMs = 25000, reasoningEffort = 'minimal' }) {
  const call = createStructuredCall({ apiKey, model, fetchImpl, timeoutMs, reasoningEffort });
  return ({ rawText, activeSubject, existingSubjects }) => call(`Identify only the primary enduring subject of RAW_TEXT. Do not extract claims, measurements or semantic items. Reuse ACTIVE_SUBJECT only when compatible. If multiple subjects are plausible, return ambiguous with subject null. Use a stable lowercase kebab-case id.\nACTIVE_SUBJECT: ${JSON.stringify(activeSubject)}\nEXISTING_SUBJECTS: ${JSON.stringify(existingSubjects)}\nRAW_TEXT:\n${rawText}`, SUBJECT_FORMAT);
}

export function createOpenAISemanticBuilder({ apiKey, model = 'gpt-5-mini', fetchImpl = fetch, timeoutMs = 45000, reasoningEffort = 'minimal' }) {
  const call = createStructuredCall({ apiKey, model, fetchImpl, timeoutMs, reasoningEffort });
  return async ({ rawText, confirmedSubject }) => {
    const result = await call(`Build semantic memory only for the already human-confirmed subject. Never resolve, replace or rename the subject. Extract only information supported by RAW_TEXT. Evidence strings must be exact contiguous excerpts. Never invent missing values. Every item subject must equal CONFIRMED_SUBJECT.id. Use stable snake_case predicates. Provenance: observed for direct observation, measured for instrument values, reported for attributed information, speaker_inference for explicit human interpretation, system_inference only when unavoidable.\nCONFIRMED_SUBJECT: ${JSON.stringify(confirmedSubject)}\nRAW_TEXT:\n${rawText}`, ITEMS_FORMAT);
    return result.items;
  };
}
