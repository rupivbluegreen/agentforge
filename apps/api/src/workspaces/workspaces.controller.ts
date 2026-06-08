import { Body, Controller, Get, Inject, Post, UseGuards } from '@nestjs/common';
import { withTenant, workspaces, type Db, type Workspace } from '@agentforge/db';
import { DB } from '../tokens.js';
import { SessionGuard } from '../auth/session.guard.js';
import { CurrentSession } from '../auth/current-session.decorator.js';
import type { SessionData } from '../auth/session.js';

interface CreateWorkspaceBody {
  name?: unknown;
}

/**
 * Demonstrates end-to-end tenant scoping through the API: every query runs inside
 * `withTenant`, so Postgres RLS guarantees a caller only ever sees or creates rows for
 * their own tenant — even if the handler were buggy.
 */
@Controller('workspaces')
@UseGuards(SessionGuard)
export class WorkspacesController {
  constructor(@Inject(DB) private readonly db: Db) {}

  @Get()
  async list(@CurrentSession() session: SessionData): Promise<Workspace[]> {
    return withTenant(this.db, session.tenantId, (tx) => tx.select().from(workspaces));
  }

  @Post()
  async create(
    @CurrentSession() session: SessionData,
    @Body() body: CreateWorkspaceBody,
  ): Promise<Workspace> {
    const name = typeof body.name === 'string' && body.name.trim() ? body.name.trim() : 'Untitled';
    const [created] = await withTenant(this.db, session.tenantId, (tx) =>
      tx.insert(workspaces).values({ tenantId: session.tenantId, name }).returning(),
    );
    // RLS WITH CHECK guarantees the row was written for this tenant.
    return created!;
  }
}
