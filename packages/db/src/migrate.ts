import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import postgres from 'postgres';

const MIGRATIONS_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'migrations');

export interface Migration {
  name: string;
  sql: string;
}

/** Load all `*.sql` migrations in lexical order (zero-padded prefixes => stable). */
export async function loadMigrations(): Promise<Migration[]> {
  const files = (await readdir(MIGRATIONS_DIR)).filter((f) => f.endsWith('.sql')).sort();
  return Promise.all(
    files.map(async (name) => ({ name, sql: await readFile(join(MIGRATIONS_DIR, name), 'utf8') })),
  );
}

/**
 * Apply pending migrations against `connectionString`, tracking applied ones in
 * `_af_migrations`. Each migration runs in its own transaction, so a failure leaves
 * the database consistent. Runs as the connecting role — point this at a migration
 * role that owns the schema, not the RLS-constrained application role.
 */
export async function migrate(connectionString: string): Promise<string[]> {
  const sql = postgres(connectionString, { max: 1 });
  const appliedNow: string[] = [];
  try {
    await sql.unsafe(
      `CREATE TABLE IF NOT EXISTS _af_migrations (
         name text PRIMARY KEY,
         applied_at timestamptz NOT NULL DEFAULT now()
       )`,
    );
    const rows = await sql<{ name: string }[]>`select name from _af_migrations`;
    const already = new Set(rows.map((r) => r.name));

    for (const m of await loadMigrations()) {
      if (already.has(m.name)) continue;
      await sql.begin(async (tx) => {
        await tx.unsafe(m.sql);
        await tx`insert into _af_migrations (name) values (${m.name})`;
      });
      appliedNow.push(m.name);
    }
    return appliedNow;
  } finally {
    await sql.end();
  }
}

// CLI entry: `tsx src/migrate.ts` (uses DATABASE_URL / DATABASE_MIGRATION_URL).
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const url = process.env.DATABASE_MIGRATION_URL ?? process.env.DATABASE_URL;
  if (!url) {
    process.stderr.write('DATABASE_MIGRATION_URL or DATABASE_URL must be set\n');
    process.exit(1);
  }
  migrate(url)
    .then((applied) => {
      const msg = applied.length ? `applied: ${applied.join(', ')}` : 'no pending migrations';
      process.stdout.write(`${msg}\n`);
    })
    .catch((err: unknown) => {
      process.stderr.write(`migration failed: ${String(err)}\n`);
      process.exit(1);
    });
}
