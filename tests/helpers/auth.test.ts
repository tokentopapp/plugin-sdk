import { describe, expect, test } from 'bun:test';
import {
  apiKeyCredential,
  oauthCredential,
  credentialFound,
  credentialMissing,
  credentialExpired,
  credentialInvalid,
  credentialError,
  isTokenExpired,
} from '../../src/helpers/auth.ts';

describe('apiKeyCredential', () => {
  test('creates credential with default source', () => {
    const cred = apiKeyCredential('sk-abc123');
    expect(cred).toEqual({ apiKey: 'sk-abc123', source: 'env' });
  });

  test('creates credential with explicit source', () => {
    const cred = apiKeyCredential('sk-abc123', 'config');
    expect(cred).toEqual({ apiKey: 'sk-abc123', source: 'config' });
  });

  test('accepts all valid source types', () => {
    for (const source of ['env', 'opencode', 'external', 'config'] as const) {
      const cred = apiKeyCredential('key', source);
      expect(cred.source).toBe(source);
    }
  });
});

describe('oauthCredential', () => {
  test('creates minimal oauth credential', () => {
    const cred = oauthCredential('tok_123');
    expect(cred).toEqual({
      oauth: { accessToken: 'tok_123' },
      source: 'external',
    });
  });

  test('includes all optional fields when provided', () => {
    const cred = oauthCredential('tok_123', {
      refreshToken: 'ref_456',
      expiresAt: 1700000000,
      accountId: 'acct_789',
      source: 'config',
    });
    expect(cred).toEqual({
      oauth: {
        accessToken: 'tok_123',
        refreshToken: 'ref_456',
        expiresAt: 1700000000,
        accountId: 'acct_789',
      },
      source: 'config',
    });
  });

  test('omits undefined optional fields from oauth object', () => {
    const cred = oauthCredential('tok_123', { refreshToken: 'ref_456' });
    expect(cred.oauth).toEqual({ accessToken: 'tok_123', refreshToken: 'ref_456' });
    expect(cred.oauth).not.toHaveProperty('expiresAt');
    expect(cred.oauth).not.toHaveProperty('accountId');
  });

  test('defaults source to external', () => {
    const cred = oauthCredential('tok_123', { refreshToken: 'ref_456' });
    expect(cred.source).toBe('external');
  });
});

describe('credentialFound', () => {
  test('wraps credentials in ok result', () => {
    const creds = apiKeyCredential('sk-123');
    const result = credentialFound(creds);
    expect(result).toEqual({ ok: true, credentials: creds });
  });
});

describe('credentialMissing', () => {
  test('returns missing result without message', () => {
    const result = credentialMissing();
    expect(result).toEqual({ ok: false, reason: 'missing', message: undefined });
  });

  test('returns missing result with message', () => {
    const result = credentialMissing('API key not found');
    expect(result).toEqual({ ok: false, reason: 'missing', message: 'API key not found' });
  });
});

describe('credentialExpired', () => {
  test('returns expired result without message', () => {
    const result = credentialExpired();
    expect(result).toEqual({ ok: false, reason: 'expired', message: undefined });
  });

  test('returns expired result with message', () => {
    const result = credentialExpired('Token expired 2h ago');
    expect(result).toEqual({ ok: false, reason: 'expired', message: 'Token expired 2h ago' });
  });
});

describe('credentialInvalid', () => {
  test('returns invalid result without message', () => {
    const result = credentialInvalid();
    expect(result).toEqual({ ok: false, reason: 'invalid', message: undefined });
  });

  test('returns invalid result with message', () => {
    const result = credentialInvalid('Malformed key');
    expect(result).toEqual({ ok: false, reason: 'invalid', message: 'Malformed key' });
  });
});

describe('credentialError', () => {
  test('returns error result with message', () => {
    const result = credentialError('Network timeout');
    expect(result).toEqual({ ok: false, reason: 'error', message: 'Network timeout' });
  });
});

describe('isTokenExpired', () => {
  test('returns false for undefined expiresAt', () => {
    expect(isTokenExpired(undefined)).toBe(false);
  });

  test('returns true when token is already expired', () => {
    const pastTime = Date.now() - 60_000;
    expect(isTokenExpired(pastTime)).toBe(true);
  });

  test('returns false when token is well in the future', () => {
    const futureTime = Date.now() + 60 * 60 * 1000; // 1 hour from now
    expect(isTokenExpired(futureTime)).toBe(false);
  });

  test('returns true when token expires within default 5min buffer', () => {
    const almostExpired = Date.now() + 4 * 60 * 1000; // 4 minutes from now
    expect(isTokenExpired(almostExpired)).toBe(true);
  });

  test('returns false when token expires just outside default buffer', () => {
    const justOutside = Date.now() + 6 * 60 * 1000; // 6 minutes from now
    expect(isTokenExpired(justOutside)).toBe(false);
  });

  test('respects custom buffer', () => {
    const expiresAt = Date.now() + 30_000; // 30s from now
    expect(isTokenExpired(expiresAt, 60_000)).toBe(true);  // 60s buffer → expired
    expect(isTokenExpired(expiresAt, 10_000)).toBe(false);  // 10s buffer → not expired
  });

  test('zero buffer only catches already-expired tokens', () => {
    const future = Date.now() + 1000;
    const past = Date.now() - 1000;
    expect(isTokenExpired(future, 0)).toBe(false);
    expect(isTokenExpired(past, 0)).toBe(true);
  });
});
