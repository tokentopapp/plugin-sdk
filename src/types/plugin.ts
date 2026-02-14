/**
 * Core plugin types and interfaces for the tokentop plugin system.
 *
 * All plugin types extend {@link BasePlugin} and must declare their
 * permissions, metadata, and optional lifecycle hooks.
 */

// ---------------------------------------------------------------------------
// Identity
// ---------------------------------------------------------------------------

/** Opaque plugin identifier — kebab-case string, globally unique. */
export type PluginId = string;

/** Discriminator for the four plugin categories. */
export type PluginType = 'provider' | 'agent' | 'theme' | 'notification';

/**
 * Current API contract version.
 * Core checks this at load time to ensure compatibility.
 */
export const CURRENT_API_VERSION = 2;

// ---------------------------------------------------------------------------
// Permissions
// ---------------------------------------------------------------------------

/** Controls what a plugin is allowed to access at runtime. */
export interface PluginPermissions {
  /** Network access — domain allowlisting for outbound HTTP. */
  network?: {
    enabled: boolean;
    allowedDomains?: string[];
  };
  /** Filesystem access — path allowlisting for read/write. */
  filesystem?: {
    read?: boolean;
    write?: boolean;
    paths?: string[];
  };
  /** Environment variable access — var name allowlisting. */
  env?: {
    read?: boolean;
    vars?: string[];
  };
  /** System integration access. */
  system?: {
    notifications?: boolean;
    clipboard?: boolean;
  };
}

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

/** Public-facing metadata about a plugin. */
export interface PluginMeta {
  /** Plugin author name or handle. */
  author?: string;
  /** Brief description of what the plugin does. */
  description?: string;
  /** Plugin homepage or documentation URL. */
  homepage?: string;
  /** Source repository URL. */
  repository?: string;
  /** SPDX license identifier. */
  license?: string;
  /**
   * Brand color as a hex string (e.g. `"#d97757"`).
   * Used by the TUI for provider cards, charts, and status indicators.
   */
  brandColor?: string;
  /**
   * Single-character icon or short glyph for compact displays.
   * Example: `"◆"`, `"▲"`, `"⚡"`
   */
  icon?: string;
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/** Describes a user-configurable setting that the plugin exposes. */
export interface ConfigField {
  /** Data type of the setting value. */
  type: 'string' | 'number' | 'boolean' | 'select';
  /** Label shown in the settings UI. */
  label?: string;
  /** Help text shown below the field. */
  description?: string;
  /** Whether the field must have a value. */
  required?: boolean;
  /** Default value when no user config exists. */
  default?: unknown;
  /** Available options (for `select` type only). */
  options?: Array<{ value: string; label: string }>;
  /** Minimum value (for `number` type only). */
  min?: number;
  /** Maximum value (for `number` type only). */
  max?: number;
}

// ---------------------------------------------------------------------------
// Base Plugin
// ---------------------------------------------------------------------------

/**
 * Base interface that all plugins must implement.
 *
 * Provides identity, metadata, permissions, optional configuration schema,
 * and lifecycle hooks.
 */
export interface BasePlugin {
  /** API version this plugin targets. Must equal {@link CURRENT_API_VERSION}. */
  readonly apiVersion: 2;

  /** Unique plugin identifier (kebab-case). */
  readonly id: PluginId;

  /** Plugin type discriminator. */
  readonly type: PluginType;

  /** Human-readable display name. */
  readonly name: string;

  /** Semantic version string of this plugin (e.g. `"1.0.0"`). */
  readonly version: string;

  /** Public-facing metadata. */
  readonly meta?: PluginMeta;

  /** Required permissions. */
  readonly permissions: PluginPermissions;

  /**
   * Optional configuration schema.
   * Core renders these fields in the settings UI and persists user values.
   * Keys are the config field identifiers.
   */
  readonly configSchema?: Record<string, ConfigField>;

  /**
   * Default config values. Used when no user configuration exists.
   * Keys must match those in {@link configSchema}.
   */
  readonly defaultConfig?: Record<string, unknown>;

  // -- Lifecycle Hooks (all optional) -------------------------------------

  /**
   * Called once after the plugin is loaded and validated.
   * Use for one-time setup (open connections, allocate resources).
   */
  initialize?(ctx: PluginLifecycleContext): Promise<void>;

  /**
   * Called when the plugin should begin active work (e.g. polling).
   * Called after `initialize()` during app startup, and after re-enable.
   */
  start?(ctx: PluginLifecycleContext): Promise<void>;

  /**
   * Called when the plugin should pause active work.
   * Called before `destroy()` during app shutdown, and on disable.
   */
  stop?(ctx: PluginLifecycleContext): Promise<void>;

  /**
   * Called once before the plugin is unloaded.
   * Use for cleanup (close connections, flush buffers).
   */
  destroy?(ctx: PluginLifecycleContext): Promise<void>;

  /**
   * Called when the user changes this plugin's configuration.
   * Receive the new validated config values.
   */
  onConfigChange?(config: Record<string, unknown>, ctx: PluginLifecycleContext): Promise<void> | void;
}

// ---------------------------------------------------------------------------
// Lifecycle context (minimal — just what lifecycle hooks need)
// ---------------------------------------------------------------------------

/**
 * Minimal context provided to lifecycle hooks.
 * More specific contexts (e.g. {@link ProviderFetchContext}) extend this
 * for domain-specific methods.
 */
export interface PluginLifecycleContext {
  /** Plugin's validated configuration values. */
  readonly config: Record<string, unknown>;
  /** Scoped logger that prefixes all output with the plugin ID. */
  readonly logger: PluginLogger;
}

// ---------------------------------------------------------------------------
// Logger
// ---------------------------------------------------------------------------

/** Scoped logging interface provided to plugins. */
export interface PluginLogger {
  debug(message: string, data?: Record<string, unknown>): void;
  info(message: string, data?: Record<string, unknown>): void;
  warn(message: string, data?: Record<string, unknown>): void;
  error(message: string, data?: Record<string, unknown>): void;
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

/** Thrown when a plugin attempts an action not allowed by its permissions. */
export class PluginPermissionError extends Error {
  constructor(
    public readonly pluginId: PluginId,
    public readonly permission: keyof PluginPermissions,
    message: string,
  ) {
    super(`Plugin "${pluginId}" permission denied: ${message}`);
    this.name = 'PluginPermissionError';
  }
}
