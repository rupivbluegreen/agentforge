import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema/index.js';

/**
 * Create the production database client (postgres.js + drizzle).
 *
 * SECURITY: in production this connection string MUST use a dedicated, non-superuser
 * role that does NOT have the `BYPASSRLS` attribute and does NOT own the tables.
 * Superusers and table owners bypass Row-Level Security, which would defeat tenant
 * isolation. Migrations run as a separate, more-privileged role (see `migrate.ts`).
 */
export function createDb(connectionString: string) {
  const client = postgres(connectionString, {
    max: 10,
    // Disable prepared statements so pooled connections don't pin plans across the
    // per-transaction tenant GUC.
    prepare: false,
  });
  return drizzle(client, { schema });
}

export type Db = ReturnType<typeof createDb>;
