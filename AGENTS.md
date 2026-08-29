# AGENTS.md — Companion WebMCP

## Mission

Build the smallest public, generic and auditable implementation that can demonstrate capture, structure, confirmation, memory, retrieval and meaningful WebMCP interoperability.

Optimize for evidence, not architectural completeness.

## Repository boundary

This repository is independent and public-by-design.

Do not copy or import code, Git history, data, schemas, prompts, rules, documentation, secrets or configuration from a private host repository. Do not add filesystem paths, package links or environment assumptions that require another local repository.

Private host adapters and integrations remain in their private host repositories.

## Data

Use only synthetic fixtures created specifically for this repository.

Never use real or deidentified personal records, student information, family information, production logs, screenshots, exports or copied examples from a private system.

If the synthetic origin of an item cannot be demonstrated, do not add it.

## Implementation rules

1. Inspect the repository and current task before editing.
2. Map each significant change to a test case or hard gate.
3. Keep the core domain-neutral.
4. Use a demo adapter for the public demonstration.
5. Reuse the same internal capabilities from the application and WebMCP layers.
6. Require explicit confirmation before persistence.
7. Treat missing information as unknown; never invent values to complete fields.
8. Filter by subject before retrieval context reaches a model.
9. Prefer one working provider path over speculative provider abstractions.
10. Stop before crossing the public/private boundary.

## Prohibited work

- plugin frameworks or package ecosystems;
- broad refactors unrelated to an acceptance criterion;
- advanced retrieval infrastructure without test evidence;
- multiple provider implementations without need;
- production authentication or private-host schema integration;
- hidden telemetry or collection of prompt/content data;
- secrets committed to the repository;
- copied license-incompatible code or assets.

## Dependencies and provenance

Every direct dependency must have a documented purpose, version policy, source and license. Prefer fewer dependencies. Lockfiles are required once dependencies are installed.

Do not paste generated or third-party code without identifying its source and confirming license compatibility.

## Quality gates

Before claiming a result:

- run the documented build, test and lint/typecheck commands that exist;
- verify HG-01 through HG-04 with evidence proportional to the claim;
- confirm that the repository works without access to a private host;
- scan tracked files and history for secrets and private-host material;
- inspect the final change set for unrelated files.

Do not claim a gate passed when evidence is missing.

## Git discipline

This repository starts with new history. Do not import commits, branches, tags or remotes from another project.

Keep commits small and descriptive when reasonable. Do not push, publish, create releases or add remotes without explicit authorization.

## Escalation

Stop and request a decision if a task appears to require private material, a broader architecture, real data, a new provider, a license exception or a change to a hard gate.

