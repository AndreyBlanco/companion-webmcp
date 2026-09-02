import { createOpenAISemanticExtractor } from '../../src/providers/openai-semantic.js';
import { processSemanticRequest } from '../../src/providers/semantic-endpoint.js';

export default async (request) => {
  const headers = Object.fromEntries(request.headers.entries());
  const result = await processSemanticRequest({
    method: request.method,
    headers,
    bodyText: await request.text(),
    accessCode: process.env.COMPANION_DEMO_ACCESS_CODE,
    extract: async (input) => createOpenAISemanticExtractor({ apiKey: process.env.OPENAI_API_KEY, model: process.env.COMPANION_SEMANTIC_MODEL || 'gpt-5-mini' })(input)
  });
  return Response.json(result.body, { status: result.status, headers: { 'Cache-Control': 'no-store' } });
};
