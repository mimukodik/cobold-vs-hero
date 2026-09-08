# Demo feladat: Cobold vs Hero Review Readiness Matrix

Angol verzió: [demo-task.md](demo-task.md).

## Kiinduló állapot

A repo egy működő Cobold vs Hero review readiness eszközzel indul.

A Hero proposer megad egy tervezett delivery lépést, az érintett felületeket, a
rendelkezésre álló bizonyítékokat és a risk flag-eket. Az app readiness signalt
ad:

- `truce` - biztonságos kezdő szelet
- `sparring` - hasznos ötlet, de pontosabb acceptance criteria kell
- `shield-wall` - túl kockázatos; implementáció előtt szét kell bontani

A baseline már tartalmazza:

- Java backend osztályozás
- NestJS BFF mapping
- Angular UI renderelés
- OpenAPI, PlantUML és minta payloadok
- Bruno API smoke ellenőrzések
- Playwright UI smoke ellenőrzések
- DPS-szerű Python API testautomation
- OneCare-szerű Python UI testautomation
- könnyű HLD/LLD: `solution/cobold-briefing/`

Ez a baseline szándékosan elég teljes ahhoz, hogy a résztvevők ne repo
bootstrapon dolgozzanak, hanem az AI delivery loop javítását gyakorolják.

## Feature szándék

Kiinduló kérés:

> The briefing is too vague. Make it useful enough that a team can decide
> whether a proposed change is safe to start, needs sharper acceptance criteria,
> or must be split before implementation.

Implementált scope:

> Egy tervezett delivery lépéshez a felhasználó kiválasztja az érintett
> felületeket és a rendelkezésre álló bizonyítékokat. A rendszer readiness
> signalt, szükséges bizonyítékokat, hiányzó bizonyítékokat, stop conditiont,
> következő lépést és review readiness matrixot ad vissza. A UI olvashatóvá
> teszi a matrixot, a viselkedést Bruno, DPS-szerű automatizáció és böngészős
> bizonyíték ellenőrzi.

## Aktuális API

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

## Elfogadási feltételek

- A backend strukturált readiness inputot fogad.
- A backend érintett felületek és risk flag-ek alapján vezeti le a szükséges
  bizonyítékokat.
- A backend explicit hiányzó bizonyítékokat ad vissza.
- A backend hasznos stop conditiont és next actiont ad.
- A BFF backend mezőket UI-facing DTO-ra mapel, readiness logika duplikálása
  nélkül.
- A UI olvasható matrixot renderel: surface, expected evidence, provided
  evidence, gap és next action.
- Bruno smoke lefedi a reprezentatív `truce`, `sparring` és `shield-wall`
  eseteket.
- DPS-szerű automatizáció ellenőrzi a required evidence és missing evidence
  viselkedést.
- Böngészős bizonyíték mutatja, hogy a matrix olvasható.

## Non-goals

- Persistence.
- Authentication.
- User management.
- Valódi risk scoring engine.
- Historical reporting.
- Enterprise workflow integráció.
- Nagy UI redesign.
