import { describe, expect, it, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import { detectIOSRuntimeMode } from '@/lib/client/iosRuntime';
import { RETRY_POLICY, offlineTelemetryName } from '@/lib/client/api';

describe('iOS runtime helpers', () => {
  it('detects standalone PWA sessions before Safari', () => {
    const dom = new JSDOM('', { url: 'https://matimato.vercel.app' });
    vi.stubGlobal('window', dom.window);
    Object.defineProperty(dom.window.navigator, 'standalone', { configurable: true, value: true });
    vi.stubGlobal('navigator', dom.window.navigator);
    expect(detectIOSRuntimeMode()).toBe('standalone-pwa');
    vi.unstubAllGlobals();
  });

  it('keeps retry policy bounded for safe reads', () => {
    expect(RETRY_POLICY).toEqual({ maxAttempts: 3, baseDelayMs: 500, timeoutMs: 5000 });
  });

  it('maps offline telemetry states to allowlisted event names', () => {
    expect(offlineTelemetryName('offline')).toBe('ios_offline_state_changed');
    expect(offlineTelemetryName('recovered')).toBe('ios_offline_recovered');
    expect(offlineTelemetryName('retry')).toBe('ios_offline_retry');
    expect(offlineTelemetryName('error')).toBe('ios_wrapper_error');
  });
});
