import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { tenants, type Db } from '@agentforge/db';
import { DB } from '../tokens.js';

export interface ResolvedTenant {
  id: string;
  slug: string;
}

/**
 * Resolves the tenant a user belongs to. Tenant membership comes from the IdP (a
 * `tenant` claim). For Phase 0 we provision-on-first-login: if the tenant doesn't exist
 * yet it is created. The `tenants` registry is control-plane data and not RLS-scoped, so
 * these queries run on the plain client.
 */
@Injectable()
export class TenantService {
  constructor(@Inject(DB) private readonly db: Db) {}

  async resolveBySlug(slug: string, displayName?: string): Promise<ResolvedTenant> {
    const existing = await this.db
      .select({ id: tenants.id, slug: tenants.slug })
      .from(tenants)
      .where(eq(tenants.slug, slug))
      .limit(1);
    if (existing[0]) return existing[0];

    const inserted = await this.db
      .insert(tenants)
      .values({ slug, name: displayName ?? slug })
      .onConflictDoNothing({ target: tenants.slug })
      .returning({ id: tenants.id, slug: tenants.slug });
    if (inserted[0]) return inserted[0];

    // Lost a race to a concurrent insert — read the winner.
    const reread = await this.db
      .select({ id: tenants.id, slug: tenants.slug })
      .from(tenants)
      .where(eq(tenants.slug, slug))
      .limit(1);
    if (!reread[0]) throw new Error(`Failed to resolve tenant for slug "${slug}"`);
    return reread[0];
  }
}
