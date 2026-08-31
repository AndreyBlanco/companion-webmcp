# Semantic architecture freeze

The Release Candidate preserves this responsibility chain:

`raw confirmed text → immutable primary evidence → additive semantic delta → subject resolution → explicit confirmation → subject-scoped retrieval → WebMCP evidence → agent synthesis`

Stable semantic kinds are `entity`, `claim`, `measurement`, `event`, `relationship`, and `hypothesis`. Stable provenance values are `observed`, `measured`, `reported`, `speaker_inference`, and `system_inference`. Subject resolution is `resolved`, `probable`, or `ambiguous`; ambiguous drafts cannot persist.

Companion owns confirmed memory and evidence selection. WebMCP transports the `query_companion_memory` arguments and evidence payload. The external agent owns final reasoning and language. Consequently the tool payload intentionally has no `answer` field.

This document records a public, synthetic architecture decision. It is not a runtime dependency.
