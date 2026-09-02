#!/usr/bin/env node
import { runLab } from './index.js';

const [command = 'all', ...args] = process.argv.slice(2);
const value = (flag) => { const index = args.indexOf(flag); return index >= 0 ? args[index + 1] : undefined; };
if (!['all'].includes(command)) {
  console.error('The reproducible v0.1.1 milestone currently supports: all --dry-agent [--run <id>] [--overwrite-run]');
  process.exitCode = 2;
} else if (!args.includes('--dry-agent')) {
  console.error('--dry-agent is required; no billable provider call is implemented in this public milestone.');
  process.exitCode = 2;
} else {
  try {
    const result = await runLab({ runId: value('--run'), overwrite: args.includes('--overwrite-run') });
    console.log(`${result.summary.status} ${result.runDir}`); process.exitCode = result.summary.status === 'PASS' ? 0 : 1;
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
