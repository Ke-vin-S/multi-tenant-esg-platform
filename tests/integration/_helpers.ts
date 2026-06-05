import { PrismaClient, type Tenant, type MetricDefinition } from '@prisma/client';

/** Application-role client — RLS-enforced. Use this in the test BODY. */
export function makePrisma() {
  return new PrismaClient({
    datasources: { db: { url: process.env.DATABASE_URL } },
    log: ['error'],
  });
}

/** Privileged client — RLS bypass. Use this for fixture setup/teardown only. */
export function makeGlobalPrisma() {
  return new PrismaClient({
    datasources: { db: { url: process.env.DATABASE_URL_PRIVILEGED } },
    log: ['error'],
  });
}

/**
 * Wipe + reseed a minimal isolated fixture inside the per-suite database.
 * Uses the privileged client so RLS does not hide prior state from cleanup.
 */
export async function seedTwoTenantFixture(prisma: PrismaClient): Promise<{
  tA: Tenant;
  tB: Tenant;
  defAElec: MetricDefinition;
  defBTractor: MetricDefinition;
}> {
  // Clear in FK-safe order.
  await prisma.metricEntry.deleteMany();
  await prisma.user.deleteMany();
  await prisma.metricDefinition.deleteMany();
  await prisma.tenant.deleteMany();

  const tA = await prisma.tenant.create({
    data: { name: 'Test Finance A', sectorProfile: 'FINANCIAL', region: 'LK' },
  });
  const tB = await prisma.tenant.create({
    data: { name: 'Test Agri B', sectorProfile: 'AGRICULTURE', region: 'KH' },
  });

  const defAElec = await prisma.metricDefinition.create({
    data: {
      metricType: 'env_electricity_purchased',
      name: 'Grid Electricity',
      unit: 'kWh',
      sectorProfile: 'FINANCIAL',
      scope: 'SCOPE_2',
    },
  });
  const defBTractor = await prisma.metricDefinition.create({
    data: {
      metricType: 'env_tractor_diesel',
      name: 'Tractor Diesel',
      unit: 'liters',
      sectorProfile: 'AGRICULTURE',
      scope: 'SCOPE_1',
    },
  });

  return { tA, tB, defAElec, defBTractor };
}
