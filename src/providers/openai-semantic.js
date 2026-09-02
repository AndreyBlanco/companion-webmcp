const EXTRACTION_SCHEMA = {
  name: 'companion_semantic_delta',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['subjectResolution', 'items'],
    properties: {
      subjectResolution: {
        type: 'object',
        additionalProperties: false,
        required: ['status', 'subject', 'reason'],
        properties: {
          status: { enum: ['resolved', 'probable', 'ambiguous'] },
          subject: {
            anyOf: [
              { type: 'null' },
              {
                type: 'object',
                additionalProperties: false,
                required: ['id', 'type', 'label'],
                properties: {
                  id: { type: 'string' },
                  type: { type: 'string' },
                  label: { type: 'string' }
                }
              }
            ]
          },
          reason: { type: 'string' }
        }
      },
      items: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['id', 'kind', 'subject', 'predicate', 'value', 'unit', 'condition', 'provenance', 'evidence'],
          properties: {
            id: { type: 'string' },
            kind: { enum: ['entity', 'claim', 'measurement', 'event', 'relationship', 'hypothesis'] },
            subject: { type: 'string' },
            predicate: { type: 'string' },
            value: { type: ['string', 'number', 'boolean'] },
            unit: { type: ['string', 'null'] },
            condition: { type: ['string', 'null'] },
            provenance: { enum: ['observed', 'measured', 'reported', 'speaker_inference', 'system_inference'] },
            evidence: { type: 'array', minItems: 1, items: { type: 'string' } }
          }
        }
      }
    }
  }
};

function prompt({ rawText, capturedAt, activeSubject, existingSubjects }) {
  return `You create a domain-neutral semantic draft from Spanish or English natural language.
Extract only information supported by RAW_TEXT. Evidence strings must be exact, contiguous excerpts from RAW_TEXT. Never invent a missing value.
Resolve the subject to the primary enduring entity the memory is about. Reuse ACTIVE_SUBJECT only when compatible. If more than one subject is plausible, return ambiguous with subject null and no items.
Use stable lowercase kebab-case subject ids and stable snake_case predicates. Every item subject must equal the resolved subject id.
Provenance describes the human source: observed for direct observation, measured for an instrument value, reported for attributed or stated information, speaker_inference for an explicit human interpretation, and system_inference only for structure that cannot be represented otherwise. Do not add diagnostic or causal conclusions that the speaker did not state.
Return only the structured semantic delta.
CAPTURED_AT: ${capturedAt}
ACTIVE_SUBJECT: ${JSON.stringify(activeSubject)}
EXISTING_SUBJECTS: ${JSON.stringify(existingSubjects)}
RAW_TEXT:
${rawText}`;
}

function outputText(body) {
  const text = body.output?.flatMap((item) => item.content ?? []).find((item) => item.type === 'output_text')?.text;
  if (!text) throw new Error('The semantic provider returned no structured output.');
  return text;
}

export function createOpenAISemanticExtractor({ apiKey, model = 'gpt-5-mini', fetchImpl = fetch, timeoutMs = 25000 }) {
  if (!apiKey) throw new Error('Semantic extraction is not configured.');
  return async (input) => {
    const response = await fetchImpl('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, input: prompt(input), text: { format: { type: 'json_schema', ...EXTRACTION_SCHEMA } } }),
      signal: AbortSignal.timeout(timeoutMs)
    });
    if (!response.ok) {
      const error = new Error(`Semantic provider request failed (${response.status}).`);
      error.providerStatus = response.status;
      throw error;
    }
    return JSON.parse(outputText(await response.json()));
  };
}
