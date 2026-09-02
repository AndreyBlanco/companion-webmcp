import { SEMANTIC_KINDS } from '../core/semantic-memory.js';

export const MEMORY_TOOL_NAME = 'query_companion_memory';

export function createMemoryTool(capabilities) {
  return {
    name: MEMORY_TOOL_NAME,
    title: 'Query confirmed Companion memory',
    description: 'Returns all confirmed memory records for one subject. Use their exact source and semantic evidence to decide relevance, sufficiency, and the answer; do not invent missing information.',
    inputSchema: {
      type: 'object',
      properties: {
        question: { type: 'string', description: 'The agent question, preserved for audit context; lookup remains deterministic and subject-scoped.' },
        subjectId: { type: 'string', description: 'Optional exact subject identifier; defaults to the active subject.' },
        evidenceTypes: { type: 'array', items: { enum: SEMANTIC_KINDS } }
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
