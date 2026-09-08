# Datadog observability

This repo is wired for Datadog as the workshop observability path. The app code
contains the language/browser SDKs, and Kubernetes supplies the Datadog Agent,
runtime tags, trace intake, and log collection.

## What this covers

- Angular browser RUM, browser errors, session replay, browser logs, and trace
  propagation into `/api` calls.
- NestJS BFF traces through `dd-trace`, loaded before Nest imports.
- Java backend traces through `dd-java-agent.jar`, baked into the backend image.
- Kubernetes logs, APM intake, container/process visibility, events, and pod
  metadata through the Datadog Agent Helm chart.
- Unified service tagging through `DD_ENV`, `DD_SERVICE`, `DD_VERSION`, and
  `tags.datadoghq.com/*` Kubernetes labels.
- Language-specific log autodiscovery for nginx, Node.js, and Java containers,
  plus trace-aware application logs in the BFF and backend request path.
- Explicit `DD_TRACE_SAMPLING_RULES='[{"sample_rate":1.0}]'` for the workshop
  environment so demo requests are retained as traces, not only as APM stats.

## Credentials

No Datadog credentials belong in Git.

You need these values from Datadog:

- `DATADOG_API_KEY`: server-side API key for the Kubernetes Agent.
- `DATADOG_SITE`: your Datadog site, for example `datadoghq.com` or
  `datadoghq.eu`.
- `DATADOG_RUM_APPLICATION_ID`: the browser RUM application ID.
- `DATADOG_RUM_CLIENT_TOKEN`: the browser client token. This is intentionally
  browser-exposed; do not use a Datadog API key in the browser.

For the fastest local setup, create a 1Password item named
`datadog-pragmatic-ai.engineer` with these fields:

| Field                | Value                                                       |
| -------------------- | ----------------------------------------------------------- |
| `site`               | Datadog site, for example `datadoghq.eu` or `datadoghq.com` |
| `api_key`            | Datadog API key for the Kubernetes Agent                    |
| `rum_application_id` | Browser RUM application ID                                  |
| `rum_client_token`   | Browser RUM client token                                    |

The API key field may also be named `credential`, matching the existing
1Password helper pattern in this repo. The RUM client token field may also be
named `rum_client_tokentext` if it came from a 1Password text-field label. To
use a different item name, set `OP_DATADOG_ITEM`.

## Install the Datadog Agent

Install the Agent once per cluster:

```bash
export KUBECONFIG=infra/ansible/.generated/kubeconfig-pai
export DATADOG_API_KEY=<api key>
export DATADOG_SITE=<datadog site>

mise run obs:datadog:agent:install
```

Or load the same values from 1Password:

```bash
export KUBECONFIG=infra/ansible/.generated/kubeconfig-pai
mise run obs:datadog:agent:install:op
```

The task creates the `datadog` namespace, stores the API key in the
`datadog-secret` Kubernetes Secret, and installs `datadog/datadog` with:

- Kubernetes log collection enabled for all containers.
- Container log autodiscovery annotations that set the Datadog log `source` and
  service for frontend nginx, the NestJS BFF, and the Java backend.
- APM enabled over the Unix socket and TCP host port `8126`.
- Cluster Agent and admission controller enabled.
- Process, container, event, Kubernetes state, and orchestrator visibility.

The repo disables Datadog Single Step Instrumentation library injection because
the BFF and backend already declare their tracers directly. The admission
controller can still inject Agent communication config for pods labeled with
`admission.datadoghq.com/enabled=true`.

## App deployment

For local Helm testing:

```bash
mise run obs:datadog:helm:template
```

For GitHub Actions deploys, set these repository-level values after the account
exists:

```bash
gh variable set DATADOG_OBSERVABILITY_ENABLED --body true
gh variable set DATADOG_SITE --body <datadog site>
gh variable set DATADOG_RUM_APPLICATION_ID --body <rum application id>
gh secret set DATADOG_RUM_CLIENT_TOKEN --body <rum client token>
```

Or configure those values from the same 1Password item:

```bash
mise run obs:datadog:github:configure:op
```

To install the Agent and configure GitHub in one step:

