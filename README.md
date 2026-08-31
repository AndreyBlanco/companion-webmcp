# Companion WebMCP

Companion WebMCP is a public-by-design experiment for turning a short natural-language capture into confirmed, retrievable memory that can also be exposed meaningfully to agents through WebMCP.

## Core loop

```text
capture → structure → confirm → remember → retrieve → collaborate
```

The project focuses on four questions:

1. Does structured memory preserve the user’s meaning?
2. Is capture substantially lower-friction than manual entry?
3. Can a real application capability be exposed through WebMCP without duplicated logic?
4. Can the repository be published, built, tested and demonstrated without any private host?

## Public boundary

This repository contains generic contracts, a generic Companion core, a synthetic demo adapter, synthetic fixtures, tests and public documentation.

Private host adapters, domain rules, production prompts, schemas, data and integrations belong in their respective private repositories and are not part of this project.

## Data

All examples and fixtures are synthetic. Do not submit real, deidentified or production-derived personal information.

## Status

Dependency-free Release Candidate: natural text, additive semantic extraction, explicit confirmation, in-memory subject-scoped evidence retrieval, and WebMCP reuse the same capabilities.

## Planned structure

```text
src/
  contracts/
  core/
  providers/
  adapters/demo/
  webmcp/
  app/
tests/
fixtures/synthetic/
docs/
```

## Hard gates

- HG-01: Fidelity
- HG-02: Low friction
- HG-03: WebMCP viability
- HG-04: Publishable isolation

See `docs/HARD-GATES.md` for acceptance criteria.

## Development

Requires Node.js 24 or newer. There are no third-party runtime or development dependencies.

```sh
npm test
npm run check
npm run build
npm run demo
```

Open `http://127.0.0.1:4173`. The deterministic synthetic Hyundai demo uses memory only and resets when the page reloads. A browser with the emerging `document.modelContext` API discovers `query_companion_memory`; other browsers retain the complete application flow. The tool returns confirmed evidence and intentionally has no generated `answer` field.

### Optional synthetic audio validation

The retained `/api/transcribe` endpoint uses OpenAI's `gpt-transcribe` file endpoint. Set `OPENAI_API_KEY` in the server process environment; never put it in this repository or browser code. It accepts at most 10 MiB and does not save audio, but audio is sent to OpenAI and may consume API credits. The competition UI is reproducible without calling this optional paid route.

For the controlled phone test on a trusted local network only:

```sh
npm run demo:lan
```

Open one of the printed LAN URLs on the phone. Browser microphone APIs commonly require HTTPS away from `localhost`; use the audio file control to invoke/select a phone recording when direct recording is unavailable. LAN mode exposes the paid transcription endpoint to devices on that network, so stop the server immediately after the test.

The public demo adapter recognizes only the documented synthetic scenario. The core stays domain-neutral: it preserves exact source text, leaves missing information absent, distinguishes provenance, blocks ambiguous subjects, and requires a separate confirmation action before persistence.

## Security and provenance

Never commit secrets. Record the purpose, source and license of each direct dependency and any third-party asset. See `docs/PROVENANCE.md`.

## License

This repository is licensed under the MIT License. See `LICENSE`.
