export const SEARCH_TOOL_NAME = 'search_companion_observations';

export function createSearchTool(capabilities) {
  return {
    name: SEARCH_TOOL_NAME,
    title: 'Search confirmed observations',
    description: 'Search confirmed memory for exactly one synthetic subject and return record IDs as evidence.',
    inputSchema: {
      type: 'object',
      properties: {
        subjectId: { type: 'string', description: 'Exact synthetic subject identifier.' },
        question: { type: 'string', description: 'Question answered only from that subject memory.' }
      },
      required: ['subjectId', 'question'],
      additionalProperties: false
    },
    annotations: { readOnlyHint: true, untrustedContentHint: true },
    execute: capabilities.searchObservations
  };
}

export async function registerWebMcp(modelContext, capabilities) {
  if (!modelContext?.registerTool) return { available: false, reason: 'WebMCP is unavailable; the application remains usable.' };
  await modelContext.registerTool(createSearchTool(capabilities));
  return { available: true, toolName: SEARCH_TOOL_NAME };
}
