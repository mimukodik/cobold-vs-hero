# HLD - Review Readiness Matrix

## Goal

Show how a proposed delivery move becomes a review readiness matrix across
backend, BFF, frontend, and verification surfaces.

This HLD is intentionally compact. It aligns the team before an agent or
developer implements the slice, and it gives reviewers a stable context
artifact for the loop.

## Scope

In scope:

- Structured review readiness request.
- Required evidence derived from affected surfaces and risk flags.
- Missing evidence calculation.
- Production release rollback evidence.
- Review matrix rows for affected surfaces.
- Backend, BFF, frontend, contract, smoke, and automation boundary updates.
- Runtime status flow for the NestJS BFF and Spring Boot backend.

Out of scope:

- Authentication.
- Persistence.
- User management.
- Real scoring framework.
- Production topology.
- Historical reporting.
- Enterprise workflow integration.

## System Context

```text
Hero proposer / reviewer
-> Angular UI
-> NestJS BFF
-> Spring Boot API
-> Review readiness response
-> Cobold reviewer / human decision

Angular UI
-> NestJS BFF status endpoint
-> Spring Boot API status endpoint
-> Runtime status panel
```

Canonical contract diagrams:

- `contracts/plantuml/briefing-flow.puml`
- `contracts/plantuml/briefing-state.puml`

## Component Responsibilities

| Component | Responsibility |
| --- | --- |
| Angular UI | Collect change title, description, affected surfaces, and risk flags. Guide evidence through attachment and reviewer approval, then render the current readiness state. |
| NestJS BFF | Keep the UI contract stable, map backend field names to UI-facing names, and aggregate BFF/backend runtime status. |
| Spring Boot API | Derive required evidence, missing evidence, release-blocking rollback checks, signal, stop condition, next action, and review matrix rows. |
| Contracts | Keep OpenAPI, PlantUML, and sample payloads aligned with behavior. |
| Bruno | Provide participant-friendly API smoke checks during development. |
| Playwright smoke | Provide quick browser-visible evidence for the rendered matrix. |
| Testautomation | Provide heavier DPS-like API and OneCare-like UI automation gates from outside the code. |

## Solution Flow

1. The Hero proposer describes a change.
2. The user selects affected surfaces and risk flags.
3. The BFF forwards the structured request to the backend without owning
   readiness rules.
4. The backend derives required evidence from surfaces and risk flags.
5. If `production` is selected, the backend requires `rollback` evidence that
   explains how production can be restored if the release fails.
6. Every required evidence item starts as `planned`.
7. The developer attaches each item, and its assigned reviewer approves or
   rejects it.
8. The backend derives `truce`, `sparring`, or `shield-wall` from the current
   approval state and risk flags.
9. The backend returns required and missing evidence, evidence states, gaps,
   stop condition, next action, and one matrix row per affected surface.
10. The BFF maps `heroNextStep` to `nextAction` for the UI.
11. The UI renders the evidence workflow, matrix, and status panel for review.
12. The team uses contract samples, smoke checks, automation, and browser
    evidence to decide whether the slice is review-ready.

## Key Decisions

- The backend owns readiness rules and evidence derivation.
- Production readiness always requires rollback evidence before release review.
- The BFF owns field-name translation and aggregate status only.
- The frontend owns input ergonomics and matrix readability.
- The contract package is the executable agreement between solution, code, and
  verification.
- The demo uses deterministic rules instead of model output so participants can
  inspect cause and effect.

## Assumptions

- HLD/LLD stay short enough to review during the workshop.
- Browser evidence can be captured live or replayed from a prepared run.
- The status panel remains a shallow BFF/backend reachability signal.

## Risks

- The implementation may expand into persistence, auth, or real scoring too
  early.
- The matrix can become process theater if required evidence is not tied to
  affected surfaces and risk flags.
- The BFF can accidentally hide backend validation or contract behavior.
- UI wording can look successful while API behavior is still unverified.
- Diagrams, OpenAPI, samples, smoke checks, and automation can drift unless they
  are part of the review checklist.

## HLD Done Condition

- System boundaries are clear.
- The sequence and state diagrams match the intended flow.
- Ownership of backend, BFF, frontend, contracts, and verification behavior is
  explicit.
- Risks and non-goals are visible before implementation.
- The matrix has a clear verification path through backend tests, Bruno,
  Playwright smoke, API automation, and UI automation.
