/**
 * The single most important test in the PoC: prove that RLS prevents
 * tenant A from seeing tenant B's MetricEntry rows even when the same
 * Prisma connection is reused.
 *
 * These tests bypass the API layer and go straight to the DB so we know
 * the policy itself is doing the work (not the application code).
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { withTenantContext, prisma, globalPrisma } from '@/lib/prisma';
import { makeGlobalPrisma, seedTwoTenantFixture } from './_helpers';

// Setup client bypasses RLS so it can wipe and seed regardless of prior state.
// The TESTS themselves use the RLS-enforced `prisma` from lib/prisma.ts.
let setupClient: ReturnType<typeof makeGlobalPrisma>;
let fx: Awaited<ReturnType<typeof seedTwoTenantFixture>>;

beforeAll(async () => {
  setupClient = makeGlobalPrisma();
});

beforeEach(async () => {
  fx = await seedTwoTenantFixture(setupClient);
  // Seed a few entries for each tenant.
  await setupClient.metricEntry.createMany({
    data: [
      { tenantId: fx.tA.id, metricDefinitionId: fx.defAElec.id, rawValue: 1000, unit: 'kWh', co2eKg: 550, reportingMonth: new Date('2026-01-01') },
      { tenantId: fx.tA.id, metricDefinitionId: fx.defAElec.id, rawValue: 2000, unit: 'kWh', co2eKg: 1100, reportingMonth: new Date('2026-02-01') },
      { tenantId: fx.tB.id, metricDefinitionId: fx.defBTractor.id, rawValue: 300, unit: 'liters', co2eKg: 804, reportingMonth: new Date('2026-01-01') },
      { tenantId: fx.tB.id, metricDefinitionId: fx.defBTractor.id, rawValue: 450, unit: 'liters', co2eKg: 1206, reportingMonth: new Date('2026-02-01') },
    ],
  });
});

afterAll(async () => {
  await setupClient.$disconnect();
  await prisma.$disconnect();
  await globalPrisma.$disconnect();
});

describe('RLS — tenant isolation', () => {
  it('withTenantContext(A) returns only A rows', async () => {
    const rows = await withTenantContext(fx.tA.id, (tx) => tx.metricEntry.findMany());
    expect(rows).toHaveLength(2);
    expect(rows.every((r) => r.tenantId === fx.tA.id)).toBe(true);
  });

  it('withTenantContext(B) returns only B rows', async () => {
    const rows = await withTenantContext(fx.tB.id, (tx) => tx.metricEntry.findMany());
    expect(rows).toHaveLength(2);
    expect(rows.every((r) => r.tenantId === fx.tB.id)).toBe(true);
  });

  it('forbids inserting a row claiming another tenant\'s id', async () => {
    await expect(
      withTenantContext(fx.tA.id, (tx) =>
        tx.metricEntry.create({
          data: {
            tenantId: fx.tB.id, // <- mismatch
            metricDefinitionId: fx.defBTractor.id,
            rawValue: 999,
            unit: 'liters',
            co2eKg: 0,
            reportingMonth: new Date('2026-03-01'),
          },
        }),
      ),
    ).rejects.toThrow();
  });

  it('a query WITHOUT any tenant context returns zero rows (fail closed)', async () => {
    // Note: the default prisma client connects as the non-privileged user,
    // and current_setting('app.current_tenant_id', true) returns NULL with the
    // `true` (missing_ok) flag — so the policy filter yields false for every row.
    const rows = await prisma.metricEntry.findMany();
    expect(rows).toHaveLength(0);
  });

  it('globalPrisma (RLS bypass) sees all tenants\' rows', async () => {
    const rows = await globalPrisma.metricEntry.findMany();
    expect(rows.length).toBeGreaterThanOrEqual(4);
    const tenantIds = new Set(rows.map((r) => r.tenantId));
    expect(tenantIds.has(fx.tA.id)).toBe(true);
    expect(tenantIds.has(fx.tB.id)).toBe(true);
  });

  it('switching tenant context within the same client does not leak between requests', async () => {
    const aRows = await withTenantContext(fx.tA.id, (tx) => tx.metricEntry.findMany());
    const bRows = await withTenantContext(fx.tB.id, (tx) => tx.metricEntry.findMany());
    expect(aRows.every((r) => r.tenantId === fx.tA.id)).toBe(true);
    expect(bRows.every((r) => r.tenantId === fx.tB.id)).toBe(true);
    expect(aRows.map((r) => r.id).some((id) => bRows.map((r) => r.id).includes(id))).toBe(false);
  });
});
