import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8' };
export function createDemoServer() {
  return createServer(async (request, response) => {
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
  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') console.error('Port 4173 is already in use. Open http://127.0.0.1:4173 or stop the existing process.');
    else console.error(error);
    process.exitCode = 1;
  });
  server.listen(4173, '127.0.0.1', () => console.log('Synthetic demo: http://127.0.0.1:4173'));
}
