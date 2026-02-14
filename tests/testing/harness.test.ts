import { describe, expect, test } from 'bun:test';
import {
  createMockLogger,
  createMockHttpClient,
  createMockStorage,
  createTestContext,
  createTestProviderFetchContext,
  createTestAgentFetchContext,
} from '../../src/testing/harness.ts';
import { apiKeyCredential } from '../../src/helpers/auth.ts';

describe('createMockLogger', () => {
  test('captures all log levels', () => {
    const logger = createMockLogger();
    logger.debug('d');
    logger.info('i');
    logger.warn('w');
    logger.error('e');

    expect(logger.entries).toHaveLength(4);
    expect(logger.entries.map((e) => e.level)).toEqual(['debug', 'info', 'warn', 'error']);
    expect(logger.entries.map((e) => e.message)).toEqual(['d', 'i', 'w', 'e']);
  });

  test('captures data argument', () => {
    const logger = createMockLogger();
    logger.info('msg', { key: 'value' });
    expect(logger.entries[0].data).toEqual({ key: 'value' });
  });

  test('clear resets entries', () => {
    const logger = createMockLogger();
    logger.info('one');
    logger.info('two');
    expect(logger.entries).toHaveLength(2);

    logger.clear();
    expect(logger.entries).toHaveLength(0);
  });
});

describe('createMockHttpClient', () => {
  test('returns mocked response for matched URL', async () => {
    const http = createMockHttpClient({
      mocks: {
        'https://api.example.com/usage': { status: 200, body: { total: 4.5 } },
      },
    });

    const resp = await http.fetch('https://api.example.com/usage');
    expect(resp.status).toBe(200);
    expect(await resp.json()).toEqual({ total: 4.5 });
  });

  test('returns 404 for unmatched URL by default', async () => {
    const http = createMockHttpClient();
    const resp = await http.fetch('https://unknown.com');
    expect(resp.status).toBe(404);
  });

  test('respects custom defaultStatus', async () => {
    const http = createMockHttpClient({ defaultStatus: 500 });
    const resp = await http.fetch('https://unknown.com');
    expect(resp.status).toBe(500);
  });

  test('records all fetch calls', async () => {
    const http = createMockHttpClient();
    await http.fetch('https://a.com', { method: 'POST' });
    await http.fetch('https://b.com');

    expect(http.calls).toHaveLength(2);
    expect(http.calls[0].url).toBe('https://a.com');
    expect(http.calls[0].init?.method).toBe('POST');
    expect(http.calls[1].url).toBe('https://b.com');
  });

  test('includes custom response headers', async () => {
    const http = createMockHttpClient({
      mocks: {
        'https://api.com/data': {
          status: 200,
          body: {},
          headers: { 'X-Custom': 'test' },
        },
      },
    });

    const resp = await http.fetch('https://api.com/data');
    expect(resp.headers.get('X-Custom')).toBe('test');
    expect(resp.headers.get('Content-Type')).toBe('application/json');
  });

  test('handles mock with no body', async () => {
    const http = createMockHttpClient({
      mocks: { 'https://api.com/empty': { status: 204 } },
    });

    const resp = await http.fetch('https://api.com/empty');
    expect(resp.status).toBe(204);
  });
});

describe('createMockStorage', () => {
  test('starts empty by default', async () => {
    const storage = createMockStorage();
    expect(await storage.get('key')).toBeNull();
    expect(await storage.has('key')).toBe(false);
  });

  test('accepts initial values', async () => {
    const storage = createMockStorage({ foo: 'bar' });
    expect(await storage.get('foo')).toBe('bar');
    expect(await storage.has('foo')).toBe(true);
  });

  test('set and get', async () => {
    const storage = createMockStorage();
    await storage.set('key', 'value');
    expect(await storage.get('key')).toBe('value');
  });

  test('delete removes key', async () => {
    const storage = createMockStorage({ key: 'value' });
    await storage.delete('key');
    expect(await storage.get('key')).toBeNull();
    expect(await storage.has('key')).toBe(false);
  });
});

