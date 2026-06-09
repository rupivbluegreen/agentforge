import { Controller, Get, Inject, UseGuards } from '@nestjs/common';
import type { ProviderRegistry } from '@agentforge/providers';
import type { ToolRegistry } from '@agentforge/tools';
import { SessionGuard } from '../auth/session.guard.js';
import { PROVIDERS, TOOLS } from '../tokens.js';

/** Exposes the configured providers/tools so the UI can populate its builder. */
@Controller('meta')
@UseGuards(SessionGuard)
export class MetaController {
  constructor(
    @Inject(PROVIDERS) private readonly providers: ProviderRegistry,
    @Inject(TOOLS) private readonly tools: ToolRegistry,
  ) {}

  @Get()
  meta(): { providers: string[]; tools: string[]; riskTiers: string[] } {
    return {
      providers: this.providers.ids(),
      tools: this.tools.names(),
      riskTiers: ['prohibited', 'high', 'limited', 'minimal'],
    };
  }
}
