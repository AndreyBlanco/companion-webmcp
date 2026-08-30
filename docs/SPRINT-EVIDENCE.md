# Weekend Sprint — initial block evidence

## UX-01 — First Impression / Unassisted Discovery

- Date recorded: 2026-08-30
- Participant: one teacher, without prior training
- Completion time: 1 minute 27 seconds
- Result: the participant completed persistence with assistance
- Synthetic-data constraint: this record contains only aggregate interaction evidence; no participant or real student record was copied into the repository

### Observations

- Initial difficulty determining what to do
- Recording control was not discoverable enough
- Waited for an explicit signal before beginning
- Was uncertain whether recording was active and restarted the first capture
- After stopping, did not know the next action
- Needed direction to review the transcript
- Confirmed the transcript was faithful
- The subsequent JSON output caused confusion
- Completed the save flow
- Considered immediate capture useful for avoiding lost details, expressed willingness to use it and asked when it would be available for real work

### Diagnostic

| Dimension | Result |
|---|---|
| Value | PASS |
| Fidelity | PASS |
| Completion | PASS with assistance |
| Discoverability | FAIL |
| State clarity | FAIL |
| Next-action clarity | FAIL |
| Technical leakage | FAIL |

This evidence authorizes only a minimal presentation and interaction-state intervention: one visible `Hablar → Revisar → Guardar` path, unmistakable recording/transcription states, an editable transcript review, a clear final save action, perceptible completion and technical JSON hidden behind an optional disclosure. It does not authorize a new capability.

## Competition Readiness — Block 1 evidence

### Minimal UX intervention

- Visible path: `1. Hablar → 2. Revisar → 3. Guardar`
- Initial primary action: `Iniciar grabación`
- Recording state and action: `Grabando…` and `Detener grabación`
- Processing state: `Transcribiendo…`
- Review state: editable transcript headed `Revisa la transcripción`
- Final action and result: `Guardar observación` followed by `Observación guardada`
- Technical leakage: WebMCP status, synthetic subject controls, retrieval control and JSON remain available under the collapsed `Detalles técnicos` disclosure
- Scope: presentation, hierarchy, interaction states and supporting hard-gate test only; no capability added

Local regression after the intervention passed: 12 tests, 0 failures; syntax check exit 0; build exit 0. Direct HTTPS Motorola capture was not repeated from this agent environment and remains a required external observation before HG-TECH can be marked PASS.

### Real WebMCP validation

- Date: 2026-08-30
- Browser/environment: Codex in-app browser, local demo at `http://127.0.0.1:4173`
- WebMCP availability: available through the document WebMCP capability
- Discovered tool: `search_companion_observations`
- Confirmed synthetic memory: subject `subject-orchid`; observation `Orquídea completó el laberinto azul`; strategy `Comenzó por la salida y trabajó hacia atrás`; response `Sonrió después de encontrar la ruta`
- Arguments: `{"subjectId":"subject-orchid","question":"¿Qué estrategia se usó para el laberinto?"}`
- Response: the three confirmed fields above; `evidenceRecordIds` contained the exact saved record ID; `insufficientEvidence` was `false`
- Memory correspondence: exact record ID and content match between the successful application save and tool result
- Errors/recovery: none

HG-WEBMCP: **PASS**. A real browser discovered and invoked the page-defined tool, which returned previously confirmed synthetic memory through the shared capability.

### Block 1 close report

| Gate | Result | Evidence / remaining condition |
|---|---|---|
| UX mínima | PASS | Guided flow and automated hard-gate assertions pass; browser DOM verified each visible state through successful save |
| Regresión | PASS | Tests/check/build pass and the project authority completed transcription, review and save on the target Motorola HTTPS route |
| WebMCP real | PASS | Real discovery and invocation returned the exact confirmed synthetic record ID |
| Clean checkout | PENDING | Authorized now that the preceding gates pass; result recorded below |
| Scope freeze | PRESERVED | No new capability, provider, persistence, authentication or retrieval architecture was added |

Interim decision: **GO CONDITIONAL** pending the Motorola observation. That condition subsequently passed; the final decision follows the reproducibility result below. No further product development is authorized by this closure.

