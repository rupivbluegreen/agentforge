import {
  BadRequestException,
  Controller,
  Get,
  Inject,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response, CookieOptions } from 'express';
import { logger } from '@agentforge/telemetry';
import { APP_CONFIG } from '../tokens.js';
import type { AppConfig } from '../config/app-config.js';
import { OidcService } from './oidc.service.js';
import { TenantService } from './tenant.service.js';
import { SessionGuard } from './session.guard.js';
import { CurrentSession } from './current-session.decorator.js';
import {
  OIDC_FLOW_COOKIE,
  SESSION_COOKIE,
  openCookie,
  sealCookie,
  type OidcFlowData,
  type SessionData,
} from './session.js';

@Controller('auth')
export class AuthController {
  constructor(
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    private readonly oidc: OidcService,
    private readonly tenants: TenantService,
  ) {}

  private cookieOpts(maxAgeMs: number): CookieOptions {
    return {
      httpOnly: true,
      secure: this.config.cookieSecure,
      sameSite: 'lax',
      path: '/',
      maxAge: maxAgeMs,
    };
  }

  /** Begin login: redirect to the IdP with PKCE + CSRF state stashed in a signed cookie. */
  @Get('login')
  async login(@Res() res: Response): Promise<void> {
    const { url, state, nonce, codeVerifier } = await this.oidc.createAuthRequest();
    const flow: OidcFlowData = { state, nonce, codeVerifier };
    res.cookie(
      OIDC_FLOW_COOKIE,
      sealCookie(flow, this.config.sessionSecret),
      this.cookieOpts(600_000),
    );
    res.redirect(url);
  }

  /** OIDC redirect target: validate the response, resolve the tenant, set the session. */
  @Get('callback')
  async callback(@Req() req: Request, @Res() res: Response): Promise<void> {
    const cookies = (req.cookies ?? {}) as Record<string, string>;
    const flow = openCookie<OidcFlowData>(cookies[OIDC_FLOW_COOKIE], this.config.sessionSecret);
    if (!flow) throw new BadRequestException('Missing or invalid OIDC flow state');

    const tokenSet = await this.oidc.exchangeCallback(req, {
      state: flow.state,
      nonce: flow.nonce,
      codeVerifier: flow.codeVerifier,
    });
    const claims = tokenSet.claims() as Record<string, unknown>;

    const tenantSlug =
      typeof claims.tenant === 'string' && claims.tenant ? claims.tenant : 'default';
    const tenant = await this.tenants.resolveBySlug(tenantSlug);

    const session: SessionData = {
      sub: String(claims.sub),
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      ...(typeof claims.email === 'string' ? { email: claims.email } : {}),
      ...(typeof claims.name === 'string' ? { name: claims.name } : {}),
    };

    res.clearCookie(OIDC_FLOW_COOKIE, { path: '/' });
    res.cookie(
      SESSION_COOKIE,
      sealCookie(session, this.config.sessionSecret),
      this.cookieOpts(8 * 3600_000),
    );
    logger.info({ sub: session.sub, tenantSlug: session.tenantSlug }, 'user authenticated');
    res.redirect(this.config.postLoginRedirect);
  }

  /** The current authenticated principal. */
  @Get('me')
  @UseGuards(SessionGuard)
  me(@CurrentSession() session: SessionData): SessionData {
    return session;
  }

  /** Clear the local session. */
  @Post('logout')
  logout(@Res() res: Response): void {
    res.clearCookie(SESSION_COOKIE, { path: '/' });
    res.json({ ok: true });
  }
}
