# Plugin Development Guide

## Getting Started

```bash
mkdir tokentop-provider-replicate
cd tokentop-provider-replicate
bun init
bun add @tokentop/plugin-sdk
```

```typescript
import { createProviderPlugin } from '@tokentop/plugin-sdk';
import type { ProviderPlugin, PluginContext, ProviderFetchContext } from '@tokentop/plugin-sdk';
```

## Provider Plugins

Provider plugins fetch usage data from AI model provider APIs.

### Interface

```typescript
interface ProviderPlugin extends BasePlugin {
  type: 'provider';
  capabilities: ProviderCapabilities;
  auth: ProviderAuth;
  pricing?: ProviderPricing;
  fetchUsage(ctx: ProviderFetchContext): Promise<ProviderUsageData>;
  refreshToken?(oauth: OAuthCredentials): Promise<RefreshedCredentials>;
  healthCheck?(ctx: PluginContext): Promise<{ ok: boolean; message?: string }>;
}
```

### Capabilities

```typescript
capabilities: {
  usageLimits: true,    // Provider has rate limits (e.g. Anthropic 5h/7d windows)
  apiRateLimits: false,  // Provider reports API rate limit headers
  tokenUsage: true,      // Provider reports token counts
  actualCosts: false,    // Provider reports actual dollar costs
}
```

### Credential Discovery

Plugins own their credential discovery. Core provides sandboxed helpers via `ctx.authSources`:

```typescript
auth: {
  async discover(ctx) {
    // 1. Try OpenCode OAuth (preferred for usage tracking APIs)
    const entry = await ctx.authSources.opencode.getProviderEntry('replicate');
    if (entry?.accessToken) {
      return credentialFound(oauthCredential(entry.accessToken, {
        refreshToken: entry.refreshToken,
        expiresAt: entry.expiresAt,
      }));
    }

    // 2. Try environment variable
    const key = ctx.authSources.env.get('REPLICATE_API_TOKEN');
    if (key) {
      return credentialFound(apiKeyCredential(key));
    }

    // 3. Try external config file
    const config = await ctx.authSources.files.readJson<{ token: string }>(
      `${ctx.authSources.platform.homedir}/.config/replicate/auth.json`
    );
    if (config?.token) {
      return credentialFound(apiKeyCredential(config.token, 'external'));
    }

    return credentialMissing('No Replicate credentials found');
  },

  isConfigured: (credentials) => !!credentials.apiKey || !!credentials.oauth?.accessToken,
}
```

### Auth Sources Reference

| Source | Method | Description |
|--------|--------|-------------|
| Environment | `ctx.authSources.env.get(name)` | Read env var (sandboxed to `permissions.env.vars`) |
| Files | `ctx.authSources.files.readText(path)` | Read file as string |
| Files | `ctx.authSources.files.readJson<T>(path)` | Read and parse JSON file |
| Files | `ctx.authSources.files.exists(path)` | Check if file exists |
| OpenCode | `ctx.authSources.opencode.getProviderEntry(key)` | Read from OpenCode's auth storage |
| Platform | `ctx.authSources.platform.os` | `'darwin'`, `'linux'`, or `'win32'` |
| Platform | `ctx.authSources.platform.homedir` | User's home directory |

### Auth Helpers

```typescript
import {
  apiKeyCredential,
  oauthCredential,
  credentialFound,
  credentialMissing,
  credentialExpired,
  credentialInvalid,
  credentialError,
  isTokenExpired,
} from '@tokentop/plugin-sdk';

apiKeyCredential('sk-123');                    // { apiKey: 'sk-123', source: 'env' }
apiKeyCredential('sk-123', 'external');        // { apiKey: 'sk-123', source: 'external' }
oauthCredential('access-tok', {               // { oauth: { accessToken, refreshToken, ... }, source: 'external' }
  refreshToken: 'refresh-tok',
  expiresAt: Date.now() + 3600000,
});

credentialFound(creds);                        // { ok: true, credentials: creds }
credentialMissing('No API key found');         // { ok: false, reason: 'missing', message: '...' }
isTokenExpired(expiresAt, 5 * 60 * 1000);     // true if within 5min buffer of expiry
```

