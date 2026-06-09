import { Global, Module, type DynamicModule } from '@nestjs/common';
import { createDb, type Db } from '@agentforge/db';
import { createSecretsProvider } from '@agentforge/identity';
import { createProviderRegistry } from '@agentforge/providers';
import { createToolRegistry } from '@agentforge/tools';
import { AuditLog } from '@agentforge/governance';
import { APP_CONFIG, DB, SECRETS, PROVIDERS, TOOLS, AUDIT } from '../tokens.js';
import type { AppConfig } from '../config/app-config.js';

/**
 * Global module that publishes the bootstrap-resolved config, the database client, and
 * the secrets provider so feature modules can inject them.
 */
@Global()
@Module({})
export class CoreModule {
  static forRoot(config: AppConfig): DynamicModule {
    const db: Db = createDb(config.databaseUrl);
    return {
      module: CoreModule,
      providers: [
        { provide: APP_CONFIG, useValue: config },
        { provide: DB, useValue: db },
        { provide: SECRETS, useFactory: () => createSecretsProvider() },
        {
          provide: PROVIDERS,
          useValue: createProviderRegistry({
            ...(config.providerKeys.anthropic
              ? { anthropicApiKey: config.providerKeys.anthropic }
              : {}),
            ...(config.providerKeys.openai ? { openaiApiKey: config.providerKeys.openai } : {}),
          }),
        },
        { provide: TOOLS, useValue: createToolRegistry() },
        { provide: AUDIT, useValue: new AuditLog(db) },
      ],
      exports: [APP_CONFIG, DB, SECRETS, PROVIDERS, TOOLS, AUDIT],
    };
  }
}
