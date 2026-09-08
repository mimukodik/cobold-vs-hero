# Frontend

Angular UI for the Cobold vs Hero Review Readiness Matrix.

## Responsibilities

- Render the BFF/backend runtime status panel.
- Collect change title, description, affected surfaces, and risk flags.
- Guide evidence through attachment and reviewer approval.
- Call the BFF through `/api/cobold-vs-hero/*`.
- Render signal, stop condition, next action, required evidence, missing
  evidence, and matrix rows.
- Initialize Datadog browser RUM/logs from runtime config when deployed with
  observability enabled.

The frontend does not own readiness rules. It displays the BFF contract.

## Main Files

| Path | Purpose |
| --- | --- |
| `src/app/app.ts` | UI state, form options, API calls, status helpers. |
| `src/app/app.html` | Page structure, status panel, form, result matrix. |
| `src/app/app.scss` | Component styling. |
| `src/datadog.ts` | Browser observability initialization. |
| `proxy.conf.json` | Local `/api` proxy to the BFF. |
| `nginx.conf.template` | Container nginx config and deployed `/api` proxy fallback. |
| `Dockerfile` | Deployable frontend image. |

## Run

Install dependencies once:

```bash
mise run fe:install
```

Start the dev server:

```bash
mise run fe:start
```

Open `http://localhost:4200`.

The dev server proxies `/api` to `http://localhost:3000`.

## Build

```bash
mise run fe:build
```

## Smoke

With backend, BFF, and frontend running:

```bash
mise run ui:smoke
```

For the heavier Python/Playwright UI lane:

```bash
mise run ui:testautomation
```
