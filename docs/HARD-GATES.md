# Hard Gates — Companion WebMCP

## HG-01 — Fidelity

**PASS** only when controlled tests show that structured observations preserve the meaning of the source, introduce no major factual correction and no fabricated fact.

Any invented fact is also a grounding failure. Missing values remain absent or explicitly uncertain.

## HG-02 — Low friction

**PASS** only when observed capture is clearly simpler than the manual alternative under test. Evidence includes completion time, actions, hesitation, assistance and recoverability.

The target experience minimizes decisions before capture and keeps correction cheaper than rewriting the record.

## HG-03 — WebMCP viability

**PASS** only when at least one real vertical-slice capability can be invoked through WebMCP using the same internal contract as the application, without duplicated business logic.

The capability must be discoverable, return verifiable evidence and preserve the normal application interface when WebMCP is unavailable. A substantial redesign required only for WebMCP is a hackathon failure.

## HG-04 — Publishable isolation

**PASS** only when all of the following are true:

1. the repository builds, tests and demonstrates without access to a private host;
2. no tracked file or Git object contains private-host code, data, schema, prompt, rule, secret or private documentation;
3. no path, import, variable, package link or setup step depends on another local repository;
4. all fixtures are demonstrably synthetic;
5. direct dependencies and third-party assets have recorded provenance and compatible licenses;
6. repository history was created independently and contains no imported private commits, branches or tags;
7. a clean checkout can follow the public README without private knowledge; and
8. an audit of tracked content, history, dependencies and generated artifacts finds no unresolved publication blocker.

If any item cannot be demonstrated, HG-04 is **FAIL** or **NOT EVALUATED**, never PASS by assumption.

## Gate reporting

Each gate report must identify:

- status: PASS, FAIL or NOT EVALUATED;
- test or inspection performed;
- evidence location;
- limitations;
- responsible reviewer; and
- timestamp or commit identity.

