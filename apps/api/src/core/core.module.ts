import { Global, Module, type DynamicModule } from '@nestjs/common';
import { createDb } from '@agentforge/db';
import { createSecretsProvider } from '@agentforge/identity';
import { APP_CONFIG, DB, SECRETS } from '../tokens.js';
import type { AppConfig } from '../config/app-config.js';

/**
 * Global module that publishes the bootstrap-resolved config, the database client, and
 * the secrets provider so feature modules can inject them.
 */
@Global()
@Module({})
export class CoreModule {
  static forRoot(config: AppConfig): DynamicModule {
    return {
      module: CoreModule,
      providers: [
        { provide: APP_CONFIG, useValue: config },
        { provide: DB, useValue: createDb(config.databaseUrl) },
        { provide: SECRETS, useFactory: () => createSecretsProvider() },
      ],
      exports: [APP_CONFIG, DB, SECRETS],
    };
  }
}
