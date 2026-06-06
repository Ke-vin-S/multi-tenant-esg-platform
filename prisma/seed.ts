/**
 * Seed the demo dataset for the PoC.
 *
 * Creates:
 *   - 3 tenants (LOLC Finance Cambodia / Browns Plantations / Eden Resorts Maldives)
 *   - Metric definitions per agent_docs/sector-profiles.md
 *   - Demo users in the DB (and optionally in Cognito with --cognito flag)
 *   - 12 months of plausible historical MetricEntry data per tenant so dashboards
 *     have something to render on first load
 *
 * Usage:
 *   npx prisma db seed                  → DB only, uses dev-* cognitoId stubs
 *   npx prisma db seed -- --cognito     → also provisions real Cognito users
 *
 * Seed uses globalPrisma (RLS bypass) because it inserts for many tenants at once.
 */
import { config } from 'dotenv';
import { existsSync } from 'fs';
if (existsSync('.env.local')) config({ path: '.env.local', override: true });
else config(); // falls back to .env in prod/CI

import { PrismaClient, SectorProfile, Role, EmissionScope } from '@prisma/client';
import {
  CognitoIdentityProviderClient,
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
  AdminDeleteUserCommand,
  ListUsersCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { calculateCO2e } from '../lib/co2e';

const prisma = new PrismaClient({
  datasources: {
    db: { url: process.env.DATABASE_URL_PRIVILEGED ?? process.env.DATABASE_URL },
  },
});

const WITH_COGNITO = process.argv.includes('--cognito');

type DemoUser = {
  email: string;
  role: Role;
  tenantId: string;
  devCognitoId: string; // used when --cognito is not passed
};

async function provisionCognitoUsers(users: DemoUser[]): Promise<Map<string, string>> {
  const userPoolId = process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID;
  const region = process.env.COGNITO_REGION ?? 'ap-southeast-1';
  const tempPassword = process.env.COGNITO_SEED_PASSWORD ?? 'SeedTest1!';

  if (!userPoolId) throw new Error('NEXT_PUBLIC_COGNITO_USER_POOL_ID is not set');

  const client = new CognitoIdentityProviderClient({ region });
  const emailToSub = new Map<string, string>();

  for (const user of users) {
    // Delete existing user first so re-running seed is idempotent
    try {
      const existing = await client.send(new ListUsersCommand({
        UserPoolId: userPoolId,
        Filter: `email = "${user.email}"`,
        Limit: 1,
      }));
      if (existing.Users?.length) {
        await client.send(new AdminDeleteUserCommand({
          UserPoolId: userPoolId,
          Username: existing.Users[0].Username!,
        }));
        console.log(`  deleted existing Cognito user: ${user.email}`);
      }
    } catch {
      // ignore — user may not exist
    }

    const created = await client.send(new AdminCreateUserCommand({
      UserPoolId: userPoolId,
      Username: user.email,
      MessageAction: 'SUPPRESS', // don't send welcome email
      TemporaryPassword: tempPassword,
      UserAttributes: [
        { Name: 'email',              Value: user.email },
        { Name: 'email_verified',     Value: 'true' },
        { Name: 'custom:role',        Value: user.role },
        { Name: 'custom:tenant_id',   Value: user.tenantId },
      ],
    }));

    await client.send(new AdminSetUserPasswordCommand({
      UserPoolId: userPoolId,
      Username: user.email,
      Password: tempPassword,
      Permanent: true,
    }));

    const sub = created.User!.Attributes!.find(a => a.Name === 'sub')!.Value!;
    emailToSub.set(user.email, sub);
    console.log(`  created Cognito user: ${user.email}  sub=${sub}`);
  }

  return emailToSub;
}

type DefSeed = {
  metricType: string;
  name: string;
  unit: string;
  scope: EmissionScope | null;
};

const DEFINITIONS: Record<SectorProfile, DefSeed[]> = {
  FINANCIAL: [
    { metricType: 'env_electricity_purchased', name: 'Grid Electricity',       unit: 'kWh',    scope: 'SCOPE_2' },
    { metricType: 'env_generator_fuel',        name: 'Generator Diesel',       unit: 'liters', scope: 'SCOPE_1' },
    { metricType: 'env_vehicle_fuel',          name: 'Vehicle Fleet Fuel',     unit: 'liters', scope: 'SCOPE_1' },
    { metricType: 'soc_headcount_total',       name: 'Total Headcount',        unit: 'count',  scope: null },
    { metricType: 'soc_training_hours',        name: 'Total Training Hours',   unit: 'hours',  scope: null },
    { metricType: 'gov_anticorruption_trained',name: 'Anti-Corruption Trained',unit: 'count',  scope: null },
  ],
  AGRICULTURE: [
    { metricType: 'env_tractor_diesel',        name: 'Tractor Diesel',          unit: 'liters',       scope: 'SCOPE_1' },
    { metricType: 'env_water_usage',           name: 'Water Usage',             unit: 'cubic_meters', scope: null },
    { metricType: 'env_fertilizer_applied',    name: 'Fertilizer Applied',      unit: 'kg',           scope: null },
    { metricType: 'env_electricity_purchased', name: 'Grid Electricity',        unit: 'kWh',          scope: 'SCOPE_2' },
    { metricType: 'soc_headcount_total',       name: 'Total Headcount',         unit: 'count',        scope: null },
    { metricType: 'soc_recordable_incidents',  name: 'Recordable Safety Incidents', unit: 'count',    scope: null },
  ],
  LEISURE: [
    { metricType: 'env_electricity_purchased', name: 'Grid Electricity',        unit: 'kWh',    scope: 'SCOPE_2' },
    { metricType: 'env_generator_fuel',        name: 'Generator Diesel',        unit: 'liters', scope: 'SCOPE_1' },
    { metricType: 'env_water_per_guest_night', name: 'Water per Guest Night',   unit: 'liters', scope: null },
    { metricType: 'env_waste_generated',       name: 'Waste Generated',         unit: 'kg',     scope: null },
    { metricType: 'soc_headcount_total',       name: 'Total Headcount',         unit: 'count',  scope: null },
  ],
};

// Deterministic pseudo-random so seeds are reproducible.
function rand(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

async function main() {
  console.log('Wiping demo data…');
  await prisma.metricEntry.deleteMany();
  await prisma.user.deleteMany();
  await prisma.metricDefinition.deleteMany();
  await prisma.tenant.deleteMany();

  console.log('Creating tenants…');
  const lolc = await prisma.tenant.create({
    data: { name: 'LOLC Finance Cambodia', sectorProfile: 'FINANCIAL', region: 'KH' },
  });
  const browns = await prisma.tenant.create({
    data: { name: 'Browns Plantations', sectorProfile: 'AGRICULTURE', region: 'LK' },
  });
  const eden = await prisma.tenant.create({
    data: { name: 'Eden Resorts Maldives', sectorProfile: 'LEISURE', region: 'MV' },
  });
  const tenants = [lolc, browns, eden];

  console.log('Creating metric definitions…');
  for (const [profile, defs] of Object.entries(DEFINITIONS)) {
    for (const d of defs) {
      await prisma.metricDefinition.create({
        data: { ...d, sectorProfile: profile as SectorProfile },
      });
    }
  }

  console.log('Creating demo users…');

  const demoUsers: DemoUser[] = [
    { email: 'subsidiary_officer@test.com', role: 'SUBSIDIARY_OFFICER', tenantId: browns.id, devCognitoId: 'dev-officer-browns' },
    { email: 'officer_lolc@test.com',       role: 'SUBSIDIARY_OFFICER', tenantId: lolc.id,   devCognitoId: 'dev-officer-lolc'   },
    { email: 'officer_eden@test.com',       role: 'SUBSIDIARY_OFFICER', tenantId: eden.id,   devCognitoId: 'dev-officer-eden'   },
    { email: 'analyst@test.com',            role: 'CORPORATE_ANALYST',  tenantId: lolc.id,   devCognitoId: 'dev-analyst'        },
    { email: 'admin@test.com',              role: 'GLOBAL_ADMIN',       tenantId: lolc.id,   devCognitoId: 'dev-admin'          },
  ];

  let cognitoSubs: Map<string, string> = new Map();
  if (WITH_COGNITO) {
    console.log('  provisioning Cognito users…');
    cognitoSubs = await provisionCognitoUsers(demoUsers);
  } else {
    console.log('  skipping Cognito (pass --cognito to provision real users)');
  }

  await prisma.user.createMany({
    data: demoUsers.map(u => ({
      cognitoId: cognitoSubs.get(u.email) ?? u.devCognitoId,
      email:     u.email,
      tenantId:  u.tenantId,
      role:      u.role,
    })),
  });

  console.log('Creating 12 months of historical metric entries…');
  const now = new Date();
  const firstOfThisMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

  for (const tenant of tenants) {
    const defs = await prisma.metricDefinition.findMany({
      where: { sectorProfile: tenant.sectorProfile },
    });
    const rng = rand(tenant.id.charCodeAt(0) + tenant.id.charCodeAt(1));

    // Build all rows first, then insert in one batched transaction with RLS bypass.
    const rows: { tenantId: string; metricDefinitionId: string; rawValue: number; unit: string; co2eKg: number | null; reportingMonth: Date }[] = [];
    for (let monthsAgo = 11; monthsAgo >= 0; monthsAgo--) {
      const month = new Date(Date.UTC(firstOfThisMonth.getUTCFullYear(), firstOfThisMonth.getUTCMonth() - monthsAgo, 1));
      for (const def of defs) {
        const baseline = baselineFor(def.metricType, tenant.sectorProfile);
        const seasonalSwing = 1 + 0.15 * Math.sin((monthsAgo / 12) * Math.PI * 2);
        const noise = 0.85 + rng() * 0.3;
        const rawValue = Math.round(baseline * seasonalSwing * noise * 100) / 100;
        rows.push({
          tenantId: tenant.id,
          metricDefinitionId: def.id,
          rawValue,
          unit: def.unit,
          co2eKg: calculateCO2e(rawValue, def.metricType, tenant.region),
          reportingMonth: month,
        });
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.bypass_rls', 'on', true)`;
      await tx.metricEntry.createMany({ data: rows });
    });
  }

  console.log('Done.');
}

function baselineFor(metricType: string, sector: SectorProfile): number {
  // Order-of-magnitude plausible values per sector per month
  const FIN: Record<string, number> = {
    env_electricity_purchased: 18000,
    env_generator_fuel: 350,
    env_vehicle_fuel: 1200,
    soc_headcount_total: 240,
    soc_training_hours: 380,
    gov_anticorruption_trained: 195,
  };
  const AGRI: Record<string, number> = {
    env_tractor_diesel: 2400,
    env_water_usage: 9500,
    env_fertilizer_applied: 1100,
    env_electricity_purchased: 4200,
    soc_headcount_total: 510,
    soc_recordable_incidents: 1.4,
  };
  const LEIS: Record<string, number> = {
    env_electricity_purchased: 62000,
    env_generator_fuel: 1900,
    env_water_per_guest_night: 850,
    env_waste_generated: 4300,
    soc_headcount_total: 180,
  };
  const map = sector === 'FINANCIAL' ? FIN : sector === 'AGRICULTURE' ? AGRI : LEIS;
  return map[metricType] ?? 100;
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
