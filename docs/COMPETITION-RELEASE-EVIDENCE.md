# Competition Release Evidence — Block 1

## Starting state

- Main repository: `F:\kata\companion-webmcp` (recorded here only as the operator-selected repository, never used by runtime code).
- Starting branch: `main`.
- Baseline commit: `76368ef47af8da5360b482629d5f0432f9611dff`.
- Starting tree: clean; no tracked or untracked changes.
- Required release branch: `release/webmcp-challenge`.
- Baseline commands: 13 tests passed, `npm run check` passed, and `npm run build` passed.
- Baseline behavior: `search_companion_observations` returned an internally generated `answer`; this was the superseded contract.

## Deliberate promotion

Promoted as stable concepts and reimplemented cleanly:

- `src/core/semantic-memory.js`: source-linked additive semantic memory, confirmation, subject resolution and subject-first retrieval.
- `src/webmcp/register.js`: `query_companion_memory`, delegating to the same internal capability and returning no `answer`.
- `src/adapters/demo/semantic.js`: deterministic synthetic competition adapter and Hyundai scenario.
- `src/app/client.js` and `src/app/index.html`: coherent Hablar → Revisar → Guardar flow.
- `tests/semantic-memory.test.js`: intentional architecture and contract gates.
- `docs/experiments/`: sanitized architecture history.

Deliberately excluded:

- experiment runners, experiment HTTP host and external-agent harness;
- temporary JSON, model traces and browser call logs;
- experimental provider abstractions and paid semantic endpoint;
- laboratory Git history and configuration;
- the known record-level over-selection fix.

The laboratory was read-only and was not bulk-copied. Runtime code has no dependency on it.

## Architecture preserved

Exact confirmed `rawText` remains primary evidence. Semantic items are additive and carry `sourceRecordId`. Stable kinds, provenance and resolution statuses match the freeze. Ambiguous resolution cannot persist. Confirmation must be explicit. Retrieval loads only the requested subject before selection. Companion selects evidence, WebMCP transports it, and the external agent synthesizes language.

## Verification

| Gate | Result | Evidence |
|---|---|---|
| Tests | PASS | 10 passed, 0 failed |
| Check | PASS | `npm run check` exit 0 |
| Build | PASS | dependency-free `dist/` produced |
| Application load | PASS (local) | HTTP 200; browser title and three-step flow observed |
| Confirmation / memory | PASS (local) | two records confirmed through the visible UI |
| WebMCP discovery | PASS (local browser) | in-app browser discovered `query_companion_memory` from page origin |
| WebMCP invocation | PASS (local browser) | capability invoked through browser WebMCP surface |
| Positive retrieval | PASS | cylinder 2 query selected the confirmed spark record |
| Negative retrieval | PASS | compression query returned no records and `insufficientEvidence: true` |
| No fabricated answer | PASS | automated test and observed payload contain no `answer` field |
| Clean checkout | PASS | fresh `--no-local` clone; install, 10 tests, check and build passed |
| Public deployment | NOT VERIFIED |

## Exposure and deployment

The deterministic semantic demo is browser-local and does not require a billable provider. The retained local `/api/transcribe` route is billable, limited to audio, capped at 10 MiB, sanitizes filenames and retains no audio. It has no production authentication and therefore must not be exposed as an unrestricted public endpoint. No semantic provider endpoint was promoted.

A public deployment was not performed or identified during Block 1. Local behavior is not counted as deployment evidence. This is the current release blocker.

## Audit

- Synthetic data only: independently invented Hyundai demonstration entries.
- MIT `LICENSE` is present.
- No package dependencies; the npm lockfile records the dependency-free package state. Node.js is the only runtime dependency.
- Tracked temporary artifacts: none.
- Secret values: none found; only the environment-variable name `OPENAI_API_KEY` is documented.
- Private data or private-host dependency: none found.
- Absolute operator paths: this evidence section records the mandated repository starting state; no runtime or setup dependency uses it.

## Known limitations

- Record-level evidence selection can return secondary semantic items from a relevant selected record. Block 1 intentionally leaves this unchanged.
- The public demo adapter covers only the documented synthetic scenario; production semantic extraction is outside the deterministic competition path.
- Memory is session-local.
- The optional billable transcription endpoint is suitable for controlled local validation, not unrestricted public exposure.

## Final state

- Final release commit: the commit containing this evidence document; its exact hash is recorded in the final Block 1 report because a commit cannot self-record its own hash.
- Final decision: **NO-GO — RELEASE BLOCKER** unless a public deployment from the Release Candidate is verified without exposing the billable transcription endpoint.
- Minimum corrective action: deploy the deterministic static competition path from this branch to the intended public host, then verify application load, semantic confirmation/persistence, WebMCP discovery/invocation, and positive/negative queries at that public origin. Keep `/api/transcribe` disabled or place it behind a competition-safe boundary.
