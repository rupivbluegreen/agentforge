import { pino, type Logger } from 'pino';
import { PINO_REDACT_PATHS, REDACTED } from './redaction.js';

export type { Logger };

export interface LoggerOptions {
  name?: string;
  level?: string;
}

/**
 * Create a structured JSON logger with secret redaction always on. Logs go to stdout;
 * in the docker stack the OpenTelemetry collector ships them to Loki. Trace correlation
 * (trace_id/span_id) is added by callers within an active span.
 */
export function createLogger(opts: LoggerOptions = {}): Logger {
  return pino({
    name: opts.name ?? process.env.OTEL_SERVICE_NAME ?? 'agentforge',
    level: opts.level ?? process.env.LOG_LEVEL ?? 'info',
    redact: { paths: PINO_REDACT_PATHS, censor: REDACTED },
    formatters: {
      level: (label) => ({ level: label }),
    },
    timestamp: pino.stdTimeFunctions.isoTime,
  });
}

/** Shared default logger. */
export const logger = createLogger();
