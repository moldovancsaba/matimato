import type { TelemetryEventName } from './types';

export const TELEMETRY_EVENT_NAMES = [
  'onboarding_started',
  'onboarding_step_completed',
  'onboarding_skipped',
  'onboarding_completed',
  'onboarding_failed',
  'lobby_created',
  'lobby_copied',
  'lobby_shared',
  'lobby_joined',
  'lobby_ready',
  'lobby_expired',
  'lobby_cancelled',
  'lobby_poll_failed',
  'lobby_entered_match',
  'daily_viewed',
  'daily_started',
  'daily_resumed',
  'daily_completed',
  'streak_updated',
  'weekly_rank_viewed',
  'daily_error',
  'match_completed',
  'rank_viewed',
  'move_conflict',
  'sync_failed',
  'phaser_booted',
  'phaser_destroyed',
  'phaser_runtime_error',
  'api_error',
  'pwa_recovery'
] as const satisfies readonly TelemetryEventName[];

export const TELEMETRY_PROPERTY_KEYS = [
  'mode',
  'screen',
  'step',
  'status',
  'phase',
  'date',
  'dailyId',
  'scoreBucket',
  'rankBucket',
  'attempts',
  'streakCurrent',
  'streakBest',
  'durationBucket',
  'retryable',
  'errorCode',
  'result',
  'version',
  'source'
] as const;

export function isTelemetryEventName(value: string): value is TelemetryEventName {
  return TELEMETRY_EVENT_NAMES.includes(value as TelemetryEventName);
}

export function isAllowedTelemetryProperty(value: string): boolean {
  return TELEMETRY_PROPERTY_KEYS.includes(value as (typeof TELEMETRY_PROPERTY_KEYS)[number]);
}
