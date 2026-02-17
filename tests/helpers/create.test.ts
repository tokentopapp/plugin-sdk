import { describe, expect, test } from 'bun:test';
import {
  createProviderPlugin,
  createAgentPlugin,
  createThemePlugin,
  createNotificationPlugin,
} from '../../src/helpers/create.ts';
import { CURRENT_API_VERSION } from '../../src/types/plugin.ts';

const baseFields = {
  name: 'Test Plugin',
  version: '1.0.0',
  meta: { description: 'A test plugin' },
  permissions: {},
};

const validProvider = {
  ...baseFields,
  id: 'test-provider',
  type: 'provider' as const,
  capabilities: { usageLimits: false, apiRateLimits: false, tokenUsage: false, actualCosts: true },
  auth: {
    async discover() { return { ok: false as const, reason: 'missing' as const }; },
    isConfigured: () => false,
  },
  async fetchUsage() {
    return { fetchedAt: Date.now() };
  },
};

const validAgent = {
  ...baseFields,
  id: 'test-agent',
  type: 'agent' as const,
  agent: { name: 'Test Agent' },
  capabilities: { sessionParsing: true, authReading: false, realTimeTracking: false, multiProvider: false },
  async isInstalled() { return true; },
  async parseSessions() { return []; },
};

const validTheme = {
  ...baseFields,
  id: 'test-theme',
  type: 'theme' as const,
  theme: {
    family: 'test-theme',
    colorScheme: 'dark' as const,
    colors: {
      bg: '#000', fg: '#fff', border: '#333', borderFocused: '#666',
      primary: '#3b82f6', secondary: '#6366f1', accent: '#8b5cf6', muted: '#6b7280',
      success: '#22c55e', warning: '#eab308', error: '#ef4444', info: '#3b82f6',
      headerBg: '#111', headerFg: '#fff', statusBarBg: '#111', statusBarFg: '#fff',
      tableBg: '#000', tableHeaderBg: '#111', tableHeaderFg: '#fff',
      tableRowBg: '#000', tableRowAltBg: '#0a0a0a', tableRowFg: '#fff',
      tableSelectedBg: '#1e3a5f', tableSelectedFg: '#fff',
    },
  },
};

const validNotification = {
  ...baseFields,
  id: 'test-notifier',
  type: 'notification' as const,
  async initialize() {},
  async notify() {},
};

describe('createProviderPlugin', () => {
  test('stamps apiVersion', () => {
    const plugin = createProviderPlugin(validProvider);
    expect(plugin.apiVersion).toBe(CURRENT_API_VERSION);
  });

  test('preserves all fields', () => {
    const plugin = createProviderPlugin(validProvider);
    expect(plugin.id).toBe('test-provider');
    expect(plugin.type).toBe('provider');
    expect(plugin.name).toBe('Test Plugin');
  });

  test('rejects wrong type', () => {
    expect(() => createProviderPlugin({ ...validProvider, type: 'agent' as any }))
      .toThrow('createProviderPlugin requires type: "provider"');
  });
});

describe('createAgentPlugin', () => {
  test('stamps apiVersion', () => {
    const plugin = createAgentPlugin(validAgent);
    expect(plugin.apiVersion).toBe(CURRENT_API_VERSION);
  });

  test('rejects wrong type', () => {
    expect(() => createAgentPlugin({ ...validAgent, type: 'provider' as any }))
      .toThrow('createAgentPlugin requires type: "agent"');
  });
});

describe('createThemePlugin', () => {
  test('stamps apiVersion', () => {
    const plugin = createThemePlugin(validTheme);
    expect(plugin.apiVersion).toBe(CURRENT_API_VERSION);
  });

  test('rejects wrong type', () => {
    expect(() => createThemePlugin({ ...validTheme, type: 'agent' as any }))
      .toThrow('createThemePlugin requires type: "theme"');
  });
});

describe('createNotificationPlugin', () => {
  test('stamps apiVersion', () => {
    const plugin = createNotificationPlugin(validNotification);
    expect(plugin.apiVersion).toBe(CURRENT_API_VERSION);
  });

  test('rejects wrong type', () => {
    expect(() => createNotificationPlugin({ ...validNotification, type: 'theme' as any }))
      .toThrow('createNotificationPlugin requires type: "notification"');
  });
});

describe('validateBase (shared validation)', () => {
  test('rejects missing id', () => {
    expect(() => createProviderPlugin({ ...validProvider, id: '' }))
      .toThrow('Plugin must have a non-empty string "id"');
  });

  test('rejects non-kebab-case id', () => {
    expect(() => createProviderPlugin({ ...validProvider, id: 'MyPlugin' }))
      .toThrow('must be kebab-case');
  });

  test('rejects id starting with number', () => {
    expect(() => createProviderPlugin({ ...validProvider, id: '1bad' }))
      .toThrow('must be kebab-case');
  });

  test('rejects id with underscores', () => {
    expect(() => createProviderPlugin({ ...validProvider, id: 'my_plugin' }))
      .toThrow('must be kebab-case');
  });

  test('accepts valid kebab-case ids', () => {
    for (const id of ['a', 'my-plugin', 'provider-openai', 'a1-b2-c3']) {
      expect(() => createProviderPlugin({ ...validProvider, id })).not.toThrow();
    }
  });

  test('rejects missing name', () => {
    expect(() => createProviderPlugin({ ...validProvider, name: '' }))
      .toThrow('Plugin must have a non-empty string "name"');
  });

  test('rejects missing version', () => {
    expect(() => createProviderPlugin({ ...validProvider, version: '' }))
      .toThrow('valid semver version');
  });

  test('rejects invalid semver version', () => {
    expect(() => createProviderPlugin({ ...validProvider, version: 'v1' }))
      .toThrow('valid semver version');
  });

  test('accepts valid semver versions', () => {
    for (const version of ['0.0.1', '1.0.0', '2.3.4-beta.1']) {
      expect(() => createProviderPlugin({ ...validProvider, version })).not.toThrow();
    }
  });
});
