import type { BasePlugin, PluginLogger } from './plugin.ts';
import type { PluginHttpClient, PluginContext } from './context.ts';

// ---------------------------------------------------------------------------
// Credentials
// ---------------------------------------------------------------------------

export type CredentialSource = 'env' | 'opencode' | 'external' | 'config';

export interface Credentials {
  apiKey?: string;
  oauth?: OAuthCredentials;
  groupId?: string;
  source: CredentialSource;
}

export interface OAuthCredentials {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  accountId?: string;
  managedProjectId?: string;
}

export interface RefreshedCredentials {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

// ---------------------------------------------------------------------------
// Credential Discovery
// ---------------------------------------------------------------------------

export interface CredentialResult {
  ok: boolean;
  credentials?: Credentials;
  reason?: 'missing' | 'expired' | 'invalid' | 'error';
  message?: string;
}

/**
 * Plugin-owned credential discovery and validation.
 *
 * Replaces the old declarative `auth: { envVars, externalPaths }` pattern.
 * The plugin decides *how* to find credentials; core provides sandboxed helpers.
 */
export interface ProviderAuth {
  /** Discover credentials using the provided context helpers. */
  discover(ctx: PluginContext): Promise<CredentialResult>;
  /** Check whether discovered credentials are sufficient to operate. */
  isConfigured(credentials: Credentials): boolean;
}

// ---------------------------------------------------------------------------
// Capabilities
// ---------------------------------------------------------------------------

export interface ProviderCapabilities {
  usageLimits: boolean;
  apiRateLimits: boolean;
  tokenUsage: boolean;
  actualCosts: boolean;
}

// ---------------------------------------------------------------------------
// Pricing
// ---------------------------------------------------------------------------

export interface ModelPricing {
  input: number;
  output: number;
  cacheRead?: number;
  cacheWrite?: number;
  source?: string;
}

export interface ProviderPricing {
  /**
   * Map a model ID to the identifier used by the pricing service.
   * Return `undefined` to use the model ID as-is.
   */
  mapModelId?(modelId: string): string | undefined;
  /**
   * The provider ID to use when querying models.dev.
   * Defaults to `plugin.id` if not specified.
   */
  modelsDevProviderId?: string;
  /** Static fallback prices keyed by model ID. */
  staticPrices?: Record<string, ModelPricing>;
}

// ---------------------------------------------------------------------------
// Usage Data
// ---------------------------------------------------------------------------

export interface UsageLimit {
  usedPercent: number | null;
  resetsAt?: number;
  label?: string;
  windowMinutes?: number;
}

export interface CostBreakdown {
  total: number;
  input?: number;
  output?: number;
  cacheRead?: number;
  cacheWrite?: number;
  currency: string;
}

export interface ProviderUsageData {
  planType?: string;
  allowed?: boolean;
  limitReached?: boolean;
  limits?: {
    primary?: UsageLimit;
    secondary?: UsageLimit;
    items?: UsageLimit[];
  };
  tokens?: {
    input: number;
    output: number;
    cacheRead?: number;
    cacheWrite?: number;
  };
  credits?: {
    hasCredits: boolean;
    unlimited: boolean;
    balance?: string;
  };
  cost?: {
    actual?: CostBreakdown;
    estimated?: CostBreakdown;
    source: 'api' | 'estimated';
  };
  fetchedAt: number;
  error?: string;
}

// ---------------------------------------------------------------------------
// Fetch Context
// ---------------------------------------------------------------------------

/** Context injected into `fetchUsage()`. Includes resolved credentials. */
export interface ProviderFetchContext {
  readonly credentials: Credentials;
  readonly http: PluginHttpClient;
  readonly logger: PluginLogger;
  readonly config: Record<string, unknown>;
  readonly signal: AbortSignal;
  readonly options?: {
    timePeriod?: 'session' | 'daily' | 'weekly' | 'monthly';
    sessionId?: string;
  };
}

// ---------------------------------------------------------------------------
// Provider Plugin
// ---------------------------------------------------------------------------

export interface ProviderPlugin extends BasePlugin {
  readonly type: 'provider';
  readonly capabilities: ProviderCapabilities;

  /** Plugin-owned credential discovery. */
  readonly auth: ProviderAuth;

  /** Optional pricing configuration for the models this provider serves. */
  readonly pricing?: ProviderPricing;

  /** Fetch current usage data from the provider's API. */
  fetchUsage(ctx: ProviderFetchContext): Promise<ProviderUsageData>;

  /** Optional OAuth token refresh. */
  refreshToken?(oauth: OAuthCredentials): Promise<RefreshedCredentials>;

  /** Optional health check (e.g. verify API key validity without fetching usage). */
  healthCheck?(ctx: PluginContext): Promise<{ ok: boolean; message?: string }>;
}
