import type { BasePlugin, PluginLogger, ConfigField } from './plugin.ts';

// ---------------------------------------------------------------------------
// Notification Events
// ---------------------------------------------------------------------------

export type NotificationSeverity = 'info' | 'warning' | 'critical';

export type NotificationEventType =
  | 'budget.thresholdCrossed'
  | 'budget.limitReached'
  | 'provider.fetchFailed'
  | 'provider.limitReached'
  | 'provider.recovered'
  | 'plugin.crashed'
  | 'plugin.disabled'
  | 'app.started'
  | 'app.updated';

export interface NotificationEvent {
  type: NotificationEventType;
  severity: NotificationSeverity;
  title: string;
  message: string;
  timestamp: number;
  data?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Notification Context
// ---------------------------------------------------------------------------

export interface NotificationContext {
  readonly logger: PluginLogger;
  readonly config: Record<string, unknown>;
  readonly signal: AbortSignal;
}

// ---------------------------------------------------------------------------
// Notification Plugin
// ---------------------------------------------------------------------------

export interface NotificationPlugin extends BasePlugin {
  readonly type: 'notification';

  readonly configSchema?: Record<string, ConfigField>;

  /** Set up the notification channel (e.g. verify webhook URL, open connection). */
  initialize(ctx: NotificationContext): Promise<void>;

  /** Deliver a notification event. */
  notify(ctx: NotificationContext, event: NotificationEvent): Promise<void>;

  /** Optional: test the notification channel (e.g. send a test message). */
  test?(ctx: NotificationContext): Promise<boolean>;

  /**
   * Optional: filter which events this plugin handles.
   * If not implemented, the plugin receives all events.
   */
  supports?(event: NotificationEvent): boolean;

  /** Clean up resources (e.g. close connections). */
  destroy?(): Promise<void>;
}
