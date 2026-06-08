# @agentforge/telemetry

OpenTelemetry setup, structured logging with **secret redaction**, and cost/token
metering. This is the observability baseline every service builds on.

## What it provides

- **`initTelemetry()`** — sets up OTLP trace + metric export to the collector. Call once
  at process start. When no `OTEL_EXPORTER_OTLP_ENDPOINT` is set, spans/metrics become
  local no-ops, so tests and bare runs don't error. `shutdownTelemetry()` flushes on exit.
- **`getTracer()` / `getMeter()`** — access the global tracer/meter for manual
  instrumentation.
- **`logger` / `createLogger()`** — pino structured JSON logging with **always-on secret
  redaction** (`Authorization`, `*token*`, `*secret*`, cookies, …). This is the mechanism
  behind "secrets never appear in logs". Redaction is key-name based and best-effort —
  a safety net, not a license to log secret values.
- **`recordUsage()`** — record LLM token/cost as metrics, tagged by tenant/provider/model
  (seeds cost tracking and DORA concentration-risk monitoring).

## Configuration (env)

| Variable                      | Purpose                                  |
| ----------------------------- | ---------------------------------------- |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | Collector base URL (enables export)      |
| `OTEL_SERVICE_NAME`           | Service name on spans/metrics             |
| `OTEL_SERVICE_VERSION`        | Service version                           |
| `LOG_LEVEL`                   | pino level (default `info`)               |
| `OTEL_SDK_DISABLED=true`      | Force no-op even with an endpoint set     |

## Notes

We use **manual instrumentation** (explicit spans, e.g. the API's request interceptor)
rather than auto-instrumentation: it is robust under ESM and keeps the "every action is
a span" guarantee explicit.
