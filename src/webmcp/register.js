import { NODE_TYPES } from '../core/semantic-authority.js';

export const MEMORY_TOOL_NAME = 'query_companion_memory';

export function createMemoryTool(capabilities) {
  return {
    name: MEMORY_TOOL_NAME,
    title: 'Query confirmed Companion memory',
    description: 'Returns confirmed source records and validated source-attributed relations for one subject; external inferences are excluded. Source attribution is not objective truth. Use their exact source and semantic evidence to decide relevance, sufficiency, and the answer; do not invent missing information.',
    inputSchema: {
      type: 'object',
      properties: {
        question: { type: 'string', description: 'The agent question, preserved for audit context; lookup remains deterministic and subject-scoped.' },
        subjectId: { type: 'string', description: 'Optional exact subject identifier; defaults to the active subject.' },
        evidenceTypes: { description: 'Optional v0.1 node types; matching relations include both endpoints.', type: 'array', items: { enum: NODE_TYPES } }
      },
      required: ['question'],
      additionalProperties: false
    },
    annotations: { readOnlyHint: true, untrustedContentHint: true },
    execute: capabilities.queryMemory
  };
}

export async function registerWebMcp(modelContext, capabilities) {
  if (!modelContext?.registerTool) return { available: false, reason: 'WebMCP is unavailable; the application remains usable.' };
  await modelContext.registerTool(createMemoryTool(capabilities));
  return { available: true, toolName: MEMORY_TOOL_NAME };
}