### Motorola compatibility recovery

The first post-change Motorola transcription reached structuring but failed because that browser exposed `crypto` without `crypto.randomUUID`. The demo ID generator now prefers `randomUUID`, falls back to standards-based `getRandomValues`, and retains a demo-local final fallback. A regression test reproduces the missing-`randomUUID` environment. After the correction: 13 tests passed, syntax check passed and build passed. The complete phone flow still requires repetition before changing HG-TECH from pending.

The project authority then repeated the post-change phone flow and reported successful transcription, review and save. This closes the observed compatibility failure and makes HG-TECH **PASS**: the UX intervention retains the validated vertical slice on the target Motorola HTTPS route.

### Reproducibility closure and final decision

Commit `051a7a2` (`feat: prepare competition demo flow`) was cloned locally with `--no-local --no-hardlinks` into an independent directory. Without package installation, API credentials or private-host access, that checkout passed 13 tests with 0 failures, syntax check and build. The source repository had no remotes or tags; diff checks, scope inspection and secret scanning found no blocker. The only credential-shaped literal was the explicit synthetic test fixture `sk-test`.

| Gate | Final result |
|---|---|
| UX mínima | PASS |
| Regresión | PASS |
| WebMCP real | PASS |
| Clean checkout | PASS |
| Scope freeze | PRESERVED |

Final decision: **GO — Competition Packaging**. Exploratory prototype development for the hackathon is closed; subsequent work should focus on README, narrative, evidence, video and submission.

- Authorization: WS-AA-001, supplied directly with the delegated task
- Timer start: 2026-08-29 09:17:19 -06:00
- External pause start: approximately 2026-08-29 10:01 -06:00
- External pause end: approximately 2026-08-29 15:00 -06:00
- External pause duration: approximately 4 hours 59 minutes
- Recorded close: approximately 2026-08-29 17:31 -06:00
- Wall-clock time: approximately 8 hours 14 minutes
- Estimated active time: approximately 3 hours 15 minutes; derived from the times above, not an instrumented measurement
- Environment: independent working tree, Node.js v24.18.0, npm 11.16.0
- Scope: dependency-free synthetic vertical slice; no commit, remote, publication or deployment

## Decisions

1. Standard JavaScript and Node built-ins only: smallest dependency and licensing surface.
2. Conservative labeled extraction: source text is retained; only explicitly labeled fields are extracted; missing optional values remain `null` and are listed as uncertainties.
3. Persistence accepts only a known draft, `confirmed: true`, and its single-use token.
4. Retrieval calls `bySubject(subjectId)` before content scoring and returns stored record IDs as evidence.
5. The application and `search_companion_observations` WebMCP tool receive the same frozen capability object. WebMCP absence is feature-detected and does not disable the application.

## Gate matrix

| Gate | Status | Evidence | Limitation / reviewer |
|---|---|---|---|
| HG-01 | PASS | `tests/vertical.test.js`: exact source retained, explicitly labeled facts preserved, absent fields `null`, uncertainties explicit; complete 7-test suite passed | Controlled synthetic cases only. Technical self-review by Codex; external review pending. |
| HG-02 | FAIL | Clean repeat: Companion 2:02 versus manual 2:06, a 4-second (about 3%) advantage. Companion automated timestamps/confirmation metadata and produced consistent fields; the manual artifact contained a joined-word transcription error and inconsistent formatting. | The measured advantage is not large enough to satisfy “clearly simpler.” Action, hesitation and recovery counts were not reported for the clean repeat. It is also unclear whether Companion timing stopped at confirmation or included the displayed retrieval. Project-authority observation; external review pending. |
| HG-03 | PASS | Test invokes discoverable `search_companion_observations`, proves delegation to the same function object, evidence IDs and fallback; suite passed | Browser-agent invocation needs a WebMCP-capable browser; registration contract tested with a faithful model-context boundary. Technical self-review by Codex. |
| HG-04 | PASS | The committed initial block was verified from a detached clean worktree: 7/7 tests, syntax check and build without dependencies or private access; tracked tree, reachable history and Git objects scanned; no remotes or tags; fixture and dependency provenance recorded | Technical self-review by Codex. No publication or external licensing review is claimed. |