### Fetch Context

`fetchUsage()` receives a `ProviderFetchContext`:

```typescript
interface ProviderFetchContext {
  credentials: Credentials;       // Resolved credentials from auth.discover()
  http: PluginHttpClient;         // Sandboxed fetch (domain allowlisted)
  logger: PluginLogger;           // Scoped logger ([plugin:my-provider])
  config: Record<string, unknown>;// Plugin's user config values
  signal: AbortSignal;            // Cancelled on shutdown
  options?: {
    timePeriod?: 'session' | 'daily' | 'weekly' | 'monthly';
  };
}
```

### Usage Data Shape

```typescript
interface ProviderUsageData {
  planType?: string;              // e.g. "Pro", "Teams", "Free"
  allowed?: boolean;
  limitReached?: boolean;
  limits?: {
    primary?: UsageLimit;         // Main rate limit
    secondary?: UsageLimit;       // Secondary rate limit
    items?: UsageLimit[];         // All limit windows
  };
  tokens?: { input: number; output: number; cacheRead?: number; cacheWrite?: number };
  credits?: { hasCredits: boolean; unlimited: boolean; balance?: string };
  cost?: {
    actual?: CostBreakdown;
    estimated?: CostBreakdown;
    source: 'api' | 'estimated';
  };
  fetchedAt: number;
  error?: string;
}
```

### Pricing

Plugins can provide pricing metadata so core can estimate costs:

```typescript
pricing: {
  modelsDevProviderId: 'replicate',  // ID to query models.dev API
  mapModelId(modelId) {              // Map internal model IDs to pricing IDs
    return modelId.split(':')[0];
  },
  staticPrices: {                    // Fallback when models.dev is unavailable
    'meta/llama-3': { input: 0.65, output: 2.75 },
  },
}
```

### Complete Provider Example

```typescript
import {
  createProviderPlugin,
  apiKeyCredential,
  credentialFound,
  credentialMissing,
} from '@tokentop/plugin-sdk';

export default createProviderPlugin({
  id: 'replicate',
  type: 'provider',
  version: '1.0.0',
  meta: {
    name: 'Replicate',
    description: 'Replicate API usage and cost tracking',
    brandColor: '#3b82f6',
    homepage: 'https://replicate.com',
  },
  permissions: {
    network: { enabled: true, allowedDomains: ['api.replicate.com'] },
    env: { read: true, vars: ['REPLICATE_API_TOKEN'] },
  },
  capabilities: {
    usageLimits: false,
    apiRateLimits: true,
    tokenUsage: false,
    actualCosts: true,
  },
  auth: {
    async discover(ctx) {
      const token = ctx.authSources.env.get('REPLICATE_API_TOKEN');
      if (token) return credentialFound(apiKeyCredential(token));
      return credentialMissing('Set REPLICATE_API_TOKEN environment variable');
    },
    isConfigured: (creds) => !!creds.apiKey,
  },
  async fetchUsage(ctx) {
    const resp = await ctx.http.fetch('https://api.replicate.com/v1/account', {
      headers: { Authorization: `Bearer ${ctx.credentials.apiKey}` },
      signal: ctx.signal,
    });

    if (!resp.ok) {
      return { fetchedAt: Date.now(), error: `HTTP ${resp.status}` };
    }

    const data = await resp.json() as { spend: { total: number } };
    return {
      fetchedAt: Date.now(),
      cost: {
        actual: { total: data.spend.total, currency: 'USD' },
        source: 'api',
      },
    };
  },
});
```

## Agent Plugins

Agent plugins parse coding agent sessions to track token usage across models.

### Interface

```typescript
interface AgentPlugin extends BasePlugin {
  type: 'agent';
  agent: { name: string };
  capabilities: AgentCapabilities;
  auth?: { discover(ctx): Promise<CredentialResult>; isConfigured(creds): boolean };
  isInstalled(ctx: PluginContext): Promise<boolean>;
  parseSessions(options: SessionParseOptions, ctx: AgentFetchContext): Promise<SessionUsageData[]>;
  getProviders?(ctx: AgentFetchContext): Promise<AgentProviderConfig[]>;
  startActivityWatch?(ctx: PluginContext, callback: ActivityCallback): void;
  stopActivityWatch?(ctx: PluginContext): void;
}
```

