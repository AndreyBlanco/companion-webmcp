# Semantic graph latency calibration

Date: 2026-09-02 (America/Costa_Rica)

The public input limit is 1,000 characters. This is a conservative allowance for a transcription of roughly 30 seconds of fast speech; the calibration input contained 81 words and 514 characters.

The reproducible synthetic input in `scripts/measure-semantic-build.js` was processed directly through the production semantic builder using `gpt-5-mini`. No credential or provider response body was recorded.

| Configuration | Sample | Elapsed | Items |
|---|---:|---:|---:|
| provider default reasoning | 1 | 66.383 s | 9 |
| provider default reasoning | 2 | 61.184 s | 8 |
| `reasoning.effort=minimal` | 1 | 13.978 s | 7 |
| `reasoning.effort=minimal` | 2 | 12.419 s | 7 |

The two minimal-effort samples averaged 13.199 seconds. The graph timeout is therefore 45 seconds: more than three times the observed mean, while leaving 15 seconds before Netlify's documented non-configurable 60-second synchronous-function limit.

This is calibration evidence, not a latency guarantee. Model and network latency vary. The 1,000-character limit bounds the demonstration workload; the timeout remains a technical fuse. Because the source and subject are persisted before graph construction, a semantic timeout leaves the human evidence retained with `semanticStatus=failed`.
