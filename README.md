# @tokentop/plugin-sdk

[![npm](https://img.shields.io/npm/v/@tokentop/plugin-sdk?style=flat-square&color=CB3837&logo=npm)](https://www.npmjs.com/package/@tokentop/plugin-sdk)
[![CI](https://img.shields.io/github/actions/workflow/status/tokentopapp/plugin-sdk/ci.yml?style=flat-square&label=CI)](https://github.com/tokentopapp/plugin-sdk/actions/workflows/ci.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](LICENSE)

SDK for building [tokentop](https://github.com/tokentopapp/tokentop) plugins. Types, helpers, and a test harness for provider, agent, theme, and notification plugins.

## Install

```bash
bun add @tokentop/plugin-sdk
```

## Quick Example

```typescript
import {
  createProviderPlugin,
  apiKeyCredential,
  credentialFound,
  credentialMissing,
} from '@tokentop/plugin-sdk';

export default createProviderPlugin({
  id: 'my-provider',
  type: 'provider',
  name: 'My Provider',
  version: '1.0.0',
  meta: { brandColor: '#3b82f6' },
  permissions: {
    network: { enabled: true, allowedDomains: ['api.example.com'] },
    env: { read: true, vars: ['MY_API_KEY'] },
  },
  capabilities: {
    usageLimits: false,
    apiRateLimits: false,
    tokenUsage: false,
    actualCosts: true,
  },
  auth: {
    async discover(ctx) {
      const key = ctx.authSources.env.get('MY_API_KEY');
      return key ? credentialFound(apiKeyCredential(key)) : credentialMissing();
    },
    isConfigured: (creds) => !!creds.apiKey,
  },
  async fetchUsage(ctx) {
    const resp = await ctx.http.fetch('https://api.example.com/usage', {
      headers: { Authorization: `Bearer ${ctx.credentials.apiKey}` },
    });
    const data = await resp.json();
    return { fetchedAt: Date.now(), cost: { total: data.total, currency: 'USD', source: 'api' } };
  },
});
```

## Plugin Types

| Type | Interface | Purpose |
|------|-----------|---------|
| `provider` | `ProviderPlugin` | Fetch usage data from AI model providers |
| `agent` | `AgentPlugin` | Parse coding agent sessions for token tracking |
| `theme` | `ThemePlugin` | Color schemes for the TUI |
| `notification` | `NotificationPlugin` | Alert delivery (Slack, Discord, terminal bell) |

## Subpath Exports

| Import | Contents |
|--------|----------|
| `@tokentop/plugin-sdk` | Everything (types + helpers) |
| `@tokentop/plugin-sdk/types` | Type definitions only |
| `@tokentop/plugin-sdk/helpers` | `createPlugin` helpers, auth helpers, version utils |
| `@tokentop/plugin-sdk/testing` | Test harness and mock factories |

## Testing

Test plugins without running tokentop:

```typescript
import { createTestContext } from '@tokentop/plugin-sdk/testing';
import plugin from './src/index.ts';

const ctx = createTestContext({
  env: { MY_API_KEY: 'test-key' },
  httpMocks: {
    'https://api.example.com/usage': {
      status: 200,
      body: { total: 4.50 },
    },
  },
});

const creds = await plugin.auth.discover(ctx);
assert(creds.ok);
```

## Naming Convention

| Tier | Pattern | Example |
|------|---------|---------|
| Official | `@tokentop/{type}-<name>` | `@tokentop/agent-opencode` |
| Community | `tokentop-{type}-<name>` | `tokentop-provider-replicate` |
| Scoped community | `@scope/tokentop-{type}-<name>` | `@myname/tokentop-theme-catppuccin` |

## Versioning

| Version | What it is |
|---------|------------|
| SDK semver (`1.1.0`) | Package version on npm. Normal semver rules. |
| `apiVersion` (`2`) | Plugin contract version. Core checks at load time. Bumped rarely. |

Use `CURRENT_API_VERSION` and `isCompatible()` to check compatibility. The `createProviderPlugin()` / `createAgentPlugin()` / etc. helpers stamp `apiVersion` automatically.

## Documentation

See [docs/plugin-development.md](docs/plugin-development.md) for the full API reference covering all plugin types, credential discovery, lifecycle hooks, configuration schemas, and testing patterns.

## Contributing

See the [Contributing Guide](https://github.com/tokentopapp/.github/blob/main/CONTRIBUTING.md).

## License

MIT
