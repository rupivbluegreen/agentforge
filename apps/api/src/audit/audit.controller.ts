import { Controller, Get, Inject, UseGuards } from '@nestjs/common';
import { AuditLog, type ChainVerification } from '@agentforge/governance';
import type { AuditLogRow } from '@agentforge/db';
import { SessionGuard } from '../auth/session.guard.js';
import { CurrentSession } from '../auth/current-session.decorator.js';
import type { SessionData } from '../auth/session.js';
import { AUDIT } from '../tokens.js';

/** Read access to the tenant's immutable audit log + chain verification. */
@Controller('audit')
@UseGuards(SessionGuard)
export class AuditController {
  constructor(@Inject(AUDIT) private readonly audit: AuditLog) {}

  @Get()
  list(@CurrentSession() session: SessionData): Promise<AuditLogRow[]> {
    return this.audit.list(session.tenantId, 200);
  }

  @Get('verify')
  verify(@CurrentSession() session: SessionData): Promise<ChainVerification> {
    return this.audit.verifyChain(session.tenantId);
  }
}
