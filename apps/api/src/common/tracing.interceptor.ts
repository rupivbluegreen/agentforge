import {
  Injectable,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from '@nestjs/common';
import { context, SpanKind, SpanStatusCode, trace } from '@opentelemetry/api';
import { getTracer, logger } from '@agentforge/telemetry';
import { Observable } from 'rxjs';
import type { Request, Response } from 'express';

/**
 * Manually wraps every HTTP request in an OpenTelemetry SERVER span and emits a
 * structured access log. Manual instrumentation (rather than auto-instrumentation) is
 * deliberate: it is robust under ESM and keeps the "every action is a span" guarantee
 * explicit. Never logs request bodies or headers (which may carry secrets).
 */
@Injectable()
export class TracingInterceptor implements NestInterceptor {
  private readonly tracer = getTracer('agentforge.api');

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (ctx.getType() !== 'http') return next.handle();

    const http = ctx.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();
    const route = (req.route as { path?: string } | undefined)?.path ?? req.path;
    const span = this.tracer.startSpan(`${req.method} ${route}`, {
      kind: SpanKind.SERVER,
      attributes: { 'http.method': req.method, 'http.route': route, 'http.target': req.path },
    });
    const start = process.hrtime.bigint();

    return new Observable((subscriber) => {
      context.with(trace.setSpan(context.active(), span), () => {
        const finish = (statusCode: number): void => {
          const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
          span.setAttribute('http.status_code', statusCode);
          span.end();
          logger.info(
            { method: req.method, route, status: statusCode, durationMs: Math.round(durationMs) },
            'request',
          );
        };

        next.handle().subscribe({
          next: (value) => subscriber.next(value),
          error: (err: unknown) => {
            span.recordException(err as Error);
            span.setStatus({ code: SpanStatusCode.ERROR });
            finish(res.statusCode || 500);
            subscriber.error(err);
          },
          complete: () => {
            finish(res.statusCode || 200);
            subscriber.complete();
          },
        });
      });
    });
  }
}
