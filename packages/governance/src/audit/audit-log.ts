import { sql, asc, desc } from 'drizzle-orm';
import { withTenant, auditLog, type Db, type AuditLogRow } from '@agentforge/db';
import { GENESIS_HASH, computeEntryHash } from './hash.js';

export interface AuditEvent {
  actor: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  details?: Record<string, unknown>;
}

export interface AuditEntry {
  seq: number;
  occurredAt: string;
  actor: string;
  action: string;
  resourceType: string;
  resourceId: string | null;
  details: Record<string, unknown>;
  prevHash: string;
  hash: string;
}

export interface ChainVerification {
  valid: boolean;
  entries: number;
  brokenAtSeq?: number;
  reason?: string;
}

/**
 * Append-only, per-tenant, hash-chained audit log. Appends are serialized per tenant
 * with a transaction-scoped advisory lock so the chain stays linear, and the database
 * RLS policy makes the table insert/select-only (no UPDATE/DELETE). Verification
 * recomputes the chain and reports the first break.
 */
export class AuditLog {
  constructor(
    private readonly db: Db,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async append(tenantId: string, event: AuditEvent): Promise<AuditEntry> {
    return withTenant(this.db, tenantId, async (tx) => {
      // Serialize concurrent appends for this tenant so seq/hash stay linear.
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${tenantId}))`);

      const [last] = await tx
        .select({ seq: auditLog.seq, hash: auditLog.hash })
        .from(auditLog)
        .orderBy(desc(auditLog.seq))
        .limit(1);

      const seq = last ? Number(last.seq) + 1 : 1;
      const prevHash = last ? last.hash : GENESIS_HASH;
      const occurredAtDate = this.now();
      const occurredAt = occurredAtDate.toISOString();
      const resourceId = event.resourceId ?? null;
      const details = event.details ?? {};
      const hash = computeEntryHash(prevHash, {
        seq,
        occurredAt,
        actor: event.actor,
        action: event.action,
        resourceType: event.resourceType,
        resourceId,
        details,
      });

      await tx.insert(auditLog).values({
        tenantId,
        seq,
        occurredAt: occurredAtDate,
        actor: event.actor,
        action: event.action,
        resourceType: event.resourceType,
        resourceId,
        details,
        prevHash,
        hash,
      });

      return { seq, occurredAt, ...event, resourceId, details, prevHash, hash };
    });
  }

  async list(tenantId: string, limit = 100): Promise<AuditLogRow[]> {
    return withTenant(this.db, tenantId, (tx) =>
      tx.select().from(auditLog).orderBy(asc(auditLog.seq)).limit(limit),
    );
  }

  /** Recompute the chain and report whether it is intact. */
  async verifyChain(tenantId: string): Promise<ChainVerification> {
    return withTenant(this.db, tenantId, async (tx) => {
      const rows = await tx.select().from(auditLog).orderBy(asc(auditLog.seq));
      let prevHash = GENESIS_HASH;
      let expectedSeq = 1;
      for (const row of rows) {
        const seq = Number(row.seq);
        const broken = (reason: string): ChainVerification => ({
          valid: false,
          entries: rows.length,
          brokenAtSeq: seq,
          reason,
        });
        if (seq !== expectedSeq) return broken('sequence gap');
        if (row.prevHash !== prevHash) return broken('prevHash mismatch');
        const recomputed = computeEntryHash(prevHash, {
          seq,
          occurredAt: row.occurredAt.toISOString(),
          actor: row.actor,
          action: row.action,
          resourceType: row.resourceType,
          resourceId: row.resourceId,
          details: row.details,
        });
        if (recomputed !== row.hash) return broken('hash mismatch');
        prevHash = row.hash;
        expectedSeq += 1;
      }
      return { valid: true, entries: rows.length };
    });
  }
}
