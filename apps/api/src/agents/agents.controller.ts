import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import type { AgentRow, AgentVersionRow } from '@agentforge/db';
import { SessionGuard } from '../auth/session.guard.js';
import { CurrentSession } from '../auth/current-session.decorator.js';
import type { SessionData } from '../auth/session.js';
import { AgentsService, type CreateAgentInput } from './agents.service.js';
import { RunsService, type RunOutcome } from './runs.service.js';

const actorOf = (s: SessionData): string => `user:${s.sub}`;

@Controller('agents')
@UseGuards(SessionGuard)
export class AgentsController {
  constructor(
    private readonly agents: AgentsService,
    private readonly runs: RunsService,
  ) {}

  @Post()
  create(
    @CurrentSession() session: SessionData,
    @Body() body: CreateAgentInput,
  ): Promise<AgentRow> {
    return this.agents.create(session.tenantId, actorOf(session), body);
  }

  @Get()
  list(@CurrentSession() session: SessionData): Promise<AgentRow[]> {
    return this.agents.list(session.tenantId);
  }

  @Get(':id')
  get(@CurrentSession() session: SessionData, @Param('id') id: string): Promise<AgentRow> {
    return this.agents.get(session.tenantId, id);
  }

  @Get(':id/versions')
  versions(
    @CurrentSession() session: SessionData,
    @Param('id') id: string,
  ): Promise<AgentVersionRow[]> {
    return this.agents.listVersions(session.tenantId, id);
  }

  @Post(':id/run')
  run(
    @CurrentSession() session: SessionData,
    @Param('id') id: string,
    @Body() body: { input?: unknown },
  ): Promise<RunOutcome> {
    return this.runs.run(session.tenantId, actorOf(session), id, body?.input ?? '');
  }
}