## Commands and observed results

```text
npm test       7 passed, 0 failed
npm run check  exit 0
npm run build  exit 0; dependency-free dist generated
npm run demo   HTTP GET / returned 200, text/html; title and explicit confirmation control present
```

Isolation inspection used repository-wide searches (excluding `.git` and generated `dist`) for private repository names/paths, user-local paths, private-key markers and common secret assignments. No prohibited match was found. URL inspection found only the loopback demo URL and the two public sources documented in `docs/PROVENANCE.md`. `git fsck`, remote, branch and tag inspection found no reachable commit, remote or tag; the unborn local branch is `main`.

All fixtures are independently invented for this repository and documented in `fixtures/synthetic/README.md`. This record does not attribute external approval, publication readiness or sprint closure.

## Observed HG-02 session

On 2026-08-29, the project authority reported one Companion run: 5 minutes, approximately 7 actions, 3 corrections, 1 hesitation, no assistance entry, and 1 error recovery. The run exposed a parser defect for the explicit camelCase label `followUp:`; the defect was corrected with a synthetic regression test. Retrieval correctly returned insufficient evidence when the question's only discriminating term was absent, then returned the subject-scoped record when that term appeared. This also demonstrates the current lexical retrieval limitation: semantic equivalents without shared terms are not matched.

The comparison run used a text editor and took 3 minutes 38 seconds with no corrections reported. The raw times favor the manual path by 1 minute 22 seconds, approximately 38%, but they are not a valid gate comparison: Companion timing included retrieval experiments and recovery from defects, while manual timing covered registration only. The manual output also used a source outside the `text | voice` contract and treated a proposed future action as an uncertainty, so it did not reach an equivalent valid endpoint. HG-02 remains NOT EVALUATED. The exact manually entered record is intentionally not copied into repository evidence; only aggregate observations supplied by the project authority are retained. A clean post-fix, like-for-like retest must be recorded separately rather than replacing this diagnostic result.

A post-fix repeat reported Companion at 2 minutes 2 seconds and manual entry at 2 minutes 6 seconds. Companion automatically supplied capture and confirmation metadata and produced a retrievable evidence record; the manual result contained a joined-word transcription error and inconsistent label formatting. The 4-second, approximately 3%, time advantage demonstrates rough parity rather than the gate's required clear simplification. HG-02 is therefore FAIL for this block. Counts for actions, hesitation, assistance and recovery were not supplied for this repeat, and the displayed Companion result includes retrieval even though the intended timing endpoint was confirmation; this ambiguity is retained as a limitation. Exact entered content is not copied into repository evidence.

## Next-slice scope decision

On 2026-08-29, the project authority retained text as the fallback and selected audio as the only additional capture source to evaluate next. The intended HG-02 comparison is audio capture → transcription → structure → review → confirmation versus saving/listening to the same synthetic audio and manually transcribing/interpreting it into a valid record. Image and all other source modalities are deferred. They may be considered only after hackathon inputs are complete, remaining time before submission is known, and a specific second-version scope decision is made. No audio provider or expanded architecture is authorized or implied by this decision record.

## Final technical audit for the planned block

At 2026-08-29 17:31:33 -06:00, the complete test, syntax-check and build commands passed again: 7 tests passed and none failed. Repository-wide isolation and common-secret-pattern scans returned no prohibited match. URL inspection found only loopback demo references and the two documented public sources.

Before commit authorization, `git fsck` reported eight dangling trees created as successive snapshots of this working tree. Every path in those trees belonged to this repository's documented file set. All 35 blob objects then present were scanned for the private repository name/path, user-local paths, private-key markers and common assigned-secret patterns; the scan returned no hit.

Authorization 002 permitted reproducibility closure. The root commit (`feat: add confirmed memory vertical slice`) was created with the 21 audited public files and no remote or tag. A detached clean worktree at the committed initial block ran `npm test` (7 passed, 0 failed), `npm run check` and `npm run build` successfully with no package installation or private-host access. The clean tree isolation scan returned no prohibited match. The temporary worktree was then removed. This evidence satisfies HG-04 for the committed initial block; no publication or external approval is implied. The final commit identity is reported outside this self-contained commit record.

