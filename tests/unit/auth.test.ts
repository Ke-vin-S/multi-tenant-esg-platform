import { describe, it, expect } from 'vitest';
import { parseCookies, requireRole, UnauthorizedError, type AuthContext } from '@/lib/auth';

describe('parseCookies', () => {
  it('parses a simple cookie header', () => {
    expect(parseCookies('a=1; b=2')).toEqual({ a: '1', b: '2' });
  });
  it('handles URL-encoded values', () => {
    expect(parseCookies('x=hello%20world')).toEqual({ x: 'hello world' });
  });
  it('returns an empty object for empty input', () => {
    expect(parseCookies('')).toEqual({});
  });
  it('ignores malformed entries', () => {
    expect(parseCookies('valid=ok; broken; another=yes')).toEqual({ valid: 'ok', another: 'yes' });
  });
});

describe('requireRole', () => {
  const officer: AuthContext = {
    tenantId: 't1', role: 'SUBSIDIARY_OFFICER', cognitoSub: 's1',
  };
  const analyst: AuthContext = {
    tenantId: 't1', role: 'CORPORATE_ANALYST', cognitoSub: 's2',
  };
  const admin: AuthContext = {
    tenantId: 't1', role: 'GLOBAL_ADMIN', cognitoSub: 's3',
  };

  it('passes when role is allowed', () => {
    expect(() => requireRole(officer, ['SUBSIDIARY_OFFICER'])).not.toThrow();
    expect(() => requireRole(analyst, ['CORPORATE_ANALYST', 'GLOBAL_ADMIN'])).not.toThrow();
  });

  it('throws UnauthorizedError when role is not allowed', () => {
    expect(() => requireRole(officer, ['CORPORATE_ANALYST'])).toThrow(UnauthorizedError);
    expect(() => requireRole(officer, ['GLOBAL_ADMIN'])).toThrow(UnauthorizedError);
  });

  it('allows admin in any analyst-restricted route', () => {
    expect(() => requireRole(admin, ['CORPORATE_ANALYST', 'GLOBAL_ADMIN'])).not.toThrow();
  });
});
