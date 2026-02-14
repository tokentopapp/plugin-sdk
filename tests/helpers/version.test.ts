import { describe, expect, test } from 'bun:test';
import {
  SDK_VERSION,
  CURRENT_API_VERSION,
  isCompatible,
  assertCompatible,
} from '../../src/helpers/version.ts';

describe('SDK_VERSION', () => {
  test('is a valid semver string', () => {
    expect(SDK_VERSION).toMatch(/^\d+\.\d+\.\d+/);
  });
});

describe('CURRENT_API_VERSION', () => {
  test('is a positive integer', () => {
    expect(CURRENT_API_VERSION).toBeGreaterThan(0);
    expect(Number.isInteger(CURRENT_API_VERSION)).toBe(true);
  });
});

describe('isCompatible', () => {
  test('returns true for matching version', () => {
    expect(isCompatible(CURRENT_API_VERSION)).toBe(true);
  });

  test('returns false for older version', () => {
    expect(isCompatible(CURRENT_API_VERSION - 1)).toBe(false);
  });

  test('returns false for newer version', () => {
    expect(isCompatible(CURRENT_API_VERSION + 1)).toBe(false);
  });
});

describe('assertCompatible', () => {
  test('does not throw for matching version', () => {
    expect(() => assertCompatible('my-plugin', CURRENT_API_VERSION)).not.toThrow();
  });

  test('throws for older plugin version with upgrade-plugin message', () => {
    expect(() => assertCompatible('old-plugin', CURRENT_API_VERSION - 1))
      .toThrow('Update the plugin to the latest SDK');
  });

  test('throws for newer plugin version with upgrade-app message', () => {
    expect(() => assertCompatible('future-plugin', CURRENT_API_VERSION + 1))
      .toThrow('Update tokentop to use this plugin');
  });

  test('includes plugin id in error message', () => {
    expect(() => assertCompatible('my-cool-plugin', 999))
      .toThrow('my-cool-plugin');
  });

  test('includes version numbers in error message', () => {
    expect(() => assertCompatible('test', 999))
      .toThrow(`requires API version 999`);
  });
});
