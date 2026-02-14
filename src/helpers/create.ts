import { CURRENT_API_VERSION } from '../types/plugin.ts';
import type { ProviderPlugin } from '../types/provider.ts';
import type { AgentPlugin } from '../types/agent.ts';
import type { ThemePlugin } from '../types/theme.ts';
import type { NotificationPlugin } from '../types/notification.ts';

type WithoutApiVersion<T> = Omit<T, 'apiVersion'>;

function validateBase(plugin: { id?: string; type?: string; name?: string; version?: string }): void {
  if (!plugin.id || typeof plugin.id !== 'string') {
    throw new Error('Plugin must have a non-empty string "id"');
  }
  if (!/^[a-z][a-z0-9-]*$/.test(plugin.id)) {
    throw new Error(`Plugin id "${plugin.id}" must be kebab-case (lowercase letters, numbers, hyphens)`);
  }
  if (!plugin.name || typeof plugin.name !== 'string') {
    throw new Error('Plugin must have a non-empty string "name"');
  }
  if (!plugin.version || !/^\d+\.\d+\.\d+/.test(plugin.version)) {
    throw new Error('Plugin must have a valid semver version (e.g. "1.0.0")');
  }
}

export function createProviderPlugin(def: WithoutApiVersion<ProviderPlugin>): ProviderPlugin {
  validateBase(def);
  if (def.type !== 'provider') {
    throw new Error('createProviderPlugin requires type: "provider"');
  }
  return { ...def, apiVersion: CURRENT_API_VERSION } as ProviderPlugin;
}

export function createAgentPlugin(def: WithoutApiVersion<AgentPlugin>): AgentPlugin {
  validateBase(def);
  if (def.type !== 'agent') {
    throw new Error('createAgentPlugin requires type: "agent"');
  }
  return { ...def, apiVersion: CURRENT_API_VERSION } as AgentPlugin;
}

export function createThemePlugin(def: WithoutApiVersion<ThemePlugin>): ThemePlugin {
  validateBase(def);
  if (def.type !== 'theme') {
    throw new Error('createThemePlugin requires type: "theme"');
  }
  return { ...def, apiVersion: CURRENT_API_VERSION } as ThemePlugin;
}

export function createNotificationPlugin(def: WithoutApiVersion<NotificationPlugin>): NotificationPlugin {
  validateBase(def);
  if (def.type !== 'notification') {
    throw new Error('createNotificationPlugin requires type: "notification"');
  }
  return { ...def, apiVersion: CURRENT_API_VERSION } as NotificationPlugin;
}
