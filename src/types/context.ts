/**
 * Context interfaces injected into plugins at runtime by core.
 *
 * Plugins never construct these — core creates and injects them.
 * The SDK defines the shapes so plugins can type their method signatures.
 */

import type { PluginLogger } from './plugin.ts';

// ---------------------------------------------------------------------------
// HTTP Client
// ---------------------------------------------------------------------------

/**
 * Sandboxed HTTP client.
 * Enforces the plugin's declared `permissions.network.allowedDomains`.
 */
export interface PluginHttpClient {
  fetch(url: string, init?: RequestInit): Promise<Response>;
}

// ---------------------------------------------------------------------------
// Auth Sources
// ---------------------------------------------------------------------------

/**
 * Helpers for credential discovery, injected by core.
 *
 * All methods respect the plugin's declared permissions.
 * Plugins use these to implement their own `auth.discover()` method
 * instead of relying on centralized core logic.
 */
export interface AuthSources {
  /** Read an environment variable (sandboxed to `permissions.env.vars`). */
  env: {
    get(name: string): string | undefined;
  };

  /** Read files from the filesystem (sandboxed to `permissions.filesystem.paths`). */
  files: {
    readText(path: string): Promise<string | null>;
    readJson<T = unknown>(path: string): Promise<T | null>;
    exists(path: string): Promise<boolean>;
  };

  /**
   * Read from OpenCode's auth storage.
   * Core handles locating the auth file; plugin provides the provider key.
   */
  opencode: {
    getProviderEntry(key: string): Promise<OpenCodeAuthEntry | null>;
  };

  /** Platform information for cross-platform credential path resolution. */
  platform: {
    os: 'darwin' | 'linux' | 'win32';
    homedir: string;
    arch: string;
  };
}

/** Shape of an entry in OpenCode's auth.json file. */
export interface OpenCodeAuthEntry {
  type: 'api' | 'oauth' | 'codex' | 'github' | 'wellknown';
  key?: string;
  access?: string;
  refresh?: string;
  expires?: number;
  token?: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
  accountId?: string;
  groupId?: string;
}

// ---------------------------------------------------------------------------
// Plugin Storage (KV)
// ---------------------------------------------------------------------------

/**
 * Per-plugin key-value storage.
 *
 * Namespaced by plugin ID — plugins can only access their own data.
 * Backed by core's storage engine (SQLite or filesystem).
 */
export interface PluginStorage {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
  has(key: string): Promise<boolean>;
}

// ---------------------------------------------------------------------------
// Plugin Context (full runtime context)
// ---------------------------------------------------------------------------

/**
 * Full runtime context provided to plugin methods like
 * `auth.discover()`, `fetchUsage()`, `parseSessions()`, etc.
 *
 * Extends lifecycle context with HTTP, auth, and storage capabilities.
 */
export interface PluginContext {
  /** Plugin's validated configuration values. */
  readonly config: Record<string, unknown>;
  /** Scoped logger. */
  readonly logger: PluginLogger;
  /** Sandboxed HTTP client. */
  readonly http: PluginHttpClient;
  /** Credential discovery helpers. */
  readonly authSources: AuthSources;
  /** Per-plugin persistent key-value storage. */
  readonly storage: PluginStorage;
  /** Abort signal — fired when the plugin is being stopped or the app is shutting down. */
  readonly signal: AbortSignal;
}
