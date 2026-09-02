# WebMCP Challenge submission closure

This is the operator checklist for the final candidate. Do not mark an item complete without direct evidence for the exact deployed commit.

## Candidate freeze

- [ ] Select one commit from `release/webmcp-challenge` after all gates pass.
- [ ] Confirm the deploy reports and runs that exact source state.
- [ ] Keep Lab B described as experimental evidence, not deployed product behavior.
- [ ] Record commit, deployment URL, deployment identifier, UTC timestamp and reviewer below.

| Field | Final value |
|---|---|
| Commit | PENDING |
| Live URL | `https://companion-webmcp-challenge.netlify.app` — PENDING REVALIDATION |
| Deployment ID | PENDING |
| Verified at | PENDING |
| Reviewer | PENDING |

## Netlify configuration

Configure these encrypted environment variables for Functions:

- `OPENAI_API_KEY`: project-scoped OpenAI API key.
- [x] `COMPANION_DEMO_ACCESS_CODE`: 256-bit URL-safe random code configured as a write-only production secret for Functions on 2026-09-02; copied to the operator's local clipboard and never written to the repository or logs.
- `COMPANION_SEMANTIC_MODEL`: optional; defaults to `gpt-5-mini`.

Environment readiness confirmed by the project authority on 2026-09-02: local and Netlify production configuration contain `OPENAI_API_KEY`, `COMPANION_DEMO_ACCESS_CODE`, and `COMPANION_SEMANTIC_MODEL`. Values were not recorded in repository evidence.

Never put these values in the repository, browser code, build output, video, screenshots, logs or public Devpost text. The public site must expose `/api/semantic-extract` only through the access-code gate.

## Final technical gates

- [x] One controlled live OpenAI extraction — 2026-09-02T05:38:01-06:00; synthetic input; `gpt-5-mini`; resolved output; 2 semantic items; all evidence literal; no secret or provider body recorded.
- [x] Local in-app-browser smoke — protected synthetic extraction produced a reviewable draft; explicit confirmation stored one entry; `query_companion_memory` was discovered and invoked; the returned payload contained the exact source-linked record and no `answer`.
- [x] Public judge-view smoke — three confirmed entries were retrieved through `query_companion_memory`; the agent distinguished reported evidence, measurement and speaker inference, and correctly declared the compression-test result absent.
- [x] `netlify build --offline --debug` — function bundled successfully with NFT; no warnings or fallback; publish directory and redirect resolved from `netlify.toml`.
- [x] `npm ci` — 1 package audited, 0 vulnerabilities.
- [x] `npm test` — 22 passed, 0 failed.
- [x] `npm run check` — PASS.
- [x] `npm run build` — PASS.
- [ ] clean-checkout repetition from the candidate commit
- [x] tracked-files and full-history secret/private-material scan — no credential match; one historical local path was removed.
- [ ] dependency/license and synthetic-fixture audit
- [ ] final diff contains no unrelated or generated files
- [ ] live page loads in the ChatGPT in-app browser
- [ ] invalid demo code is rejected without an OpenAI call
- [ ] three synthetic entries produce reviewable drafts and persist only after confirmation
- [ ] `query_companion_memory` is discovered and invoked by ChatGPT
- [ ] returned payload contains all and only the confirmed subject records and no `answer`
- [ ] positive question is answered from cited evidence
- [ ] absent compression-test question is answered as unsupported without invention
- [ ] reload visibly resets the session memory

## Devpost form

Create the editable draft through **Join Hackathon → Enter a Submission**. Complete and verify:

- project name and concise tagline;
- public live URL;
- public repository URL;
- private judge credential containing only the Companion demo access code;
- YouTube video URL;
- description covering WebMCP fit, user experience, new human-agent collaboration and implementation;
- statement that all project work was created during the hackathon period;
- statement that repository/demo data are synthetic;
- team/representative and eligibility fields;
- open-source license visible in the GitHub About panel.

### Submission description draft

Companion is a human-to-agent memory layer. People capture natural-language evidence, review the semantic draft produced from it, and explicitly confirm what becomes reusable memory. Through WebMCP, an external agent can retrieve the exact confirmed source and its structured provenance, decide whether the evidence is sufficient, and formulate an answer without Companion pretending to be the reasoning agent.

WebMCP is the essential boundary: the same subject-scoped `queryMemory` capability used by the application is registered as `query_companion_memory`, so compatible agents can discover and invoke real application memory without duplicated business logic. This makes the experience better than copying notes into every conversation and makes missing evidence explicit instead of silently fabricated.

The competition demo uses synthetic automotive observations. A protected Netlify function calls one OpenAI structured-output model to create a reviewable semantic draft. Deterministic validation requires supported types, a resolved subject and literal source excerpts. Memory remains browser-session-local, persistence requires explicit confirmation, retrieval is deterministic by subject, and the WebMCP payload contains evidence rather than a generated answer.

All work in this repository was created during the WebMCP Challenge period. The project is an experimental vertical slice, not a production memory or authentication system.

## Video runbook (target 2:20–2:40)

1. **0:00–0:15 — problem.** “Human context disappears between tools and agent conversations. Companion turns confirmed context into reusable evidence.”
2. **0:15–0:25 — boundary.** Show the live URL and say that Companion owns memory while ChatGPT owns reasoning.
3. **0:25–1:15 — capture.** Enter three new synthetic observations chosen at demonstration time. Explicitly show that the form, subject and inspection question start empty. For each entry, show the processing indicator, generated draft, source excerpt, explicit confirmation and growing entry count. Hide the access code while typing.
4. **1:15–1:30 — memory.** Open technical evidence briefly and show source linkage/provenance, not raw provider traces.
5. **1:30–2:00 — WebMCP.** In ChatGPT's in-app browser ask: “Usa la memoria de Companion para explicar qué evidencia existe sobre el cilindro 2 y qué hipótesis expresó la persona. Distingue hechos observados, mediciones e inferencias del hablante.” Show tool invocation and grounded response.
6. **2:00–2:20 — negative control.** Ask: “¿Cuál fue el resultado de la prueba de compresión?” Show that no such evidence exists and no value is invented.
7. **2:20–2:35 — close.** State the limits: synthetic data, session memory, protected experimental provider, external-agent reasoning.

Record one rehearsal and then the candidate take. The final YouTube video must be public, include audible narration, remain below three minutes, use no unlicensed music/material, reveal no credential and be tested in a private window.

## Architecture claim boundary

The final submission may claim: dynamic structured extraction, literal evidence validation, human confirmation, progressive session memory, subject-first deterministic retrieval and real WebMCP interoperability.

It must not claim: production readiness, durable/multi-user storage, complete 3C Stage A/Stage B implementation, candidate no-deletion enforcement, or a persistent ExternalInference layer.

### Smoke-test correction

The 2026-09-02 public smoke found that `insufficientEvidence: false` could be misread as question-level sufficiency when it only meant that subject records existed. The candidate contract now reports `subjectMemoryEmpty` and `sufficiencyAssessment: "external_agent"`; Companion does not claim to know whether the evidence answers the question.
