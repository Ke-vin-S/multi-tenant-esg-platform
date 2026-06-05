import '@testing-library/jest-dom/vitest';

// Stable env for unit tests that touch dev-session / auth modules.
process.env.DEV_SESSION_SECRET = process.env.DEV_SESSION_SECRET ?? 'test-secret-for-unit-tests';
process.env.DEV_AUTH_BYPASS = process.env.DEV_AUTH_BYPASS ?? 'true';
