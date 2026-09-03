# Checkpoint A — Semantic authority

Implementation scope: P01–P11 of the accepted promotion handoff. P12–P14 remain outside this change. This document supersedes historical descriptions of the active `semanticItems` path; it does not promote Lab B or reopen R10/R11.

The confirmed record remains the Entry boundary. Its raw text, subject and capture/confirmation timestamps are saved before the Builder runs, in session memory. Closing the page still ends the session.

The one existing semantic provider call now returns a provisional, closed envelope containing `recordId`, `subjectId`, `stageA` (nodes, relation candidates, expressive limitations) and `stageB` (the same candidates plus classification). These separate outputs are inspectable in `semanticAudit`. No candidate is incorporated directly from discovery. The model performs discovery and epistemic classification; Companion cannot prove semantic entailment or perfect discovery.

Companion validates the envelope against the same closed shape supplied to the provider, reconciles candidate identity/endpoints/type/provenance/evidence one-to-one, checks unique local IDs, local endpoint references, record/subject identity, v0.1 types, human provenance, epistemic values and exact source evidence. Whitespace normalization collapses whitespace runs to one space and trims boundaries; casing and punctuation remain significant. Original raw text is never normalized in storage. Invalid citations produce `GROUNDING_REFERENCE_INVALID`; per-attempt error codes remain on the record. Incomplete provider responses are rejected even if parseable JSON is present.

Persistent graph IDs are generated mechanically from the Companion record ID, the node/relation category and an ordinal. Model-local IDs do not become graph identities. Graph endpoints are remapped; the store rejects duplicate record identities. Cross-record references are not admitted by this single-Entry Builder.

Only validated `SOURCE_EXPLICIT` and `SOURCE_STRONGLY_IMPLIED` relations enter `semanticGraph`. `AGENT_INFERRED` relations and their exclusive nodes are omitted. Human provenance is independent: `observed`, `measured`, `reported`, `speaker_inference`; null means no human provenance for a model-added relation, not a fifth provenance label. A source-attributed statement is not certified objective truth.

`semanticAudit` is explicitly non-factual session audit: A/B outputs, routing decisions, interpretation version and processing timestamp. Its local IDs remain local. It is not an ExternalInference retrieval subsystem and is never returned by `queryMemory`. No inference lifecycle or durable store is added.

The existing WebMCP tool and subject-scoped selection remain. Necessary payload changes: `evidence` now contains factual graph relations, `nodes` resolves endpoints, timestamps preserve Entry context, and `limitations` exposes model-declared expressive limits. The optional `evidenceTypes` filter now accepts v0.1 node types instead of the retired item kinds. A ready record may contain raw text and no factual relations. No vocabulary endpoint, ID retrieval planner or sufficiency loop was introduced.

## Acceptance evidence

Local verification on 2026-09-02: `npm test` passed 41/41; `npm run check`, `npm run build` and `git diff --check` passed. Existing unrelated working-tree changes were preserved. No push or deployment was performed.

- `tests/semantic-authority.test.js`: explicit/strongly implied eligibility, human interpretation attribution, agent inference exclusion including exclusive nodes, repeated local IDs across Entries, canonical references, candidate deletion/duplication/mutation/replacement, exact-source whitespace and invalid quotes/Entry, metamodel/shape enforcement, atomic failure, visible limitations, record collisions and filtered endpoint closure.
- `tests/semantic-endpoint.test.js`: current remote → endpoint → provider → core integration with an injected provider response; one semantic call, prior raw persistence, incomplete-response rejection, access and input controls.
- `tests/semantic-memory.test.js`: existing confirmation, continuity, isolation, retries, source retention, clearing during processing and shared WebMCP capability.

All added fixtures are independently invented for this repository by Codex under the Checkpoint A authorization, licensed MIT. Code, schema and provider instruction changes were authored for this repository; no Lab B protocol or external code was copied and no dependency was added.

The tests use controlled synthetic provider outputs; they verify deterministic enforcement, not live model classification accuracy. A live provider/browser run has not been performed for this checkpoint. HG-01 has narrow automated evidence only; HG-02 and real-browser HG-03 are not revalidated. Build/tests require no private host. The tracked-file/reachable-history pattern scan has no evident secret finding, but is not a complete HG-04 certification or an audit of the pre-existing ZIP.