```bash
export KUBECONFIG=infra/ansible/.generated/kubeconfig-pai
mise run obs:datadog:setup:op
```

The deploy and preview workflows only enable Datadog when
`DATADOG_OBSERVABILITY_ENABLED=true` or the RUM client token exists. Without
those values, the chart renders like the baseline app.

## Trace path

The intended demo trace is:

```text
Angular RUM resource -> frontend nginx /api proxy -> NestJS BFF -> Java backend
```

Angular initializes `@datadog/browser-rum`,
`@datadog/browser-rum-angular`, and `@datadog/browser-logs` from
`/datadog-config.js`. The default runtime config is disabled in Git; Helm mounts
a ConfigMap over that file when browser observability is enabled. The Angular
plugin enables router-based view tracking, and Angular's error handler is wired
to report uncaught framework errors into Datadog RUM.

The RUM SDK adds Datadog and W3C trace-context headers to same-origin `/api/*`
requests. The frontend nginx proxy forwards those headers to the BFF. The BFF
uses `dd-trace`, and the backend image uses the Datadog Java agent, so context
should continue from browser to NestJS to Spring Boot.

The BFF emits JSON request-path logs with `dd.trace_id` and `dd.span_id` when a
request span is active. The backend emits SLF4J/Logback logs with Datadog MDC
fields in the console pattern when the Java agent injects them. Both avoid
logging request descriptions or credential-like values.

## Verification

After installing the Agent and deploying the app with Datadog enabled:

```bash
kubectl -n datadog get pods
kubectl -n cobold get pod -l app.kubernetes.io/component=bff \
  -o jsonpath='{.items[0].metadata.labels.tags\.datadoghq\.com/service}{"\n"}'
kubectl -n cobold get pod -l app.kubernetes.io/component=backend \
  -o jsonpath='{.items[0].spec.containers[0].env[?(@.name=="DD_SERVICE")].value}{"\n"}'
```

Exercise the request path:

```bash
curl https://cobold.pragmatic-ai.engineer/api/cobold-vs-hero/status
curl -X POST https://cobold.pragmatic-ai.engineer/api/cobold-vs-hero/briefing \
  -H 'content-type: application/json' \
  -d '{"changeTitle":"Datadog smoke","changeDescription":"Trace the full request path.","affectedSurfaces":["backend","bff","frontend"],"riskFlags":[]}'
```

Then verify in Datadog:

- Infrastructure and container views show the `pai-cobold-vs-hero` cluster.
- Logs show `frontend`, `bff`, and `backend` container output.
- BFF and backend logs around the `/briefing` request include `dd.trace_id` and
  `dd.span_id` attributes when Datadog tracing is active.
- APM shows `cobold-vs-hero-bff` and `cobold-vs-hero-java`.
- RUM shows `cobold-vs-hero-angular`.
- A browser `/api/cobold-vs-hero/*` resource links to an APM trace containing
  the BFF and backend spans.

## References

- Datadog Kubernetes install: https://docs.datadoghq.com/containers/kubernetes/installation/
- Datadog Kubernetes logs: https://docs.datadoghq.com/containers/kubernetes/log/
- Datadog Kubernetes APM: https://docs.datadoghq.com/containers/kubernetes/apm/
- Datadog Browser RUM: https://docs.datadoghq.com/real_user_monitoring/application_monitoring/browser/setup/client/
- Datadog RUM and traces: https://docs.datadoghq.com/tracing/other_telemetry/rum/
- Datadog Browser Logs: https://docs.datadoghq.com/logs/log_collection/javascript/
- Datadog log/trace correlation: https://docs.datadoghq.com/tracing/other_telemetry/connect_logs_and_traces/
- Datadog Java log correlation: https://docs.datadoghq.com/tracing/other_telemetry/connect_logs_and_traces/java/
- Datadog Node.js log correlation: https://docs.datadoghq.com/tracing/other_telemetry/connect_logs_and_traces/nodejs/
- Datadog Node.js tracing: https://docs.datadoghq.com/tracing/trace_collection/dd_libraries/nodejs/
- Datadog Java tracing: https://docs.datadoghq.com/tracing/trace_collection/dd_libraries/java/
