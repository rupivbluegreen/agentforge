import { metrics, trace, type Meter, type Tracer } from '@opentelemetry/api';
import { Resource } from '@opentelemetry/resources';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { MeterProvider, PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';
import { telemetryConfigFromEnv, type TelemetryConfig } from './config.js';
import { logger } from './logger.js';

let started = false;
let shutdownFns: Array<() => Promise<void>> = [];

/**
 * Initialize OpenTelemetry tracing and metrics. Call ONCE, as early as possible at
 * process start (before the app does work worth tracing). Idempotent.
 *
 * When export is disabled (no OTLP endpoint), a tracer provider is still registered so
 * `getTracer()`/spans work as local no-ops — code can always assume a tracer exists.
 */
export function initTelemetry(config: TelemetryConfig = telemetryConfigFromEnv()): void {
  if (started) return;
  started = true;

  const resource = new Resource({
    [ATTR_SERVICE_NAME]: config.serviceName,
    [ATTR_SERVICE_VERSION]: config.serviceVersion,
    'deployment.environment': config.environment,
  });

  const provider = new NodeTracerProvider({ resource });

  if (!config.enabled) {
    provider.register();
    logger.info('telemetry export disabled (set OTEL_EXPORTER_OTLP_ENDPOINT to enable)');
    return;
  }

  provider.addSpanProcessor(
    new BatchSpanProcessor(new OTLPTraceExporter({ url: `${config.otlpEndpoint}/v1/traces` })),
  );
  provider.register();
  shutdownFns.push(() => provider.shutdown());

  const meterProvider = new MeterProvider({
    resource,
    readers: [
      new PeriodicExportingMetricReader({
        exporter: new OTLPMetricExporter({ url: `${config.otlpEndpoint}/v1/metrics` }),
        exportIntervalMillis: 15_000,
      }),
    ],
  });
  metrics.setGlobalMeterProvider(meterProvider);
  shutdownFns.push(() => meterProvider.shutdown());

  logger.info(
    { endpoint: config.otlpEndpoint, service: config.serviceName },
    'telemetry initialized',
  );
}

/** Flush and shut down exporters. Call on graceful shutdown. */
export async function shutdownTelemetry(): Promise<void> {
  await Promise.all(shutdownFns.map((fn) => fn().catch(() => undefined)));
  shutdownFns = [];
  started = false;
}

export function getTracer(name = 'agentforge'): Tracer {
  return trace.getTracer(name);
}

export function getMeter(name = 'agentforge'): Meter {
  return metrics.getMeter(name);
}