### Session Data Shape

```typescript
interface SessionUsageData {
  sessionId: string;
  sessionName?: string;
  providerId: string;     // e.g. "anthropic", "openai"
  modelId: string;        // e.g. "claude-sonnet-4-20250514"
  tokens: { input: number; output: number; cacheRead?: number; cacheWrite?: number };
  timestamp: number;
  sessionUpdatedAt?: number;
  projectPath?: string;
}
```

Plugins return flat arrays of `SessionUsageData` rows. Core handles aggregation, costing, and windowed breakdowns.

## Theme Plugins

Themes are pure data -- no async logic, no methods.

### Interface

```typescript
interface ThemePlugin extends BasePlugin {
  type: 'theme';
  theme: {
    colorScheme: 'light' | 'dark';
    colors: ThemeColors;
    components?: ThemeComponents;
    isDefault?: boolean;
    priority?: number;
  };
}
```

### Complete Theme Example

```typescript
import { createThemePlugin } from '@tokentop/plugin-sdk';

export default createThemePlugin({
  id: 'catppuccin',
  type: 'theme',
  name: 'Catppuccin',
  version: '1.0.0',
  meta: { description: 'Soothing pastel theme' },
  permissions: {},
  theme: {
    colorScheme: 'dark',
    colors: {
      bg: '#1e1e2e', fg: '#cdd6f4', border: '#585b70', borderFocused: '#cba6f7',
      primary: '#cba6f7', secondary: '#89b4fa', accent: '#f38ba8', muted: '#6c7086',
      success: '#a6e3a1', warning: '#f9e2af', error: '#f38ba8', info: '#89dceb',
      headerBg: '#181825', headerFg: '#cdd6f4',
      statusBarBg: '#181825', statusBarFg: '#6c7086',
      tableBg: '#1e1e2e', tableHeaderBg: '#313244', tableHeaderFg: '#cba6f7',
      tableRowBg: '#1e1e2e', tableRowAltBg: '#181825', tableRowFg: '#cdd6f4',
      tableSelectedBg: '#45475a', tableSelectedFg: '#cdd6f4',
    },
  },
});
```

## Notification Plugins

Notification plugins deliver alerts when events occur (budget thresholds, provider errors, etc.).

### Interface

```typescript
interface NotificationPlugin extends BasePlugin {
  type: 'notification';
  configSchema?: Record<string, ConfigField>;
  initialize(ctx: NotificationContext): Promise<void>;
  notify(ctx: NotificationContext, event: NotificationEvent): Promise<void>;
  test?(ctx: NotificationContext): Promise<boolean>;
  supports?(event: NotificationEvent): boolean;
  destroy?(): Promise<void>;
}
```

### Event Types

```typescript
type NotificationEventType =
  | 'budget.thresholdCrossed'
  | 'budget.limitReached'
  | 'provider.fetchFailed'
  | 'provider.limitReached'
  | 'provider.recovered'
  | 'plugin.crashed'
  | 'plugin.disabled'
  | 'app.started'
  | 'app.updated';

type NotificationSeverity = 'info' | 'warning' | 'critical';
```

### Slack Webhook Example

```typescript
import { createNotificationPlugin } from '@tokentop/plugin-sdk';

export default createNotificationPlugin({
  id: 'slack-webhook',
  type: 'notification',
  name: 'Slack Webhook',
  version: '1.0.0',
  permissions: {
    network: { enabled: true, allowedDomains: ['hooks.slack.com'] },
  },
  configSchema: {
    webhookUrl: { type: 'string', label: 'Webhook URL', required: true },
  },

  async initialize(ctx) {
    if (!ctx.config.webhookUrl) {
      throw new Error('Slack webhook URL is required');
    }
  },

  supports(event) {
    return event.severity === 'warning' || event.severity === 'critical';
  },

  async notify(ctx, event) {
    await fetch(ctx.config.webhookUrl as string, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `[${event.severity.toUpperCase()}] ${event.title}: ${event.message}`,
      }),
    });
  },
});
```

## Lifecycle Hooks

