import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import type { RunRow } from '@agentforge/db';
import { SessionGuard } from '../auth/session.guard.js';
import { CurrentSession } from '../auth/current-session.decorator.js';
import type { SessionData } from '../auth/session.js';
import { RunsService } from './runs.service.js';

@Controller('runs')
@UseGuards(SessionGuard)
export class RunsController {
  constructor(private readonly runs: RunsService) {}

  @Get()
  list(@CurrentSession() session: SessionData): Promise<RunRow[]> {
    return this.runs.list(session.tenantId);
  }

  @Get(':id')
  get(@CurrentSession() session: SessionData, @Param('id') id: string): Promise<RunRow> {
    return this.runs.get(session.tenantId, id);
  }
}
