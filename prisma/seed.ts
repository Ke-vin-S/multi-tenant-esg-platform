/**
 * Seed the demo dataset for the PoC.
 *
 * Creates:
 *   - 3 tenants (LOLC Finance Cambodia / Browns Plantations / Eden Resorts Maldives)
 *   - Metric definitions per agent_docs/sector-profiles.md
 *   - 3 demo users (one per role) mapped to Cognito IDs that the dev-auth bypass uses
 *   - 12 months of plausible historical MetricEntry data per tenant so dashboards
 *     have something to render on first load
 *
 * Seed uses globalPrisma (RLS bypass) because it inserts for many tenants at once.
 */
import { PrismaClient, SectorProfile, Role, EmissionScope } from '@prisma/client';
import { calculateCO2e } from '../lib/co2e';

const prisma = new PrismaClient({
  datasources: {
    db: { url: process.env.DATABASE_URL_PRIVILEGED ?? process.env.DATABASE_URL },
  },
});

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
  // cognitoId values double as the dev-auth-bypass subject identifiers.
  await prisma.user.createMany({
    data: [
      { cognitoId: 'dev-officer-browns', email: 'subsidiary_officer@test.com', tenantId: browns.id, role: 'SUBSIDIARY_OFFICER' as Role },
      { cognitoId: 'dev-officer-lolc',   email: 'officer_lolc@test.com',       tenantId: lolc.id,   role: 'SUBSIDIARY_OFFICER' as Role },
      { cognitoId: 'dev-officer-eden',   email: 'officer_eden@test.com',       tenantId: eden.id,   role: 'SUBSIDIARY_OFFICER' as Role },
      { cognitoId: 'dev-analyst',        email: 'analyst@test.com',            tenantId: lolc.id,   role: 'CORPORATE_ANALYST' as Role },
      { cognitoId: 'dev-admin',          email: 'admin@test.com',              tenantId: lolc.id,   role: 'GLOBAL_ADMIN' as Role },
    ],
  });

  console.log('Creating 12 months of historical metric entries…');
  const now = new Date();
  const firstOfThisMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

  for (const tenant of tenants) {
    const defs = await prisma.metricDefinition.findMany({
      where: { sectorProfile: tenant.sectorProfile },
    });
    const rng = rand(tenant.id.charCodeAt(0) + tenant.id.charCodeAt(1));

    for (let monthsAgo = 11; monthsAgo >= 0; monthsAgo--) {
      const month = new Date(Date.UTC(firstOfThisMonth.getUTCFullYear(), firstOfThisMonth.getUTCMonth() - monthsAgo, 1));

      for (const def of defs) {
        const baseline = baselineFor(def.metricType, tenant.sectorProfile);
        const seasonalSwing = 1 + 0.15 * Math.sin((monthsAgo / 12) * Math.PI * 2);
        const noise = 0.85 + rng() * 0.3; // ±15 %
        const rawValue = Math.round(baseline * seasonalSwing * noise * 100) / 100;
        const co2e = calculateCO2e(rawValue, def.metricType, tenant.region);

        await prisma.metricEntry.create({
          data: {
            tenantId: tenant.id,
            metricDefinitionId: def.id,
            rawValue,
            unit: def.unit,
            co2eKg: co2e,
            reportingMonth: month,
          },
        });
      }
    }
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
