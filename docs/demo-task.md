# Demo Task: Cobold vs Hero Review Readiness Matrix

Hungarian version: [demo-task.hu.md](demo-task.hu.md).

## Starting Point

The repo starts with a working Cobold vs Hero review readiness tool.

The Hero proposer enters a proposed delivery move, affected surfaces, available
evidence, and risk flags. The app returns a readiness signal:

- `truce` - safe starter slice
- `sparring` - useful idea, needs sharper acceptance criteria
- `shield-wall` - too risky; split the task before implementation

The baseline already includes:

- Java backend classification
- NestJS BFF mapping
- Angular UI rendering
- OpenAPI, PlantUML, and sample payloads
- Bruno API smoke checks
- Playwright UI smoke checks
- DPS-like Python API testautomation
- OneCare-like Python UI testautomation
- lightweight HLD/LLD in `solution/cobold-briefing/`

This baseline is intentionally complete enough for workshop participants to
practice improving the AI delivery loop instead of bootstrapping a repo from
nothing.

## Feature Intent

Starting request:

> The briefing is too vague. Make it useful enough that a team can decide
> whether a proposed change is safe to start, needs sharper acceptance criteria,
> or must be split before implementation.

Implemented scope:

> For a proposed delivery move, let the user choose affected surfaces and
> available evidence. The system should return a readiness signal, required
> evidence, missing evidence, stop condition, next action, and a review readiness
> matrix. The UI should make the matrix readable, and the behavior should be
> verified through Bruno, DPS-like automation, and browser evidence.

## Current API

`POST /api/cobold-vs-hero/briefing`

Request:

```json
{
  "changeTitle": "Billing retry status panel",
  "changeDescription": "Add one backend endpoint, one BFF mapper, and one Angular panel.",
  "affectedSurfaces": ["backend", "bff", "frontend", "contract", "testing"],
  "riskFlags": ["customer-data", "unclear-scope"]
}
```

Response:

```json
{
  "signal": "sparring",
  "headline": "Useful slice, but evidence is incomplete.",
  "requiredEvidence": ["backend-test", "bruno-smoke", "dps-testautomation", "browser-screenshot", "hld", "lld"],
  "missingEvidence": ["bruno-smoke", "dps-testautomation", "browser-screenshot"],
  "stopCondition": "Do not request implementation review until API smoke and browser evidence are planned.",
  "heroNextStep": "Add Bruno smoke and browser evidence before implementation review.",
  "reviewMatrix": [
    {
      "surface": "backend",
      "expectedEvidence": ["backend-test"],
      "providedEvidence": ["backend-test"],
      "gap": "covered",
      "nextAction": "Keep backend assertion attached to the PR."
    }
  ]
}
```

## Acceptance Criteria

- The backend accepts structured readiness input.
- The backend derives required evidence from affected surfaces and risk flags.
- The backend returns explicit missing evidence.
- The backend returns a useful stop condition and next action.
- The BFF maps backend fields into the UI-facing DTO without duplicating
  readiness logic.
- The UI renders a readable matrix with surface, expected evidence, provided
  evidence, gap, and next action.
- Bruno smoke covers representative `truce`, `sparring`, and `shield-wall`
  readiness cases.
- DPS-like automation verifies required evidence and missing evidence.
- Browser evidence proves the matrix is readable.

## Non-Goals

- Persistence.
- Authentication.
- User management.
- Real risk scoring engine.
- Historical reporting.
- Enterprise workflow integration.
- Large UI redesign.
