import { config } from 'dotenv';
import path from 'node:path';

// Load real DB connection strings for the integration tests so they hit
// the docker-compose Postgres rather than mocking it.
config({ path: path.resolve(__dirname, '..', '.env.local') });

process.env.DEV_SESSION_SECRET = process.env.DEV_SESSION_SECRET ?? 'test-secret-for-integration';
process.env.DEV_AUTH_BYPASS = 'true';
