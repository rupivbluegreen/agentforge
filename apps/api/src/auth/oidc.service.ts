import { Inject, Injectable } from '@nestjs/common';
import { Issuer, generators, type Client, type TokenSet } from 'openid-client';
import { logger } from '@agentforge/telemetry';
import type { IncomingMessage } from 'node:http';
import { APP_CONFIG } from '../tokens.js';
import type { AppConfig } from '../config/app-config.js';

export interface AuthRequest {
  url: string;
  state: string;
  nonce: string;
  codeVerifier: string;
}

/**
 * Thin wrapper over openid-client implementing the OIDC Authorization Code flow with
 * PKCE. The client is discovered lazily (with a short retry) so the API can start and
 * serve health checks even if the IdP isn't up yet.
 */
@Injectable()
export class OidcService {
  private clientPromise: Promise<Client> | undefined;

  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {}

  private async discover(): Promise<Client> {
    const { issuerUrl, clientId, clientSecret, redirectUri } = this.config.oidc;
    let lastErr: unknown;
    for (let attempt = 1; attempt <= 5; attempt++) {
      try {
        const issuer = await Issuer.discover(issuerUrl);
        return new issuer.Client({
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uris: [redirectUri],
          response_types: ['code'],
        });
      } catch (err) {
        lastErr = err;
        logger.warn({ attempt, issuerUrl }, 'OIDC discovery failed, retrying');
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
      }
    }
    this.clientPromise = undefined; // allow a later retry
    throw new Error(`OIDC discovery failed for ${issuerUrl}: ${String(lastErr)}`);
  }

  private getClient(): Promise<Client> {
    if (!this.clientPromise) this.clientPromise = this.discover();
    return this.clientPromise;
  }

  /** Build the authorization redirect URL plus the per-flow checks to stash in a cookie. */
  async createAuthRequest(): Promise<AuthRequest> {
    const client = await this.getClient();
    const state = generators.state();
    const nonce = generators.nonce();
    const codeVerifier = generators.codeVerifier();
    const url = client.authorizationUrl({
      scope: 'openid profile email',
      state,
      nonce,
      code_challenge: generators.codeChallenge(codeVerifier),
      code_challenge_method: 'S256',
    });
    return { url, state, nonce, codeVerifier };
  }

  /**
   * Complete the callback: parse params from the request and exchange the code for
   * tokens, validating state, nonce, and the PKCE verifier.
   */
  async exchangeCallback(
    req: IncomingMessage,
    checks: { state: string; nonce: string; codeVerifier: string },
  ): Promise<TokenSet> {
    const client = await this.getClient();
    const params = client.callbackParams(req);
    return client.callback(this.config.oidc.redirectUri, params, {
      state: checks.state,
      nonce: checks.nonce,
      code_verifier: checks.codeVerifier,
    });
  }
}
