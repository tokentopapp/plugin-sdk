import type { Credentials, OAuthCredentials, CredentialResult } from '../types/provider.ts';

export function apiKeyCredential(key: string, source: Credentials['source'] = 'env'): Credentials {
  return { apiKey: key, source };
}

export function oauthCredential(
  accessToken: string,
  options?: {
    refreshToken?: string;
    expiresAt?: number;
    accountId?: string;
    source?: Credentials['source'];
  },
): Credentials {
  const oauth: OAuthCredentials = { accessToken };
  if (options?.refreshToken !== undefined) oauth.refreshToken = options.refreshToken;
  if (options?.expiresAt !== undefined) oauth.expiresAt = options.expiresAt;
  if (options?.accountId !== undefined) oauth.accountId = options.accountId;
  return { oauth, source: options?.source ?? 'external' };
}

export function credentialFound(credentials: Credentials): CredentialResult {
  return { ok: true, credentials };
}

export function credentialMissing(message?: string): CredentialResult {
  return { ok: false, reason: 'missing', message };
}

export function credentialExpired(message?: string): CredentialResult {
  return { ok: false, reason: 'expired', message };
}

export function credentialInvalid(message?: string): CredentialResult {
  return { ok: false, reason: 'invalid', message };
}

export function credentialError(message: string): CredentialResult {
  return { ok: false, reason: 'error', message };
}

export function isTokenExpired(expiresAt: number | undefined, bufferMs = 5 * 60 * 1000): boolean {
  if (expiresAt === undefined) return false;
  return expiresAt <= Date.now() + bufferMs;
}