describe('createTestContext', () => {
  test('creates context with defaults', () => {
    const ctx = createTestContext();
    expect(ctx.config).toEqual({});
    expect(ctx.logger).toBeDefined();
    expect(ctx.http).toBeDefined();
    expect(ctx.storage).toBeDefined();
    expect(ctx.signal).toBeInstanceOf(AbortSignal);
    expect(ctx.authSources).toBeDefined();
  });

  test('env.get returns configured values', () => {
    const ctx = createTestContext({ env: { MY_KEY: 'secret' } });
    expect(ctx.authSources.env.get('MY_KEY')).toBe('secret');
    expect(ctx.authSources.env.get('MISSING')).toBeUndefined();
  });

  test('files.readText returns file content', async () => {
    const ctx = createTestContext({ files: { '/path/auth.json': '{"key":"val"}' } });
    expect(await ctx.authSources.files.readText('/path/auth.json')).toBe('{"key":"val"}');
    expect(await ctx.authSources.files.readText('/missing')).toBeNull();
  });

  test('files.readJson parses valid JSON', async () => {
    const ctx = createTestContext({ files: { '/data.json': '{"a":1}' } });
    const parsed = await ctx.authSources.files.readJson<{ a: number }>('/data.json');
    expect(parsed).toEqual({ a: 1 });
  });

  test('files.readJson returns null for invalid JSON', async () => {
    const ctx = createTestContext({ files: { '/bad.json': 'not json' } });
    expect(await ctx.authSources.files.readJson('/bad.json')).toBeNull();
  });

  test('files.readJson returns null for missing file', async () => {
    const ctx = createTestContext();
    expect(await ctx.authSources.files.readJson('/missing.json')).toBeNull();
  });

  test('files.exists checks file presence', async () => {
    const ctx = createTestContext({ files: { '/exists': 'data' } });
    expect(await ctx.authSources.files.exists('/exists')).toBe(true);
    expect(await ctx.authSources.files.exists('/nope')).toBe(false);
  });

  test('opencode.getProviderEntry returns null', async () => {
    const ctx = createTestContext();
    expect(await ctx.authSources.opencode.getProviderEntry('any')).toBeNull();
  });

  test('platform provides os info', () => {
    const ctx = createTestContext();
    expect(['darwin', 'linux', 'win32']).toContain(ctx.authSources.platform.os);
    expect(ctx.authSources.platform.homedir).toBeTruthy();
    expect(ctx.authSources.platform.arch).toBeTruthy();
  });

  test('passes custom config', () => {
    const ctx = createTestContext({ config: { interval: 30 } });
    expect(ctx.config).toEqual({ interval: 30 });
  });

  test('http mocks are wired through', async () => {
    const ctx = createTestContext({
      httpMocks: { 'https://api.com/data': { status: 200, body: { ok: true } } },
    });
    const resp = await ctx.http.fetch('https://api.com/data');
    expect(resp.status).toBe(200);
    expect(await resp.json()).toEqual({ ok: true });
  });

  test('storage initial values are wired through', async () => {
    const ctx = createTestContext({ storage: { cached: 'data' } });
    expect(await ctx.storage.get('cached')).toBe('data');
  });
});

describe('createTestProviderFetchContext', () => {
  test('includes credentials', () => {
    const creds = apiKeyCredential('sk-test');
    const ctx = createTestProviderFetchContext(creds);
    expect(ctx.credentials).toEqual(creds);
  });

  test('includes http, logger, config, signal', () => {
    const ctx = createTestProviderFetchContext(apiKeyCredential('sk-test'));
    expect(ctx.http).toBeDefined();
    expect(ctx.logger).toBeDefined();
    expect(ctx.config).toBeDefined();
    expect(ctx.signal).toBeInstanceOf(AbortSignal);
  });

  test('passes http mocks through', async () => {
    const ctx = createTestProviderFetchContext(apiKeyCredential('sk-test'), {
      httpMocks: { 'https://api.com/usage': { status: 200, body: { cost: 1.5 } } },
    });
    const resp = await ctx.http.fetch('https://api.com/usage');
    expect(await resp.json()).toEqual({ cost: 1.5 });
  });
});

describe('createTestAgentFetchContext', () => {
  test('includes http, logger, config, signal', () => {
    const ctx = createTestAgentFetchContext();
    expect(ctx.http).toBeDefined();
    expect(ctx.logger).toBeDefined();
    expect(ctx.config).toBeDefined();
    expect(ctx.signal).toBeInstanceOf(AbortSignal);
  });

  test('does not include credentials', () => {
    const ctx = createTestAgentFetchContext();
    expect((ctx as any).credentials).toBeUndefined();
  });
});
