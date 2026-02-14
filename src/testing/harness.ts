import type { PluginContext } from '../types/context.ts';
import type { PluginLogger } from '../types/plugin.ts';
import type { ProviderFetchContext } from '../types/provider.ts';
import type { AgentFetchContext } from '../types/agent.ts';
import type { Credentials } from '../types/provider.ts';

// ---------------------------------------------------------------------------
// Mock Logger
// ---------------------------------------------------------------------------

export interface MockLogEntry {
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  data?: Record<string, unknown>;
}

export interface MockLogger extends PluginLogger {
  entries: MockLogEntry[];
  clear(): void;
}

export function createMockLogger(): MockLogger {
  const entries: MockLogEntry[] = [];
  return {
    entries,
    debug(message, data) { entries.push({ level: 'debug', message, data }); },
    info(message, data) { entries.push({ level: 'info', message, data }); },
    warn(message, data) { entries.push({ level: 'warn', message, data }); },
    error(message, data) { entries.push({ level: 'error', message, data }); },
    clear() { entries.length = 0; },
  };
}

// ---------------------------------------------------------------------------
// Mock HTTP Client
// ---------------------------------------------------------------------------

export interface HttpMock {
  status: number;
  body?: unknown;
  headers?: Record<string, string>;
}

export interface MockHttpClientOptions {
  mocks?: Record<string, HttpMock>;
  defaultStatus?: number;
}

export function createMockHttpClient(options: MockHttpClientOptions = {}) {
  const calls: Array<{ url: string; init?: RequestInit }> = [];

  return {
    calls,
    async fetch(url: string, init?: RequestInit): Promise<Response> {
      calls.push({ url, init });
      const mock = options.mocks?.[url];
      if (mock) {
        return new Response(
          mock.body !== undefined ? JSON.stringify(mock.body) : null,
          {
            status: mock.status,
            headers: { 'Content-Type': 'application/json', ...mock.headers },
          },
        );
      }
      return new Response(null, { status: options.defaultStatus ?? 404 });
    },
  };
}

// ---------------------------------------------------------------------------
// Mock Storage
// ---------------------------------------------------------------------------

export function createMockStorage(initial?: Record<string, string>) {
  const store = new Map<string, string>(Object.entries(initial ?? {}));
  return {
    store,
    async get(key: string) { return store.get(key) ?? null; },
    async set(key: string, value: string) { store.set(key, value); },
    async delete(key: string) { store.delete(key); },
    async has(key: string) { return store.has(key); },
  };
}

// ---------------------------------------------------------------------------
// Test Context Factories
// ---------------------------------------------------------------------------

export interface TestContextOptions {
  env?: Record<string, string>;
  files?: Record<string, string>;
  httpMocks?: Record<string, HttpMock>;
  config?: Record<string, unknown>;
  storage?: Record<string, string>;
}

export function createTestContext(options: TestContextOptions = {}): PluginContext {
  const logger = createMockLogger();
  const http = createMockHttpClient({ mocks: options.httpMocks });
  const storage = createMockStorage(options.storage);
  const controller = new AbortController();

  const envMap = options.env ?? {};
  const fileMap = options.files ?? {};

  return {
    config: options.config ?? {},
    logger,
    http,
    storage,
    signal: controller.signal,
    authSources: {
      env: {
        get(name: string) { return envMap[name]; },
      },
      files: {
        async readText(path: string) { return fileMap[path] ?? null; },
        async readJson<T = unknown>(path: string): Promise<T | null> {
          const text = fileMap[path];
          if (!text) return null;
          try { return JSON.parse(text) as T; }
          catch { return null; }
        },
        async exists(path: string) { return path in fileMap; },
      },
      opencode: {
        async getProviderEntry(_key: string) { return null; },
      },
      platform: {
        os: process.platform as 'darwin' | 'linux' | 'win32',
        homedir: process.env.HOME ?? '/home/test',
        arch: process.arch,
      },
    },
  };
}

export function createTestProviderFetchContext(
  credentials: Credentials,
  options: TestContextOptions = {},
): ProviderFetchContext {
  const ctx = createTestContext(options);
  return {
    credentials,
    http: ctx.http,
    logger: ctx.logger,
    config: ctx.config,
    signal: ctx.signal,
  };
}

export function createTestAgentFetchContext(
  options: TestContextOptions = {},
): AgentFetchContext {
  const ctx = createTestContext(options);
  return {
    http: ctx.http,
    logger: ctx.logger,
    config: ctx.config,
    signal: ctx.signal,
  };
}
