import {
  Inject,
  Injectable,
  UnauthorizedException,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import type { Request } from 'express';
import { APP_CONFIG } from '../tokens.js';
import type { AppConfig } from '../config/app-config.js';
import { openCookie, SESSION_COOKIE, type SessionData } from './session.js';

/** Request augmented with the verified session (set by the guard). */
export interface AuthedRequest extends Request {
  session?: SessionData;
}

/**
 * Authenticates a request by verifying the signed session cookie. On success the
 * decoded session is attached to the request; on failure the request is rejected (and
 * the denial is observable via the standard 401 path + access log).
 */
@Injectable()
export class SessionGuard implements CanActivate {
  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<AuthedRequest>();
    const cookies = (req.cookies ?? {}) as Record<string, string>;
    const session = openCookie<SessionData>(cookies[SESSION_COOKIE], this.config.sessionSecret);
    if (!session) {
      throw new UnauthorizedException('Authentication required');
    }
    req.session = session;
    return true;
  }
}
