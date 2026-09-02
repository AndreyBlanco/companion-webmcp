# Companion WebMCP — Project Charter

**Code:** CWR-001  
**Version:** 1.0  
**Status:** Approved  
**Date:** 2026-08-29  
**Authority:** Andrey Blanco  
**Validation:** No professional validation required; technical, licensing and publication checks remain pending  
**Materialization:** Processed through PE-0025

## 1. Purpose

Companion WebMCP is a public-by-design, domain-neutral project for testing a low-friction loop in which a person captures an experience, reviews a structured representation, confirms it, stores it as memory, and retrieves it later through the application or a WebMCP capability.

The project exists to produce auditable evidence about fidelity, friction, retrieval and agent interoperability. It is not a domain product and does not contain private host intelligence.

## 2. Scope

The initial project may contain only:

- generic contracts for capture, observation, memory, retrieval and grounded answers;
- voice and text capture mechanisms;
- a structured extraction boundary;
- explicit human confirmation before persistence;
- a minimal storage and retrieval implementation;
- a demo adapter using synthetic data;
- a meaningful WebMCP capability that reuses the same internal contract as the application;
- tests, fixtures and evidence needed for HG-01 through HG-04; and
- public documentation required to build, test, demonstrate and audit the project.

## 3. Non-goals

The initial project will not include:

- domain-specific professional rules or decisions;
- production host adapters;
- production data or schemas;
- a plugin framework;
- multiple providers without a demonstrated need;
- advanced RAG, reranking, knowledge graphs or multiple agents;
- a complete SDK or package ecosystem;
- hidden dependencies on another repository; or
- migration of code or Git history from a private host.

## 4. Public/private boundary

The public repository owns the generic Companion contracts, generic runtime, demo adapter, synthetic fixtures, tests, WebMCP exposure and public documentation.

Every private host owns its adapter, schema mappings, authentication integration, authorization rules, production prompts, domain rules, production data and deployment-specific configuration. A private adapter consumes the public contract from the private repository. It is never copied into the public repository.

## 5. Repository independence

The repository must be created from an empty directory with new Git history. It must not be derived by copying, forking, filtering or exporting a private repository.

It must build, test and demonstrate without access to any private host repository. No path, import, environment variable, schema, fixture or instruction may require a private host.

## 6. Data policy

Only synthetic data created for demonstration and testing is permitted. Synthetic records must not be transformations, paraphrases or deidentifications of real people or cases.

The repository must not contain personal data, student data, family data, professional records, production logs, secrets or private prompts.

## 7. Core contracts

The generic boundary will support concepts equivalent to:

```ts
type SubjectRef = {
  id: string
  displayName: string
}

type CaptureInput = {
  subject: SubjectRef
  capturedAt: string
  source: 'voice' | 'text'
  rawText: string
}

type StructuredObservation = {
  schemaVersion: 1
  subject: SubjectRef
  capturedAt: string
  rawText: string
  observation: string
  strategy: string | null
  response: string | null
  followUp: string | null
  uncertainties: string[]
}

type ConfirmedObservation = StructuredObservation & {
  confirmedAt: string
}

type RetrievalRequest = {
  subjectId: string
  question: string
}

type GroundedAnswer = {
  answer: string
  evidenceRecordIds: string[]
  subjectMemoryEmpty: boolean
  sufficiencyAssessment: "external_agent"
}
```

The application and WebMCP layer must call the same internal capabilities. Missing information remains missing. A draft cannot become memory before explicit confirmation. Retrieval filters by subject before context reaches a model.

## 8. Hard gates

The project is governed by four hard gates:

- **HG-01 — Fidelity:** structured memory preserves the meaning of the source.
- **HG-02 — Low friction:** capture is clearly easier than the manual alternative under test.
- **HG-03 — WebMCP viability:** at least one real capability is callable through WebMCP using the application’s internal contract without duplicated business logic.
- **HG-04 — Publishable isolation:** the repository builds, tests and demonstrates independently and contains no private-host material or dependency.

A failed hard gate blocks a competition-ready result.

## 9. Evidence and decisions

Tests must produce evidence that can be traced to a gate or acceptance criterion. Features without such a relationship are deferred.

Human review remains required before persistence and for any decision derived from stored memory. Generated content is not silently promoted to fact.

## 10. Initial state

This charter authorizes no implementation by itself. Repository creation, initial files, Git initialization and future implementation require separately approved and authorized operations.
