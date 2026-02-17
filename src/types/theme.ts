import type { BasePlugin } from './plugin.ts';

// ---------------------------------------------------------------------------
// Theme Colors
// ---------------------------------------------------------------------------

export interface ThemeColors {
  bg: string;
  fg: string;
  border: string;
  borderFocused: string;

  primary: string;
  secondary: string;
  accent: string;
  muted: string;

  success: string;
  warning: string;
  error: string;
  info: string;

  headerBg: string;
  headerFg: string;
  headerTitleColor?: string;
  headerTitleAccentColor?: string;
  statusBarBg: string;
  statusBarFg: string;

  tableBg: string;
  tableHeaderBg: string;
  tableHeaderFg: string;
  tableRowBg: string;
  tableRowAltBg: string;
  tableRowFg: string;
  tableSelectedBg: string;
  tableSelectedFg: string;
}

// ---------------------------------------------------------------------------
// Theme Component Overrides
// ---------------------------------------------------------------------------

export interface GaugeColors {
  low: string;
  medium: string;
  high: string;
  critical: string;
  bg: string;
}

export interface ThemeComponents {
  gauge?: GaugeColors;
}

// ---------------------------------------------------------------------------
// Theme Plugin
// ---------------------------------------------------------------------------

export interface ThemePlugin extends BasePlugin {
  readonly type: 'theme';

  readonly theme: {
    family?: string;
    colorScheme: 'light' | 'dark';
    colors: ThemeColors;
    components?: ThemeComponents;
    isDefault?: boolean;
    priority?: number;
  };
}
