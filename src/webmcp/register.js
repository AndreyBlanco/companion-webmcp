export const MEMORY_TOOL_NAME = 'query_companion_memory';
export const VOCABULARY_TOOL_NAME = 'get_companion_vocabulary';

export function createVocabularyTool(capabilities) {
  return {
    name: VOCABULARY_TOOL_NAME,
    title: 'Get Companion factual vocabulary',
    description: 'Returns reusable, versioned vocabulary derived deterministically from stored factual relations for one subject. Inspect labels and choose relevantVocabularyIds yourself for query_companion_memory. Companion does not interpret your question, plan retrieval, evaluate sufficiency, or automatically refresh vocabulary. Source attribution is not objective truth.',
    inputSchema: { type: 'object', properties: { subjectId: { type: 'string', description: 'Exact subject identifier; defaults to the current active subject when omitted.' } }, additionalProperties: false },
    annotations: { readOnlyHint: true, untrustedContentHint: true },
    execute: capabilities.getVocabulary
  };
}

export function createMemoryTool(capabilities) {
  return {
    name: MEMORY_TOOL_NAME,
    title: 'Look up selected Companion vocabulary IDs',
    description: 'The external agent must choose relevantVocabularyIds from reusable vocabulary. Returns only those stored factual relations and their endpoint nodes/source citations by exact ID; no model call, question interpretation, ranking, automatic expansion, vocabulary refresh or sufficiency decision. Unknown IDs are listed explicitly. Empty IDs return no evidence. SOURCE_EXPLICIT and SOURCE_STRONGLY_IMPLIED preserve attribution, not objective truth; AGENT_INFERRED is excluded. The agent owns subsequent reasoning.',
    inputSchema: {
      type: 'object',
      properties: {
        subjectId: { type: 'string', minLength: 1, description: 'Exact subject identifier from the vocabulary.' },
        relevantVocabularyIds: { type: 'array', items: { type: 'string', minLength: 1 }, description: 'Opaque vocabulary IDs selected by the external agent. Duplicates are collapsed; an empty array requests no evidence.' }
      },
      required: ['subjectId', 'relevantVocabularyIds'],
      additionalProperties: false
    },
    annotations: { readOnlyHint: true, untrustedContentHint: true },
    execute: capabilities.queryMemory
  };
}

export async function registerWebMcp(modelContext, capabilities) {
  if (!modelContext?.registerTool) return { available: false, reason: 'WebMCP is unavailable; the application remains usable.' };
  await modelContext.registerTool(createVocabularyTool(capabilities));
  await modelContext.registerTool(createMemoryTool(capabilities));
  return { available: true, toolName: MEMORY_TOOL_NAME };
}
