# Architecture — Companion WebMCP

**Status:** Approved documentation baseline

## 1. Two-repository model

```text
Public Companion repository                 Private host repository
┌──────────────────────────────┐            ┌──────────────────────────────┐
│ Generic contracts            │◄───────────│ Private host adapter         │
│ Companion core               │  consumes  │ Schema and identity mapping  │
│ Provider interfaces          │  contract  │ Auth and authorization       │
│ Demo adapter                 │            │ Domain rules and prompts     │
│ Synthetic fixtures           │            │ Production integration       │
│ WebMCP exposure              │            │ Production data              │
└──────────────────────────────┘            └──────────────────────────────┘
```

The dependency direction is private host → public contract. The public repository never imports the private host.

## 2. Layers

### Contracts

Domain-neutral data shapes and capability interfaces for capture, structured observations, confirmation, persistence, retrieval and grounded answers.

### Core

Rules shared by the normal application and WebMCP exposure. The core preserves source text, explicit uncertainty, subject isolation and confirmation before persistence.

### Providers

Narrow interfaces for transcription, structured extraction and storage. The initial implementation should select one path per required capability and avoid a provider framework.

### Demo adapter

Maps generic contracts to synthetic subjects and memories used only by automated tests and preserved experiments. The public application does not import this adapter or preload any scenario.

### Application

Provides the human capture, preview, edit, save/cancel and retrieval experience. A text fallback remains available when audio or transcription is unavailable.

### WebMCP

Registers at least one real capability and delegates directly to the same internal function used by the application. It does not duplicate retrieval or persistence logic.

## 3. Minimal capability contract

```ts
interface CompanionCapabilities {
  structureCapture(input: CaptureInput): Promise<StructuredObservation>
  createObservation(input: ConfirmedObservation): Promise<MemoryRecord>
  searchObservations(input: RetrievalRequest): Promise<GroundedAnswer>
  getSubjectContext(subjectId: string): Promise<MemoryRecord[]>
}
```

## 4. Isolation rules

- no imports or links outside the repository;
- no private-host names or types in contracts and core;
- no environment variable that points to another repository;
- no fixtures derived from real or private data;
- no production prompts or domain rules;
- no copied Git objects, branches, tags or remotes;
- no build or test step that reads a private path.

## 5. Private integration mechanism

A private host may depend on a versioned public package or a reviewed source release. It implements its adapter privately and converts host identities and records to generic contract types.

The adapter, mappings and integration tests containing private concepts remain in the private repository. Only generic defects and improvements may flow back, rewritten without private material and reviewed for provenance.

## 6. Initial structure

```text
AGENTS.md
README.md
LICENSE
.gitignore
docs/
  ARCHITECTURE.md
  HARD-GATES.md
  DATA-POLICY.md
  PROVENANCE.md
src/
  contracts/
  core/
  providers/
  adapters/demo/
  webmcp/
  app/
tests/
fixtures/synthetic/
```

The creation package materializes only the governance and documentation files. Source directories are documented but are not created until an implementation package authorizes them.
