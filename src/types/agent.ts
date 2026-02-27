import type { BasePlugin, PluginLogger } from './plugin.ts';
import type { PluginHttpClient, PluginContext } from './context.ts';
import type { Credentials, CredentialResult } from './provider.ts';

// ---------------------------------------------------------------------------
// Agent Configuration
// ---------------------------------------------------------------------------

export interface AgentConfig {
  /** Display name for this coding agent (e.g. "OpenCode", "Cursor"). */
  name: string;
  /** CLI command that launches the agent (for display/detection). */
  command?: string;
  /** Path to the agent's config directory (for display/debugging). */
  configPath?: string;
  /** Path to the agent's session storage. */
  sessionPath?: string;
  /** Path to the agent's auth file (for credential reading). */
  authPath?: string;
}

// ---------------------------------------------------------------------------
// Capabilities
// ---------------------------------------------------------------------------

export interface AgentCapabilities {
  sessionParsing: boolean;
  authReading: boolean;
  realTimeTracking: boolean;
  multiProvider: boolean;
}

// ---------------------------------------------------------------------------
// Agent Credentials
// ---------------------------------------------------------------------------

export interface AgentCredentials {
  providers: Record<string, Credentials | undefined>;
}

export interface AgentProviderConfig {
  id: string;
  name: string;
  configured: boolean;
  enabled?: boolean;
}

// ---------------------------------------------------------------------------
// Sessions
// ---------------------------------------------------------------------------

export interface SessionParseOptions {
  sessionId?: string;
  timePeriod?: 'session' | 'daily' | 'weekly' | 'monthly';
  limit?: number;
  /** Epoch ms — only return sessions updated after this timestamp. */
  since?: number;
}

export interface SessionUsageData {
  sessionId: string;
  sessionName?: string;
  providerId: string;
  modelId: string;
  tokens: {
    input: number;
    output: number;
    cacheRead?: number;
    cacheWrite?: number;
  };
  timestamp: number;
  sessionUpdatedAt?: number;
  projectPath?: string;
  cost?: number;
  /**
   * Optional plugin-defined metadata passed through to the core.
   * Plugins can use this to signal data quality, enrichment status,
   * or other plugin-specific information the UI may choose to render.
   *
   * Known keys (convention, not enforced):
   *   - `isEstimated` (boolean) — true when token counts are local estimates
   */
  metadata?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Real-time Activity
// ---------------------------------------------------------------------------

export interface ActivityUpdate {
  sessionId: string;
  messageId: string;
  tokens: {
    input: number;
    output: number;
    reasoning?: number;
    cacheRead?: number;
    cacheWrite?: number;
  };
  timestamp: number;
}

export type ActivityCallback = (update: ActivityUpdate) => void;

// ---------------------------------------------------------------------------
// Agent Fetch Context
// ---------------------------------------------------------------------------

export interface AgentFetchContext {
  readonly http: PluginHttpClient;
  readonly logger: PluginLogger;
  readonly config: Record<string, unknown>;
  readonly signal: AbortSignal;
}

// ---------------------------------------------------------------------------
// Agent Plugin
// ---------------------------------------------------------------------------

export interface AgentPlugin extends BasePlugin {
  readonly type: 'agent';
  readonly agent: AgentConfig;
  readonly capabilities: AgentCapabilities;

  /** Optional plugin-owned credential discovery for the agent's auth files. */
  readonly auth?: {
    discover(ctx: PluginContext): Promise<CredentialResult>;
    isConfigured(credentials: Credentials): boolean;
  };

  /** Check if this coding agent is installed on the user's machine. */
  isInstalled(ctx: PluginContext): Promise<boolean>;

  /** Read credentials that the coding agent has stored. */
  readCredentials?(ctx: AgentFetchContext): Promise<AgentCredentials>;

  /** Parse session usage data from the agent's local storage. */
  parseSessions(options: SessionParseOptions, ctx: AgentFetchContext): Promise<SessionUsageData[]>;

  /** List which model providers this agent is configured to use. */
  getProviders?(ctx: AgentFetchContext): Promise<AgentProviderConfig[]>;

  /** Start watching for real-time activity updates. */
  startActivityWatch?(ctx: PluginContext, callback: ActivityCallback): void;

  /** Stop watching for real-time activity updates. */
  stopActivityWatch?(ctx: PluginContext): void;
}