## Audio Validation Sprint

- Active timer start: 2026-08-29 17:57:30 -06:00
- Authorized route: `MediaRecorder → audio file → server endpoint → gpt-transcribe → existing structure/review/confirmation pipeline`
- Official API verification: OpenAI's current model and audio transcription references document `gpt-transcribe`, the `/v1/audio/transcriptions` endpoint, multipart file upload and WebM input support.
- Minimal access check: `OPENAI_API_KEY` and `OPENAI_BASE_URL` were both absent from the local process environment. No credential value was printed, requested, stored or committed; no paid API request was attempted.
- Status: BLOCKED at the provider-access gate. Under Authorization 002's cut rule, no audio implementation, alternate STT provider, local Whisper, Realtime path or broader architecture was introduced.
- Required decision: configure API access locally and repeat the minimal `gpt-transcribe` check, or explicitly authorize a proposed minimal alternative before implementation.

### Access recheck

At 2026-08-29 18:08:38 -06:00, Codex detected `OPENAI_API_KEY` in its process environment. A deterministic one-second WAV tone was generated under ignored `tmp/` solely to probe the endpoint. Requests to `/v1/audio/transcriptions` and the non-billing `/v1/models/gpt-transcribe` metadata endpoint both returned HTTP 400 with an empty response body. A local, non-revealing validation then found that the environment value had length 1 and neither a `Bearer ` prefix nor a recognized OpenAI key prefix. No key character or credential value was printed or stored in repository files.

This is a local credential-configuration failure, not evidence that the account lacks `gpt-transcribe` access. No successful API request, transcription charge, audio implementation or provider expansion occurred. The sprint remains blocked until the complete key is configured locally and inherited by the Codex process.

### Valid-key access result

At 2026-08-29 18:16:29 -06:00, the restarted Codex process inherited a value with plausible length, recognized `sk-` prefix and no surrounding whitespace; no secret characters were printed. `GET /v1/models/gpt-transcribe` returned HTTP 200 and model metadata, establishing that the credential can see the requested model. The subsequent minimal synthetic-tone transcription request returned HTTP 429 with code `credit_balance_exhausted` and stated that no credits remain.

The audio was not transcribed and no successful billable request occurred. Adding credits is an external payment decision outside agent authority. Under the sprint cut rule, implementation remains stopped; no alternate provider or architecture has been introduced. The next authorized continuation requires the project authority to add API credits independently or explicitly choose a different minimal route.

After the project authority reported adding balance, the identical minimal synthetic-tone request was repeated once. It still returned HTTP 429 with `credit_balance_exhausted`. No transcription or successful charge occurred. The API response does not distinguish billing propagation delay from balance associated with a different organization/project; no automatic polling or additional provider work was performed.

### Provider access restored and implementation

After a new project key was configured, local non-revealing checks confirmed plausible length, `sk-` prefix and no surrounding whitespace. Model metadata returned HTTP 200. The one-second synthetic tone then returned HTTP 200 from `/v1/audio/transcriptions`, with empty text as expected for non-speech and duration usage of one second.

The authorized single audio route was implemented without an SDK: browser `MediaRecorder` or audio file selection → local 10 MiB-limited endpoint → OpenAI `gpt-transcribe` → transcript placed in the editable text field → existing conservative structure/preview → existing explicit confirmation and in-memory persistence. The server sanitizes filenames and retains no audio. The API key remains server-side. A deliberate `demo:lan` mode supports the controlled phone test; direct microphone APIs may be unavailable over non-secure LAN HTTP, so the phone file/capture control converges on the same provider route.

Automated evidence now contains 9 passing tests: the original 7 plus a multipart provider-contract test and an endpoint validation/injection test. Syntax check and build pass. A live integration sent the same synthetic tone through the local `/api/transcribe` endpoint; the endpoint reached OpenAI and returned HTTP 200 with one second of usage. Spoken-audio fidelity, capture friction, manual comparison and walking/phone TC09 remain pending human observation.

