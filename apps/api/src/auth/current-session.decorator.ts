import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { AuthedRequest } from './session.guard.js';
import type { SessionData } from './session.js';

/** Injects the verified {@link SessionData} for the current request. */
export const CurrentSession = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): SessionData => {
    const req = ctx.switchToHttp().getRequest<AuthedRequest>();
    if (!req.session) {
      // Should never happen: routes using this decorator are guarded by SessionGuard.
      throw new Error('CurrentSession used on a route without SessionGuard');
    }
    return req.session;
  },
);
