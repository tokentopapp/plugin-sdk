export type {
  PluginId,
  PluginType,
  PluginPermissions,
  PluginMeta,
  ConfigField,
  BasePlugin,
  PluginLifecycleContext,
  PluginLogger,
} from './plugin.ts';

export { CURRENT_API_VERSION, PluginPermissionError } from './plugin.ts';

export type {
  PluginHttpClient,
  AuthSources,
  OpenCodeAuthEntry,
  PluginStorage,
  PluginContext,
} from './context.ts';

export type {
  CredentialSource,
  Credentials,
  OAuthCredentials,
  RefreshedCredentials,
  CredentialResult,
  ProviderAuth,
  ProviderCapabilities,
  ModelPricing,
  ProviderPricing,
  UsageLimit,
  CostBreakdown,
  ProviderUsageData,
  ProviderFetchContext,
  ProviderPlugin,
} from './provider.ts';

export type {
  AgentConfig,
  AgentCapabilities,
  AgentCredentials,
  AgentProviderConfig,
  SessionParseOptions,
  SessionUsageData,
  ActivityUpdate,
  ActivityCallback,
  AgentFetchContext,
  AgentPlugin,
} from './agent.ts';

export type {
  ThemeColors,
  GaugeColors,
  ThemeComponents,
  ThemePlugin,
} from './theme.ts';

export type {
  NotificationSeverity,
  NotificationEventType,
  NotificationEvent,
  NotificationContext,
  NotificationPlugin,
} from './notification.ts';

export type AnyPlugin = ProviderPlugin | AgentPlugin | ThemePlugin | NotificationPlugin;

import type { ProviderPlugin } from './provider.ts';
import type { AgentPlugin } from './agent.ts';
import type { ThemePlugin } from './theme.ts';
import type { NotificationPlugin } from './notification.ts';
import type { PluginType } from './plugin.ts';

export type PluginByType = {
  provider: ProviderPlugin;
  agent: AgentPlugin;
  theme: ThemePlugin;
  notification: NotificationPlugin;
};

export type PluginOfType<T extends PluginType> = PluginByType[T];
