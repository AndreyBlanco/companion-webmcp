# Dependency and Provenance Policy

## 1. Direct dependencies

Before adding a direct dependency, record:

- package and pinned or constrained version;
- official source;
- purpose and acceptance criterion served;
- license and compatibility conclusion;
- maintenance and security considerations;
- alternatives considered; and
- approving change or review.

Use a lockfile after the package manager is selected. Avoid dependencies that do not reduce material implementation or security risk.

## 2. Code and assets

Do not copy code, prompts, documentation, images, audio, datasets or test cases from a private repository.

Third-party material must have a traceable source and compatible license. Record modifications and preserve required notices. Generated material must identify the generating tool or process when provenance matters.

## 3. Secrets and configuration

Commit only example environment files with placeholder values. Never commit credentials, tokens, private URLs or production identifiers.

Local and deployment secrets must be supplied outside version control. Logs and test artifacts must not echo secrets or captured content.

## 4. Review before publication

Before any push to a public remote or release:

1. inspect tracked files and full reachable history;
2. scan for secrets and private-host identifiers;
3. review dependency licenses and notices;
4. confirm fixture provenance;
5. inspect generated output and source maps;
6. verify no external local paths or links exist; and
7. record unresolved risks and the publication decision.

## 5. Dependency register

The 2026-08-29 Weekend Sprint authorization selected Node.js 24 or newer as the sole runtime. It is used for the local HTTP demo, native test runner, syntax checks and build copy. Source: https://nodejs.org/; license: MIT; version policy: current Node 24 major or newer. No npm package or third-party asset is used; `package-lock.json` records that dependency-free package state for reproducible installation.

Alternatives considered: a browser framework and TypeScript toolchain. Both were rejected for the initial evidence slice because standard JavaScript and Node cover the acceptance criteria with a smaller dependency and license surface.

The WebMCP registration shape follows the public W3C Community Group draft at https://webmachinelearning.github.io/webmcp/ and is isolated behind feature detection because the API is emerging.

The optional audio validation uses the OpenAI Audio Transcriptions HTTPS API with the `gpt-transcribe` model. Official source: https://developers.openai.com/api/docs/models/gpt-transcribe and https://developers.openai.com/api/reference/resources/audio/methods/transcribe. Purpose: transcribe a controlled synthetic audio file for HG-01/HG-02 evidence. Version policy: explicit `gpt-transcribe` alias selected by Authorization 002. It is an external paid service, not a packaged code dependency; no SDK is installed. The alternative considered was browser speech recognition, rejected because it would add a second provider path with inconsistent availability. Audio is not stored by the demo, but is transmitted to OpenAI for processing.

The competition semantic path uses the OpenAI Responses API with strict JSON Schema output and the `gpt-5-mini` model alias. Official source: https://developers.openai.com/api/docs/guides/structured-outputs and https://developers.openai.com/api/docs/models/gpt-5-mini. Purpose: first propose a subject for human correction and confirmation, then build semantic items under that confirmed subject while preserving exact evidence excerpts. Version policy: one explicit model alias configurable through `COMPANION_SEMANTIC_MODEL`; reasoning effort is `minimal` for the two narrow tasks; no SDK is installed. Calls run only in a Netlify Function protected by a private judge access code. The browser never receives the OpenAI key. Deterministic validation remains mandatory because provider output is untrusted candidate structure.
