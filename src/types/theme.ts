import type { BasePlugin } from './plugin.ts';

// ---------------------------------------------------------------------------
// Color Scheme
// ---------------------------------------------------------------------------

export type ColorScheme = 'light' | 'dark';

export type ColorSchemePreference = 'auto' | 'light' | 'dark';

// ---------------------------------------------------------------------------
// Theme Colors
// ---------------------------------------------------------------------------

export interface ThemeColors {
  background: string;
  foreground: string;
  text: string;
  textMuted: string;
  textSubtle: string;
  primary: string;
  secondary: string;
  accent: string;
  success: string;
  warning: string;
  error: string;
  info: string;
  border: string;
  borderMuted: string;
  selection: string;
  highlight: string;
  gaugeBackground: string;
  gaugeFill: string;
  gaugeWarning: string;
  gaugeDanger: string;
}

// ---------------------------------------------------------------------------
// Theme Component Overrides
// ---------------------------------------------------------------------------

export interface ThemeComponents {
  header?: {
    background?: string;
    foreground?: string;
    titleColor?: string;
    titleAccentColor?: string;
  };
  statusBar?: {
    background?: string;
    foreground?: string;
  };
  commandPalette?: {
    background?: string;
    border?: string;
  };
  gauge?: {
    height?: number;
    borderRadius?: number;
  };
}

// ---------------------------------------------------------------------------
// Theme Plugin
// ---------------------------------------------------------------------------

export interface ThemePlugin extends BasePlugin {
  readonly type: 'theme';
  readonly family: string;
  readonly colorScheme: ColorScheme;
  readonly colors: ThemeColors;
  readonly components?: ThemeComponents;
}