An integration correction added conservative support for inline single-paragraph transcripts and Spanish labels (`Observación`, `Estrategia`, `Respuesta`, `Seguimiento` and `Próximo paso`) while retaining English labels. The complete suite increased to 11 passing tests, with no failures; syntax check and build continued to pass.

### Controlled spoken-audio comparison

The project authority reported that the controlled synthetic recording transcribed word-for-word, introduced no factual error, required no reformulation and mapped correctly into all four structured fields. Companion reached a valid confirmed record in 24.13 seconds with approximately 3 actions, 0 corrections, 0 hesitations, 0 assistance and 0 error recoveries. Manual processing of the same audio reached its record in 1 minute 43.26 seconds with approximately 2 coarse actions, 2 corrections, no factual error and no reformulation; it required pausing and replaying two audio fragments due to typing speed and retention.

Companion was 79.13 seconds faster, a reduction of approximately 76.6%, and completed the task about 4.28 times as fast. The action counts are not directly granular because manual keystrokes and playback controls were grouped, but time, correction and qualitative cognitive-load evidence all favor Companion. Network-speed sensitivity was noted qualitatively but not instrumented. HG-01 is PASS for this controlled audio sample. HG-02 is provisionally PASS for the controlled comparison, subject to completing the separately required phone/walking TC09 observation.

### TC09 phone/walking observation

The project authority tested on a Motorola Edge 40 Neo with Chrome. A valid confirmed record was reached in 51.77 seconds with approximately 5 actions, one-handed operation, 0 corrections, 0 hesitations, 0 assistance, 0 recoveries, 0 factual errors and 0 reformulations. Review was required, as designed. The tester had to stop walking and rated start/stop ease as medium. No network or permission failure occurred in the file-based route.

Chrome did not expose direct `getUserMedia` on the HTTP LAN origin because it was not a secure context. The test therefore used the native voice recorder/file selector. Three reported navigation actions—starting the stopwatch, opening the voice recorder and stopping the stopwatch—belong to the measurement protocol; the two stopwatch actions would not exist in normal use, while leaving Companion for the recorder is a real current limitation. Direct one-page mobile recording requires a trusted HTTPS context and remains outside this sprint.

### Audio sprint final gate report

- **HG-01 — PASS:** the controlled spoken sample transcribed word-for-word according to the project authority, mapped all four fields correctly and introduced no factual error or reformulation. Spanish and inline transcript regressions pass. Reviewer: project-authority observation plus Codex technical self-review; external review pending.
- **HG-02 — PASS:** same-audio comparison showed 24.13 seconds versus 103.26 seconds manual, approximately 76.6% less time, no corrections versus two, and lower reported typing/retention burden. TC09 retained one-handed, error-free completion in 51.77 seconds, though the tester stopped walking and used the native recorder. Reviewer: project authority; single-user controlled evidence only.
- **HG-03 — PASS (unchanged):** audio did not duplicate or modify WebMCP business logic; the existing discoverable search tool still delegates to the same internal capability. Browser-agent validation limitation remains.
- **HG-04 — PASS:** status from the clean-checkout initial block remains. Audio changes use one documented external API, no SDK/package, no secret in source and synthetic-only tests. A new clean-checkout audit of the uncommitted audio change set remains necessary before any future publication.

### Audio sprint time and recommendation

- Timer start: 2026-08-29 17:57:30 -06:00.
- Evidence close: approximately 2026-08-29 19:56 -06:00.
- Wall-clock span: approximately 1 hour 58 minutes, dominated by external credential/billing changes and human tests.
- Estimated active agent time: approximately 15 minutes across the recorded implementation/diagnostic intervals; this is derived, not instrumented exact time.

Recommendation: **GO CONDITIONAL** for additional submission work. The central audio hypothesis passed strongly and without fidelity loss. Conditions before a competition-ready claim are a clean-checkout audit of the audio change set, an actual WebMCP-capable browser-agent invocation, and a deliberate decision for trusted HTTPS if direct one-page phone recording is required. Do not add image or another modality to obtain further evidence.
