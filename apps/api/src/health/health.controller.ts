import { Controller, Get, Inject, ServiceUnavailableException } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import type { Db } from '@agentforge/db';
import { DB } from '../tokens.js';

@Controller()
export class HealthController {
  constructor(@Inject(DB) private readonly db: Db) {}

  /** Liveness: the process is up. */
  @Get('healthz')
  live(): { status: string } {
    return { status: 'ok' };
  }

  /** Readiness: dependencies (the database) are reachable. */
  @Get('readyz')
  async ready(): Promise<{ status: string }> {
    try {
      await this.db.execute(sql`select 1`);
      return { status: 'ready' };
    } catch {
      throw new ServiceUnavailableException({ status: 'not-ready', reason: 'database' });
    }
  }
}
