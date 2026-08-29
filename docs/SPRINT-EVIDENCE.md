# Weekend Sprint — initial block evidence

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
