import { createOpenAISemanticBuilder, createOpenAISubjectDetector } from '../../src/providers/openai-semantic.js';
import { processSemanticRequest } from '../../src/providers/semantic-endpoint.js';
export default async (request) => {
  const headers = Object.fromEntries(request.headers.entries());
  const options = { apiKey: process.env.OPENAI_API_KEY, model: process.env.COMPANION_SEMANTIC_MODEL || 'gpt-5-mini' };
  const result = await processSemanticRequest({ method: request.method, headers, bodyText: await request.text(), accessCode: process.env.COMPANION_DEMO_ACCESS_CODE, detectSubject: createOpenAISubjectDetector(options), buildSemantics: createOpenAISemanticBuilder(options) });
  return Response.json(result.body, { status: result.status, headers: { 'Cache-Control': 'no-store' } });
};
