import { SEMANTIC_KINDS } from '../core/semantic-memory.js';

export const MEMORY_TOOL_NAME = 'query_companion_memory';

export function createMemoryTool(capabilities) {
  return {
    name: MEMORY_TOOL_NAME,
    title: 'Query confirmed Companion memory',
    description: 'Returns subject-scoped confirmed evidence records. The calling agent, not this tool, synthesizes an answer.',
    inputSchema: {
      type: 'object',
      properties: {
        question: { type: 'string', description: 'Question used only to select relevant evidence.' },
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
