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
    colorScheme: 'light' | 'dark';
    colors: ThemeColors;
    components?: ThemeComponents;
    /**
     * If `true`, core uses this theme when no user preference is set.
     * If multiple themes set this, `priority` breaks the tie (higher wins).
     */
    isDefault?: boolean;
    /** Tie-breaker for default theme selection. Higher wins. Default: `0`. */
    priority?: number;
  };
}
