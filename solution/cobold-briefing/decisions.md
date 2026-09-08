# Solution Decisions

## D01 - Review Readiness Matrix As Baseline

Status: Accepted

### Context

The workshop repo should start from a complete vertical slice rather than a
half-documented intermediate state. The current teaching goal is to show idea
to deployed, reviewable software with visible evidence.

### Decision

Treat the Review Readiness Matrix as the baseline feature. It supersedes the
older free-text review-signal-only flow.

### Consequences

- Participants see backend, BFF, frontend, contracts, smoke checks, automation,
  and deployment operating on one feature shape.
- The numbered historical workshop branches remain useful as history, but the
  main repo describes the current baseline.
- Documentation and tests should prefer matrix language: affected surfaces,
  evidence state, missing evidence, stop condition, and review matrix rows.

## D02 - Backend Owns Readiness Rules

Status: Accepted

### Context

The matrix needs deterministic behavior that can be verified by backend tests,
API smoke tests, DPS-like automation, and browser evidence.

### Decision

The Spring Boot backend owns readiness rule evaluation:

- derive required evidence from affected surfaces
- add risk-driven evidence requirements
- compute missing evidence
- derive the readiness signal
- build review matrix rows
- return stop condition and next action

The BFF maps field names and keeps the UI contract stable. It does not duplicate
readiness rules.

### Consequences

- API-level tests can prove the core behavior without inspecting frontend code.
- The BFF has a meaningful but thin mapping responsibility.
- UI changes remain focused on rendering and readability.

## D03 - Contracts And Harnesses Are Part Of The Baseline

Status: Accepted

### Context

The workshop needs a real feedback loop, not just an implementation prompt.

### Decision

Keep OpenAPI, PlantUML, sample payloads, Bruno smoke, Playwright UI smoke,
DPS-like API automation, and OneCare-like UI automation aligned with the matrix
contract.

### Consequences

- Drift between solution, contract, code, and tests becomes visible quickly.
- Failed smoke or automation checks can be pasted directly into a repair prompt.
- The final repo demonstrates target, error, correction, evidence, and human
  review as one loop.

## D04 - Production Needs Rollback Evidence

Status: Accepted

### Context

Production review needs one release-specific question that normal test evidence
does not answer: how the team restores service if the release fails.

### Decision

Treat `rollback` as risk-driven evidence. When `production` is selected in the
readiness request, the backend must require `rollback` evidence. Missing
`rollback` is an immediate `shield-wall` release blocker even when surface,
design, smoke, browser, and automation evidence is otherwise present.

### Consequences

- Production readiness is not reduced to test pass/fail status.
- Reviewers can see the release safety gap before implementation or release.
- The OpenAPI enum, samples, smoke checks, automation, UI options, and backend
  rules must stay aligned around the `rollback` evidence value.

## D05 - Backend Owns Evidence Approval State

Status: Accepted

Evidence moves through `planned -> attached -> approved`; rejection moves
`attached -> planned` and requires a reviewer comment. The Spring backend owns
state, transition validation, role permissions, and the rule that only approved
required evidence makes a briefing `READY`. The BFF only maps and forwards the
attach/approve/reject operations. The UI supplies a non-authenticated role
switcher for workshop use.
