import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { initTelemetry, shutdownTelemetry, logger } from '@agentforge/telemetry';
import { AppModule } from './app.module.js';
import { loadConfig } from './config/app-config.js';

async function bootstrap(): Promise<void> {
  initTelemetry();
  const config = await loadConfig();

  const app = await NestFactory.create(AppModule.forRoot(config), { logger: false });
  app.use(cookieParser());
  app.enableShutdownHooks();

  const shutdown = async (signal: string): Promise<void> => {
    logger.info({ signal }, 'shutting down');
    await app.close();
    await shutdownTelemetry();
    process.exit(0);
  };
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));

  await app.listen(config.port, '0.0.0.0');
  logger.info({ port: config.port, env: config.env }, 'agentforge api listening');
}

bootstrap().catch(async (err: unknown) => {
  logger.error({ err: String(err) }, 'bootstrap failed');
  await shutdownTelemetry();
  process.exit(1);
});
