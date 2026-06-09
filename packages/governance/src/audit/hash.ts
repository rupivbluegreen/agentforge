import { createHash } from 'node:crypto';

/** First link's predecessor hash. */
export const GENESIS_HASH = '0'.repeat(64);

/** Deterministic JSON with recursively sorted object keys (stable hashing input). */
export function canonicalize(value: unknown): string {
  return JSON.stringify(sortValue(value));
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortValue);
  if (value !== null && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    return Object.keys(obj)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = sortValue(obj[key]);
        return acc;
      }, {});
  }
  return value;
}

export interface HashableEntry {
  seq: number;
  occurredAt: string;
  actor: string;
  action: string;
  resourceType: string;
  resourceId: string | null;
  details: Record<string, unknown>;
}

/** hash = sha256(prevHash + canonical(entry)). Chaining makes the log tamper-evident. */
export function computeEntryHash(prevHash: string, entry: HashableEntry): string {
  return createHash('sha256')
    .update(prevHash + canonicalize(entry))
    .digest('hex');
}
