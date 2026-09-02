import { performance } from 'node:perf_hooks';
import { createOpenAISemanticBuilder } from '../src/providers/openai-semantic.js';

const rawText = 'Durante la inspección de la bomba Delta nueve observé una vibración constante al aumentar la velocidad. El manómetro indicó cuarenta y ocho psi durante diez segundos y luego descendió a treinta y nueve psi. El técnico informó que el ruido comenzó después del último mantenimiento. No se observaron fugas externas ni conexiones sueltas. Considero posible que exista desgaste en el rodamiento delantero, pero todavía no se ha desmontado el conjunto ni se ha realizado una medición interna que confirme esa hipótesis.';
const confirmedSubject = { id: 'bomba-delta-9', type: 'pump', label: 'Bomba Delta 9' };
const build = createOpenAISemanticBuilder({ apiKey: process.env.OPENAI_API_KEY, model: process.env.COMPANION_SEMANTIC_MODEL || 'gpt-5-mini', timeoutMs: 120000, reasoningEffort: process.env.COMPANION_REASONING_EFFORT || 'minimal' });
const started = performance.now();
try {
  const items = await build({ rawText, confirmedSubject });
  console.log(JSON.stringify({ status: 'success', characters: rawText.length, words: rawText.trim().split(/\s+/).length, elapsedMs: Math.round(performance.now() - started), items: items.length }));
} catch (error) {
  console.log(JSON.stringify({ status: 'failed', characters: rawText.length, words: rawText.trim().split(/\s+/).length, elapsedMs: Math.round(performance.now() - started), errorType: error.name }));
  process.exitCode = 1;
}
