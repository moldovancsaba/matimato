import type { TelemetryPropertyValue } from '@/lib/shared/types';

export type IOSRuntimeMode = 'safari' | 'standalone-pwa' | 'capacitor-ios' | 'browser';
export type NetworkState = 'online' | 'offline' | 'reconnecting' | 'degraded';

declare global {
  interface Navigator {
    standalone?: boolean;
  }

  interface Window {
    Capacitor?: {
      isNativePlatform?: () => boolean;
      getPlatform?: () => string;
    };
  }
}

export function detectIOSRuntimeMode(): IOSRuntimeMode {
  if (typeof window === 'undefined') return 'browser';
  if (window.Capacitor?.isNativePlatform?.() && window.Capacitor?.getPlatform?.() === 'ios') return 'capacitor-ios';
  if (window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone === true) return 'standalone-pwa';
  if (/iPad|iPhone|iPod/.test(navigator.userAgent)) return 'safari';
  return 'browser';
}

export function getRuntimeTelemetryProperties(): Record<string, TelemetryPropertyValue> {
  return {
    runtimeMode: detectIOSRuntimeMode(),
    appVersion: process.env.NEXT_PUBLIC_MATIMATO_APP_VERSION ?? '2.5.0',
    buildNumber: process.env.NEXT_PUBLIC_MATIMATO_IOS_BUILD_NUMBER ?? 'web',
    serviceWorker: typeof navigator !== 'undefined' && 'serviceWorker' in navigator ? 'supported' : 'unsupported'
  };
}

export async function registerServiceWorker(): Promise<'registered' | 'unsupported' | 'disabled' | 'error'> {
  if (process.env.NEXT_PUBLIC_MATIMATO_SERVICE_WORKER === 'false') return 'disabled';
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return 'unsupported';
  try {
    await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    return 'registered';
  } catch {
    return 'error';
  }
}
