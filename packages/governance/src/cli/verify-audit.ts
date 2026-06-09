import { fileURLToPath } from 'node:url';
import { createDb, tenants } from '@agentforge/db';
import { AuditLog } from '../audit/audit-log.js';

/**
 * Verifier CLI: recompute and check every tenant's audit-log hash chain. Exit code is
 * non-zero if any chain is broken, so it can gate a pipeline or run as a scheduled check.
 *   DATABASE_URL=postgres://... node dist/cli/verify-audit.js
 */
export async function verifyAllChains(connectionString: string): Promise<boolean> {
  const db = createDb(connectionString);
  const audit = new AuditLog(db);
  const rows = await db.select({ id: tenants.id, slug: tenants.slug }).from(tenants);
  let allValid = true;
  for (const t of rows) {
    const v = await audit.verifyChain(t.id);
    const status = v.valid ? 'OK' : `BROKEN at seq ${v.brokenAtSeq} (${v.reason})`;
    process.stdout.write(`tenant ${t.slug} (${t.id}): ${v.entries} entries — ${status}\n`);
    if (!v.valid) allValid = false;
  }
  return allValid;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const url = process.env.DATABASE_URL;
  if (!url) {
    process.stderr.write('DATABASE_URL must be set\n');
    process.exit(1);
  }
  verifyAllChains(url)
    .then((ok) => {
      process.stdout.write(ok ? 'all audit chains intact\n' : 'AUDIT CHAIN VERIFICATION FAILED\n');
      process.exit(ok ? 0 : 1);
    })
    .catch((err: unknown) => {
      process.stderr.write(`verification error: ${String(err)}\n`);
      process.exit(1);
    });
}
