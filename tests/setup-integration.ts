import { config } from 'dotenv';
import path from 'node:path';

config({ path: path.resolve(__dirname, '..', '.env.local') });

// In CI there is no .env.local, so provide dummy values.
// The actual JWT verification is mocked in the test files — these are
// never used to make real Cognito calls.
process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID ??= 'test-pool-id';
process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID ??= 'test-client-id';
