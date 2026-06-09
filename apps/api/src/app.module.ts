import { Module, type DynamicModule } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { CoreModule } from './core/core.module.js';
import { TracingInterceptor } from './common/tracing.interceptor.js';
import { HealthModule } from './health/health.module.js';
import { AuthModule } from './auth/auth.module.js';
import { WorkspacesModule } from './workspaces/workspaces.module.js';
import { AgentsModule } from './agents/agents.module.js';
import { AuditModule } from './audit/audit.module.js';
import type { AppConfig } from './config/app-config.js';

@Module({})
export class AppModule {
  static forRoot(config: AppConfig): DynamicModule {
    return {
      module: AppModule,
      imports: [
        CoreModule.forRoot(config),
        HealthModule,
        AuthModule,
        WorkspacesModule,
        AgentsModule,
        AuditModule,
      ],
      providers: [{ provide: APP_INTERCEPTOR, useClass: TracingInterceptor }],
    };
  }
}
