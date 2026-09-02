import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { networkInterfaces } from 'node:os';
import { createOpenAITranscriber } from '../providers/openai-transcription.js';
import { createOpenAISemanticBuilder, createOpenAISubjectDetector } from '../providers/openai-semantic.js';
import { MAX_SEMANTIC_BODY_BYTES, processSemanticRequest } from '../providers/semantic-endpoint.js';

const root = fileURLToPath(new URL('..', import.meta.url));
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8' };
const MAX_AUDIO_BYTES = 10 * 1024 * 1024;

async function readBody(request) {
  const chunks = [];
  let total = 0;
  for await (const chunk of request) {
    total += chunk.length;
    if (total > MAX_AUDIO_BYTES) throw new Error('Audio file exceeds the 10 MiB demo limit.');
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

async function readTextBody(request, limit) {
  const chunks = [];
  let total = 0;
  for await (const chunk of request) {
    total += chunk.length;
    if (total > limit) { const error = new Error('Request is too large.'); error.status = 413; throw error; }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}

export function createDemoServer({
  transcribe = createOpenAITranscriber({ apiKey: process.env.OPENAI_API_KEY }),
  detectSubject = async (input) => createOpenAISubjectDetector({ apiKey: process.env.OPENAI_API_KEY, model: process.env.COMPANION_SEMANTIC_MODEL || 'gpt-5-mini' })(input),
  buildSemantics = async (input) => createOpenAISemanticBuilder({ apiKey: process.env.OPENAI_API_KEY, model: process.env.COMPANION_SEMANTIC_MODEL || 'gpt-5-mini' })(input),
  demoAccessCode = process.env.COMPANION_DEMO_ACCESS_CODE
} = {}) {
  return createServer(async (request, response) => {
  if (request.url === '/api/semantic-extract') {
    let result;
    try {
      result = await processSemanticRequest({ method: request.method, headers: request.headers, bodyText: await readTextBody(request, MAX_SEMANTIC_BODY_BYTES), detectSubject, buildSemantics, accessCode: demoAccessCode });
    } catch (error) {
      result = { status: error.status ?? 400, body: { error: error.message } };
    }
    response.writeHead(result.status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }).end(JSON.stringify(result.body));
    return;
  }
  if (request.method === 'POST' && request.url === '/api/transcribe') {
    try {
      const contentType = request.headers['content-type'] || 'application/octet-stream';
      if (!contentType.startsWith('audio/')) throw new Error('An audio Content-Type is required.');
      const bytes = await readBody(request);
      if (!bytes.length) throw new Error('Audio file is empty.');
      const filename = String(request.headers['x-audio-filename'] || 'capture.webm').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120);
      const result = await transcribe({ bytes, contentType, filename });
      response.writeHead(200, { 'content-type': 'application/json; charset=utf-8' }).end(JSON.stringify(result));
    } catch (error) {
      response.writeHead(400, { 'content-type': 'application/json; charset=utf-8' }).end(JSON.stringify({ error: error.message }));
    }
    return;
  }
  const requested = request.url === '/' ? '/app/index.html' : request.url;
  const relative = normalize(requested).replace(/^([/\\])+/, '');
  const path = join(root, relative);
  if (!path.startsWith(root)) { response.writeHead(403).end('Forbidden'); return; }
  try {
    const content = await readFile(path);
    response.writeHead(200, { 'content-type': types[extname(path)] ?? 'application/octet-stream' }).end(content);
  } catch {
    response.writeHead(404).end('Not found');
  }
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const server = createDemoServer();
  const lanMode = process.argv.includes('--lan');
  const host = lanMode ? '0.0.0.0' : '127.0.0.1';
  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') console.error('Port 4173 is already in use. Open http://127.0.0.1:4173 or stop the existing process.');
    else console.error(error);
    process.exitCode = 1;
  });
  server.listen(4173, host, () => {
    if (!lanMode) { console.log('Synthetic demo: http://127.0.0.1:4173'); return; }
    console.log('LAN mode: audio requests use API credits. Stop the server after the controlled test.');
    for (const entries of Object.values(networkInterfaces())) {
      for (const entry of entries || []) if (entry.family === 'IPv4' && !entry.internal) console.log(`Synthetic LAN demo: http://${entry.address}:4173`);
    }
  });
}
