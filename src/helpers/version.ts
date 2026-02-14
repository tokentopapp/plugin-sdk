import { CURRENT_API_VERSION } from '../types/plugin.ts';

export const SDK_VERSION = '0.1.0';

export { CURRENT_API_VERSION };

export function isCompatible(pluginApiVersion: number): boolean {
  return pluginApiVersion === CURRENT_API_VERSION;
}

export function assertCompatible(pluginId: string, pluginApiVersion: number): void {
  if (!isCompatible(pluginApiVersion)) {
    throw new Error(
      `Plugin "${pluginId}" requires API version ${pluginApiVersion}, ` +
      `but this SDK supports version ${CURRENT_API_VERSION}. ` +
      (pluginApiVersion > CURRENT_API_VERSION
        ? 'Update tokentop to use this plugin.'
        : 'Update the plugin to the latest SDK.'),
    );
  }
}
