import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { AgentsController } from './agents.controller.js';
import { RunsController } from './runs.controller.js';
import { MetaController } from './meta.controller.js';
import { AgentsService } from './agents.service.js';
import { RunsService } from './runs.service.js';

@Module({
  imports: [AuthModule],
  controllers: [AgentsController, RunsController, MetaController],
  providers: [AgentsService, RunsService],
})
export class AgentsModule {}
