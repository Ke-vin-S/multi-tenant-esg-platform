/**
 * Hit the App Router route handlers directly (no HTTP) with a fake Cognito
 * id_token cookie. The aws-jwt-verify module is mocked so the verifier just
 * decodes the payload without signature validation.
 *
 * Verifies:
 *   - 401 without auth
 *   - 401/403 for wrong role
 *   - 201 + correct CO2e on POST /api/metrics
 *   - 200 on GET /api/metrics, scoped to the caller's tenant
 *   - 200 on GET /api/metrics/aggregate for analyst, 401 for officer
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { prisma, globalPrisma } from '@/lib/prisma';
import { calculateCO2e } from '@/lib/co2e';
import { seedTwoTenantFixture, makeGlobalPrisma } from './_helpers';

import { POST as postMetric, GET as getMetrics } from '@/app/api/metrics/route';
import { GET as getAggregate } from '@/app/api/metrics/aggregate/route';
import { GET as getDefs } from '@/app/api/metrics/definitions/route';
import { GET as getTenants } from '@/app/api/tenants/route';

vi.mock('aws-jwt-verify', () => ({
  CognitoJwtVerifier: {
    create: () => ({
      verify: async (token: string) => {
        const [, payload] = token.split('.');
        return JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8'));
      },
    }),
  },
}));

function makeTestToken(claims: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify(claims)).toString('base64url');
  return `${header}.${payload}.fake-sig`;
}

let setupClient: ReturnType<typeof makeGlobalPrisma>;
let fx: Awaited<ReturnType<typeof seedTwoTenantFixture>>;

let tokenOfficerA: string;
let tokenOfficerB: string;
let tokenAnalyst: string;

beforeAll(async () => {
  setupClient = makeGlobalPrisma();
  fx = await seedTwoTenantFixture(setupClient);

  tokenOfficerA = makeTestToken({ sub: 'sub-officer-a', 'custom:tenant_id': fx.tA.id, 'custom:role': 'SUBSIDIARY_OFFICER', email: 'a@test' });
  tokenOfficerB = makeTestToken({ sub: 'sub-officer-b', 'custom:tenant_id': fx.tB.id, 'custom:role': 'SUBSIDIARY_OFFICER', email: 'b@test' });
  tokenAnalyst  = makeTestToken({ sub: 'sub-analyst',   'custom:tenant_id': fx.tA.id, 'custom:role': 'CORPORATE_ANALYST',  email: 'analyst@test' });
});

afterAll(async () => {
  await setupClient.$disconnect();
  await prisma.$disconnect();
  await globalPrisma.$disconnect();
});

function makeReq(
  url: string,
  init: { method?: string; token?: string; body?: unknown } = {},
): Request {
  const headers: Record<string, string> = {};
  if (init.token) headers['cookie'] = `id_token=${init.token}`;
  if (init.body !== undefined) headers['content-type'] = 'application/json';
  return new Request(url, {
    method: init.method ?? 'GET',
    headers,
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
  });
}

describe('API routes — auth and scope', () => {
  it('GET /api/metrics → 401 without a session cookie', async () => {
    const res = await getMetrics(makeReq('http://t/api/metrics'));
    expect(res.status).toBe(401);
  });

  it('POST /api/metrics → creates with correct server-computed CO2e', async () => {
    const reportingMonth = '2026-03-01';
    const res = await postMetric(
      makeReq('http://t/api/metrics', {
        method: 'POST',
        token: tokenOfficerA,
        body: {
          metricDefinitionId: fx.defAElec.id,
          rawValue: 1500,
          reportingMonth,
        },
      }),
    );
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.entry.co2eKg).toBeCloseTo(calculateCO2e(1500, 'env_electricity_purchased', 'LK')!, 6);
  });

  it('GET /api/metrics → officer A only sees tenant A entries', async () => {
    await globalPrisma.metricEntry.createMany({
      data: [
        { tenantId: fx.tA.id, metricDefinitionId: fx.defAElec.id,    rawValue: 100, unit: 'kWh',    co2eKg: 55,  reportingMonth: new Date('2026-04-01') },
        { tenantId: fx.tB.id, metricDefinitionId: fx.defBTractor.id, rawValue: 100, unit: 'liters', co2eKg: 268, reportingMonth: new Date('2026-04-01') },
      ],
    });
    const res = await getMetrics(makeReq('http://t/api/metrics', { token: tokenOfficerA }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.entries.length).toBeGreaterThan(0);
    expect(json.entries.every((e: { metricType: string }) => e.metricType === 'env_electricity_purchased')).toBe(true);
  });

  it('POST /api/metrics → 400 when metric definition belongs to a different sector', async () => {
    const res = await postMetric(
      makeReq('http://t/api/metrics', {
        method: 'POST',
        token: tokenOfficerA,
        body: {
          metricDefinitionId: fx.defBTractor.id,
          rawValue: 10,
          reportingMonth: '2026-03-01',
        },
      }),
    );
    expect(res.status).toBe(400);
  });

  it('POST /api/metrics → 401 for analyst role (read-only)', async () => {
    const res = await postMetric(
      makeReq('http://t/api/metrics', {
        method: 'POST',
        token: tokenAnalyst,
        body: {
          metricDefinitionId: fx.defAElec.id,
          rawValue: 1,
          reportingMonth: '2026-03-01',
        },
      }),
    );
    expect(res.status).toBe(401);
  });

  it('GET /api/metrics/aggregate → 401 for officer, 200 for analyst', async () => {
    const officer = await getAggregate(makeReq('http://t/api/metrics/aggregate', { token: tokenOfficerB }));
    expect(officer.status).toBe(401);

    const analyst = await getAggregate(makeReq('http://t/api/metrics/aggregate', { token: tokenAnalyst }));
    expect(analyst.status).toBe(200);
    const json = await analyst.json();
    expect(json.perTenant.length).toBeGreaterThanOrEqual(2);
    expect(typeof json.totalCo2eKg).toBe('number');
  });

  it('GET /api/metrics/definitions → returns the caller\'s sector by default', async () => {
    const res = await getDefs(makeReq('http://t/api/metrics/definitions', { token: tokenOfficerA }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.sector).toBe('FINANCIAL');
    expect(json.definitions.every((d: { sectorProfile: string }) => d.sectorProfile === 'FINANCIAL')).toBe(true);
  });

  it('GET /api/tenants → 401 for officer, 200 for analyst', async () => {
    const officer = await getTenants(makeReq('http://t/api/tenants', { token: tokenOfficerA }));
    expect(officer.status).toBe(401);

    const analyst = await getTenants(makeReq('http://t/api/tenants', { token: tokenAnalyst }));
    expect(analyst.status).toBe(200);
    const json = await analyst.json();
    expect(json.tenants.length).toBe(2);
    expect(json.tenants.every((t: { status: string }) => ['submitted', 'late', 'missing'].includes(t.status))).toBe(true);
  });
});