All plugin types share optional lifecycle hooks:

| Hook | When | Use Case |
|------|------|----------|
| `initialize(ctx)` | After load + validation | Open connections, allocate resources |
| `start(ctx)` | After init, on app start | Begin polling, start watchers |
| `stop(ctx)` | Before destroy, on disable | Pause work, stop watchers |
| `destroy(ctx)` | Before unload, on shutdown | Close connections, flush buffers |
| `onConfigChange(config, ctx)` | When user changes settings | React to config updates |

## Plugin Metadata

```typescript
meta: {
  name: 'My Plugin',           // Display name in settings and provider cards
  description: 'What it does',  // Shown in plugin list
  brandColor: '#d97757',        // Hex color for charts and UI accents
  homepage: 'https://...',      // Link in settings UI
  icon: '◆',                    // Single character for compact displays
}
```

`brandColor` replaces hardcoded color logic in the TUI -- your plugin gets its own visual identity automatically.

## Configuration Schema

Expose user-configurable settings via `configSchema`:

```typescript
configSchema: {
  apiEndpoint: {
    type: 'string',
    label: 'API Endpoint',
    description: 'Base URL for the provider API',
    default: 'https://api.example.com',
  },
  requestTimeout: {
    type: 'number',
    label: 'Timeout (ms)',
    min: 1000,
    max: 60000,
    default: 10000,
  },
  region: {
    type: 'select',
    label: 'Region',
    options: [
      { value: 'us', label: 'US' },
      { value: 'eu', label: 'EU' },
    ],
    default: 'us',
  },
}
```

Core renders these in the settings UI and persists values in the user's config file.

## Testing

### Test Context

```typescript
import { createTestContext, createTestProviderFetchContext } from '@tokentop/plugin-sdk/testing';
import { apiKeyCredential } from '@tokentop/plugin-sdk';
import plugin from '../src/index.ts';

// Test credential discovery
const ctx = createTestContext({
  env: { REPLICATE_API_TOKEN: 'r8_test_token' },
});

const result = await plugin.auth.discover(ctx);
assert(result.ok);
assert(result.credentials?.apiKey === 'r8_test_token');

// Test fetchUsage
const fetchCtx = createTestProviderFetchContext(
  apiKeyCredential('r8_test_token'),
  {
    httpMocks: {
      'https://api.replicate.com/v1/account': {
        status: 200,
        body: { spend: { total: 12.34 } },
      },
    },
  },
);

const usage = await plugin.fetchUsage(fetchCtx);
assert(usage.cost?.actual?.total === 12.34);
```

### Mock Factories

| Factory | Creates |
|---------|---------|
| `createTestContext(opts)` | Full `PluginContext` with mocked everything |
| `createTestProviderFetchContext(creds, opts)` | `ProviderFetchContext` with pre-set credentials |
| `createTestAgentFetchContext(opts)` | `AgentFetchContext` |
| `createMockLogger()` | Logger that captures entries in `.entries[]` |
| `createMockHttpClient({ mocks })` | HTTP client that returns canned responses |
| `createMockStorage(initial)` | In-memory KV store |

## Publishing to npm

### Package Name Convention

| Plugin Type | Name Pattern |
|-------------|-------------|
| Provider | `@tokentop/provider-<name>` |
| Agent | `@tokentop/agent-<name>` |
| Theme | `@tokentop/theme-<name>` |
| Notification | `@tokentop/notification-<name>` |

### package.json

```json
{
  "name": "@tokentop/provider-replicate",
  "version": "1.0.0",
  "type": "module",
  "main": "src/index.ts",
  "files": ["src", "dist"],
  "dependencies": {
    "@tokentop/plugin-sdk": "^0.1.0"
  }
}
```

## Versioning

- **SDK semver** (`0.1.0`): npm package version, normal semver rules
- **`apiVersion`** (integer `2`): plugin contract version, checked by core at load time

The `createProviderPlugin()` / `createAgentPlugin()` / etc. helpers automatically stamp `apiVersion: CURRENT_API_VERSION` on your plugin. You don't set it manually.

If core supports `apiVersion: 2` and a plugin declares `apiVersion: 3`, core rejects it with a clear compatibility error.
