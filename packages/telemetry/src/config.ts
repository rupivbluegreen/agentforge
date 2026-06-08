export interface TelemetryConfig {
  serviceName: string;
  serviceVersion: string;
  environment: string;
  otlpEndpoint: string | undefined;
  /** When false, tracing/metrics are local no-ops (no exporter). */
  enabled: boolean;
}

/**
 * Derive telemetry configuration from the environment. Export is enabled only when an
 * OTLP endpoint is configured, so tests and bare local runs (no collector) don't error
 * — they just produce no-op spans.
 */
export function telemetryConfigFromEnv(env: NodeJS.ProcessEnv = process.env): TelemetryConfig {
  const otlpEndpoint = env.OTEL_EXPORTER_OTLP_ENDPOINT;
  return {
    serviceName: env.OTEL_SERVICE_NAME ?? 'agentforge',
    serviceVersion: env.OTEL_SERVICE_VERSION ?? '0.0.0',
    environment: env.NODE_ENV ?? 'development',
    otlpEndpoint,
    enabled: Boolean(otlpEndpoint) && env.OTEL_SDK_DISABLED !== 'true',
  };
}
