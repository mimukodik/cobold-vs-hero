# LLD - Review Readiness Endpoint

## Endpoints

`POST /api/cobold-vs-hero/briefing`

`GET /api/cobold-vs-hero/status`

`POST /api/cobold-vs-hero/briefings/{briefingId}/evidence/{evidenceId}/{attach|approve|reject}`

Canonical contract:

- `contracts/openapi/cobold-briefing-api.yaml`

Representative examples:

- `contracts/samples/truce-request.json`
- `contracts/samples/truce-response.json`
- `contracts/samples/sparring-request.json`
- `contracts/samples/sparring-response.json`
- `contracts/samples/shield-wall-request.json`
- `contracts/samples/shield-wall-response.json`
- `contracts/samples/status-response.json`

## Request

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `changeTitle` | string | yes | Short name for the proposed delivery move. |
| `changeDescription` | string | yes | Summary of the delivery intent. |
| `affectedSurfaces` | string[] | yes | Any of `backend`, `bff`, `frontend`, `contract`, `testing`. |
| `riskFlags` | string[] | yes | Any of `production`, `customer-data`, `auth`, `payment`, `unclear-scope`. |

## Backend Response

| Field | Type | Notes |
| --- | --- | --- |
| `signal` | string | `truce`, `sparring`, or `shield-wall`. |
| `headline` | string | Short human-readable readiness summary. |
| `requiredEvidence` | string[] | Evidence expected from surfaces and risk flags. |
| `missingEvidence` | string[] | Required evidence that has not yet been approved. |
| `stopCondition` | string | When the team should stop rather than implement. |
| `heroNextStep` | string | Recommended next delivery action. |
| `reviewMatrix` | object[] | One row per affected surface. |
| `readinessVerdict` | string | `READY` only when every required item is `approved`; otherwise `NOT_READY`. |
| `evidenceItems` | object[] | State, URL, reviewer role, and rejection comment per required item. |
| `gaps` | object[] | Next step and responsible party per non-approved item. |

## Evidence Approval State Machine

- `planned -> attached`: developer only, non-blank URL required.
- `attached -> approved`: assigned reviewer role only.
- `attached -> planned`: assigned reviewer role only, non-blank rejection comment required.
- Any other transition returns a conflict response.
- Planned gaps say `csatolásra vár: Fejlesztő`; attached gaps say
  `jóváhagyásra vár: <role>`.
- Bruno smoke and backend tests use API reviewer; browser screenshots use UI
  reviewer. HLD/LLD use the Tech lead for production or authentication risk,
  otherwise the API reviewer acts as the designated peer reviewer.

Review matrix row:

| Field | Type | Notes |
| --- | --- | --- |
| `surface` | string | Affected surface. |
| `expectedEvidence` | string[] | Evidence expected for the surface. |
| `providedEvidence` | string[] | Matching evidence already provided. |
| `gap` | string | `covered` or a short missing-evidence summary. |
| `nextAction` | string | What the team should do for this surface. |

## BFF Mapping

| Backend field | UI field |
| --- | --- |
| `signal` | `signal` |
| `headline` | `headline` |
| `requiredEvidence` | `requiredEvidence` |
| `missingEvidence` | `missingEvidence` |
| `stopCondition` | `stopCondition` |
| `heroNextStep` | `nextAction` |
| `reviewMatrix` | `reviewMatrix` |

The BFF should stay thin. It maps field names and forwards behavior; it does not
own readiness rules.

## Evidence Rules

Evidence vocabulary:

| Evidence | Meaning |
| --- | --- |
| `backend-test` | Focused backend assertion for the changed behavior. |
| `bruno-smoke` | API smoke request proving the BFF/API contract path. |
| `dps-testautomation` | Heavier API automation from outside the code under test. |
| `browser-screenshot` | Browser-visible proof of the rendered matrix or changed UI. |
| `hld` | Reviewed high-level solution intent. |
| `lld` | Reviewed low-level behavior and mapping rules. |
| `rollback` | Production rollback path explaining how to restore service if the release fails. |

Base evidence by surface:

| Surface | Required evidence |
| --- | --- |
| `backend` | `backend-test` |
| `bff` | `bruno-smoke` |
| `frontend` | `browser-screenshot` |
| `contract` | `bruno-smoke` |
| `testing` | `dps-testautomation` |

Design evidence:

- Any multi-surface change requires `hld` and `lld`.
- `unclear-scope` requires `hld` and `lld`.

Risk evidence:

| Risk flag | Additional evidence |
| --- | --- |
| `production` | `dps-testautomation`, `browser-screenshot`, `rollback` |
| `customer-data` | `dps-testautomation` |
| `auth` | `dps-testautomation` |
| `payment` | `dps-testautomation`, `browser-screenshot` |
| `unclear-scope` | `hld`, `lld` |

Release gate:

- If `production` is present in `riskFlags`, `rollback` is required.
- Missing `rollback` with `production` returns `shield-wall` even if all
  surface, design, smoke, browser, and automation evidence is present.
- `rollback` is risk-driven evidence. It appears in `requiredEvidence` and
  `missingEvidence`; review matrix rows stay surface-focused.

## Signal Rules

| Condition | Signal |
| --- | --- |
| no missing evidence and no high-risk flags | `truce` |
| no missing evidence with a high-risk flag | `sparring` |
| one or two missing evidence items and no high-risk flags | `sparring` |
| `production` selected without `rollback` evidence | `shield-wall` |
| more than two missing evidence items, or any `production`, `payment`, or `auth` flag with missing evidence | `shield-wall` |

## Status Response

The UI calls the BFF status endpoint. The BFF reports itself as `bff-nestjs`,
then probes the backend status endpoint and returns both service entries.

| Field | Type | Notes |
| --- | --- | --- |
| `status` | string | `UP` when both services are up, otherwise `DEGRADED`. |
| `checkedAt` | string | ISO timestamp for the aggregate check. |
| `services` | object[] | Ordered service status entries for BFF then backend. |

## Validation

- Blank `changeTitle` is invalid.
- Blank `changeDescription` is invalid.
- Empty `affectedSurfaces` is invalid.
- `riskFlags` is a required array and may be empty.
- OpenAPI limits known surfaces, evidence values, and risk flags to the listed
  enums.

## Verification Cases

| Case | Expected signal | Evidence |
| --- | --- | --- |
| Small backend change with backend test | `truce` | Backend unit test, Bruno smoke, DPS-like testautomation. |
| Multi-surface UI/API change missing browser and smoke evidence | `sparring` | Bruno smoke and DPS-like testautomation assert missing evidence. |
| Production release with all normal proof but missing rollback evidence | `shield-wall` | Backend unit test, Bruno smoke, DPS-like testautomation, browser result panel. |
| Production payment or auth change missing automation/browser proof | `shield-wall` | Backend unit test, Bruno smoke, DPS-like testautomation, browser result panel. |
| BFF and backend runtime status | `UP` | Backend unit test, Bruno smoke, DPS-like testautomation, browser status panel. |

## LLD Done Condition

- OpenAPI request/response shape matches backend behavior.
- BFF mapping table matches implementation.
- Samples, Bruno smoke requests, Playwright smoke, DPS-like API automation, and
  OneCare-like UI automation cover representative behavior.
- Validation behavior and known gaps are explicit.
- Browser evidence shows the matrix fields that API smoke checks assert.
