import { sql, type SQL } from 'drizzle-orm';

/**
 * Postgres session variable (GUC) that names the active tenant. The RLS policies in
 * the migrations read this via `current_setting('app.current_tenant', true)`. The
 * second arg (`missing_ok = true`) means an unset GUC yields NULL, and `tenant_id =
 * NULL` matches no rows — so isolation **fails closed**: no tenant context ⇒ no data.
 */
export const TENANT_GUC = 'app.current_tenant';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class MissingTenantContextError extends Error {
  constructor(message = 'A tenant-scoped operation was attempted without a valid tenant id.') {
    super(message);
    this.name = 'MissingTenantContextError';
  }
}

/** Anything that can run a drizzle `sql` query (the db or a transaction handle). */
export interface SqlExecutor {
  execute(query: SQL): Promise<unknown>;
}

/** Anything that can open a transaction whose handle is itself an {@link SqlExecutor}. */
export interface TenantTransactional<TTx extends SqlExecutor> {
  transaction<T>(fn: (tx: TTx) => Promise<T>): Promise<T>;
}

/**
 * Run `fn` inside a transaction with the tenant GUC set (LOCAL to the transaction,
 * so it can never leak to another request on a pooled connection). All queries made
 * on the passed `tx` are automatically constrained to `tenantId` by RLS.
 *
 * This is the ONLY supported way to touch tenant-scoped tables: it makes the
 * compliant path the easy path. Calling it with a non-UUID throws rather than
 * silently running unscoped.
 */
export async function withTenant<TTx extends SqlExecutor, R>(
  db: TenantTransactional<TTx>,
  tenantId: string,
  fn: (tx: TTx) => Promise<R>,
): Promise<R> {
  if (!UUID_RE.test(tenantId)) {
    throw new MissingTenantContextError(`Invalid tenant id: ${JSON.stringify(tenantId)}`);
  }
  return db.transaction(async (tx) => {
    // `set_config(name, value, is_local=true)` scopes the GUC to this transaction.
    await tx.execute(sql`select set_config(${TENANT_GUC}, ${tenantId}, true)`);
    return fn(tx);
  });
}
