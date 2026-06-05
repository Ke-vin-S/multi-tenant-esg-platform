import { PrismaClient, Prisma } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var __prisma__: PrismaClient | undefined;
  // eslint-disable-next-line no-var
  var __globalPrisma__: PrismaClient | undefined;
}

/**
 * Default Prisma client — connects as the RLS-enforced application user.
 * Every tenant-scoped query MUST go through withTenantContext() so the
 * `app.current_tenant_id` session variable is set before reads/writes.
 */
export const prisma =
  global.__prisma__ ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') global.__prisma__ = prisma;

/**
 * Privileged Prisma client for CORPORATE_ANALYST / GLOBAL_ADMIN.
 * Connects as `esg_privileged`, a DB role with `app.bypass_rls = on` set at
 * the role level — so its queries see all tenants' rows.
 *
 * IMPORTANT: never use this for SUBSIDIARY_OFFICER traffic.
 */
export const globalPrisma =
  global.__globalPrisma__ ??
  new PrismaClient({
    datasources: { db: { url: process.env.DATABASE_URL_PRIVILEGED } },
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') global.__globalPrisma__ = globalPrisma;

/**
 * Run `fn` inside a transaction with `app.current_tenant_id` set so RLS
 * policies on MetricEntry filter to the caller's tenant.
 *
 * Using set_config(..., true) scopes the setting to the current transaction,
 * which Prisma's pooled connection releases cleanly between requests.
 */
export async function withTenantContext<T>(
  tenantId: string,
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  if (!tenantId) throw new Error('withTenantContext requires a tenantId');
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`;
    return fn(tx);
  });
}
