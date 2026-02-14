# @tokentop/plugin-sdk

## Project Overview

This is the **public SDK** for building tokentop plugins. It provides type definitions, helper utilities, and a test harness that community developers use to create providers, agents, themes, and notification plugins for [tokentop](https://github.com/tokentopapp/tokentop).

**This package is a dependency of community plugins, not of the main app.** The main tokentop app implements these interfaces internally; this package exists so plugin authors get types, autocomplete, and testing utilities without importing from tokentop's internals.

## Tech Stack

- **Runtime**: Bun
- **Language**: TypeScript (strict mode)
- **Package Manager**: Bun
- **Build**: `tsc` for declarations + `bun build` for JS output

## Architecture Principles

### 1. Types Are the Contract

The SDK is primarily type definitions. The interfaces in `src/types/` define the plugin API contract. Community plugins depend on these types; breaking them is a major version bump.

### 2. Zero Core Imports

This package must NEVER import from the tokentop app (`tokentop/src/*`). The SDK is a standalone package. Core implements these interfaces; the SDK only defines them.

### 3. Plugin-Owned Discovery

The v2 plugin architecture moves credential discovery INTO plugins. Plugins implement `auth.discover(ctx)` using helpers from `ctx.authSources`. The old pattern of declaring `auth: { envVars, externalPaths }` and letting core run centralized discovery is deprecated.

### 4. Context Injection

Plugins never construct their own HTTP clients, loggers, or storage. Core creates these (with sandboxing/permissions) and injects them via context objects. The SDK defines the context interfaces so plugins can type their method signatures.

## Directory Structure

```
src/
├── index.ts              # Main entry — re-exports everything
├── types/
│   ├── index.ts          # Barrel export for all types
│   ├── plugin.ts         # BasePlugin, PluginId, PluginPermissions, ConfigField, PluginLogger
│   ├── context.ts        # PluginContext, AuthSources, PluginHttpClient, PluginStorage
│   ├── provider.ts       # ProviderPlugin, Credentials, ProviderUsageData, ProviderAuth
│   ├── agent.ts          # AgentPlugin, SessionUsageData, ActivityCallback
│   ├── theme.ts          # ThemePlugin, ThemeColors, ThemeComponents
│   └── notification.ts   # NotificationPlugin, NotificationEvent
├── helpers/
│   ├── index.ts          # Barrel export for helpers
│   ├── create.ts         # createProviderPlugin(), createAgentPlugin(), etc.
│   ├── auth.ts           # Credential construction helpers (apiKeyCredential, oauthCredential, etc.)
│   └── version.ts        # SDK_VERSION, CURRENT_API_VERSION, compatibility checks
└── testing/
    ├── index.ts          # Barrel export for test utilities
    └── harness.ts        # createTestContext(), mock factories for logger/http/storage
```

## Plugin Types

| Type | Interface | Purpose | Key Methods |
|------|-----------|---------|-------------|
| `provider` | `ProviderPlugin` | Fetch usage data from AI model providers | `auth.discover()`, `auth.isConfigured()`, `fetchUsage()` |
| `agent` | `AgentPlugin` | Parse coding agent sessions for token tracking | `isInstalled()`, `parseSessions()`, `startActivityWatch?()` |
| `theme` | `ThemePlugin` | Color schemes for the TUI | Pure data: `theme.colors`, `theme.components` |
| `notification` | `NotificationPlugin` | Alert delivery (Slack, Discord, terminal, etc.) | `initialize()`, `notify()`, `test?()`, `supports?()` |

## Versioning

Two version numbers matter:

| Version | What | Who Bumps It |
|---------|------|--------------|
| **SDK semver** (`package.json version`) | npm package version | Normal semver rules |
| **`apiVersion`** (integer, currently `2`) | Plugin contract version | Bumped rarely, only for breaking contract changes |

- `apiVersion` is checked by core at plugin load time
- SDK semver follows normal rules: patch for fixes, minor for additions, major for breaking type changes
- Both must be considered: a new optional field on `ProviderPlugin` is a minor SDK bump but does NOT bump `apiVersion`

### When to Bump `apiVersion`

- Adding a required method to a plugin interface
- Changing the signature of an existing required method
- Removing a context field that plugins depend on
- Restructuring the plugin shape (e.g. moving `auth` from declarative to method-based)

### When NOT to Bump `apiVersion`

- Adding optional methods or fields
- Adding new types/interfaces
- Adding helper functions
- Expanding union types (e.g. new `NotificationEventType`)

## Plugin Lifecycle

All plugin types share these optional lifecycle hooks (from `BasePlugin`):

```
load → validate → initialize() → start() → [runtime] → stop() → destroy()
```

| Hook | When Called | Use Case |
|------|------------|----------|
| `initialize()` | After load + validation | Open connections, allocate resources |
| `start()` | After init, on app start or re-enable | Begin polling, start watchers |
| `stop()` | Before destroy, on disable | Pause work, stop watchers |
| `destroy()` | Before unload, on app shutdown | Close connections, flush buffers |
| `onConfigChange()` | When user changes plugin settings | React to config updates |

## Credential Discovery (v2 Pattern)

The key architectural decision: **plugins own their credential discovery**.

### How It Works

1. Core creates a `PluginContext` with sandboxed `authSources` helpers
2. Core calls `plugin.auth.discover(ctx)` 
3. Plugin uses `ctx.authSources.env.get()`, `ctx.authSources.files.readJson()`, `ctx.authSources.opencode.getProviderEntry()` to find credentials
4. Plugin returns `CredentialResult` — either `{ ok: true, credentials }` or `{ ok: false, reason, message }`
5. Core never needs to know which env vars, file paths, or key names the plugin uses

### Auth Helpers

The SDK provides convenience functions for constructing credential results:

- `apiKeyCredential(key, source)` — wrap an API key
- `oauthCredential(accessToken, options)` — wrap OAuth tokens
- `credentialFound(credentials)` — success result
- `credentialMissing(message?)` — no credentials found
- `credentialExpired(message?)` — token expired
- `isTokenExpired(expiresAt, bufferMs)` — expiry check with buffer

## Context Injection

Plugins receive different context objects depending on the method:

| Context | Provided To | Contains |
|---------|-------------|----------|
| `PluginLifecycleContext` | Lifecycle hooks | `config`, `logger` |
| `PluginContext` | `auth.discover()`, `isInstalled()` | `config`, `logger`, `http`, `authSources`, `storage`, `signal` |
| `ProviderFetchContext` | `fetchUsage()` | `credentials`, `http`, `logger`, `config`, `signal`, `options` |
| `AgentFetchContext` | `parseSessions()` | `http`, `logger`, `config`, `signal` |
| `NotificationContext` | `notify()`, `initialize()` | `logger`, `config`, `signal` |

## Testing

The `@tokentop/plugin-sdk/testing` subpath provides mock factories:

```typescript
import { createTestContext, createTestProviderFetchContext } from '@tokentop/plugin-sdk/testing';
import { apiKeyCredential } from '@tokentop/plugin-sdk';

// Full plugin context with mocked auth sources
const ctx = createTestContext({
  env: { MY_API_KEY: 'test-key' },
  files: { '/path/to/auth.json': '{"token": "abc"}' },
  httpMocks: {
    'https://api.example.com/usage': { status: 200, body: { used: 50 } },
  },
});

// Provider-specific fetch context with credentials pre-set
const fetchCtx = createTestProviderFetchContext(
  apiKeyCredential('test-key'),
  { httpMocks: { 'https://api.example.com/usage': { status: 200, body: {} } } },
);
```

## Development Commands

```bash
bun install           # Install dependencies
bun run build         # Build types + JS
bun run typecheck     # TypeScript check (no emit)
bun test              # Run tests
bun run clean         # Remove dist/
```

## npm Publishing

Package name: `@tokentop/plugin-sdk`

Subpath exports:
- `@tokentop/plugin-sdk` — everything (types + helpers)
- `@tokentop/plugin-sdk/types` — types only
- `@tokentop/plugin-sdk/helpers` — helper utilities only
- `@tokentop/plugin-sdk/testing` — test harness and mocks

## Relationship to Main App

| This Package (SDK) | Main App (tokentop) |
|---------------------|---------------------|
| Defines interfaces | Implements interfaces |
| Provides type-only context shapes | Creates real sandboxed contexts at runtime |
| Provides mock factories for testing | Provides real HTTP, storage, auth implementations |
| Has zero runtime dependencies | Depends on Bun, SQLite, OpenTUI, etc. |

The main app does NOT depend on this package. It has its own copies of these types (which will be migrated to import from the SDK once the interfaces stabilize). Community plugins depend on this package.

## Code Style

- TypeScript strict mode
- Prefer `const` over `let`
- Use JSDoc on all public interfaces and methods — this is the primary documentation for plugin developers
- Keep helpers thin — validate + construct, no complex logic
- No runtime dependencies (this is a types + thin helpers package)

## Important Constraints

- **NEVER import from tokentop app internals** — this package is standalone
- **NEVER add heavy runtime dependencies** — keep the package lightweight
- **NEVER change required method signatures without bumping `apiVersion`**
- **NEVER remove public exports** without a major version bump
- **Section divider comments** (`// ----`) are intentional for navigability in type files
- **JSDoc comments** on public types are necessary — they're the plugin developer's primary documentation

## Git Workflow

- Feature branches from `main`
- Conventional commits: `feat:`, `fix:`, `docs:`, `refactor:`
- Types changes that add optional fields: `feat:` + minor version
- Types changes that break existing plugins: coordinate with main app release
