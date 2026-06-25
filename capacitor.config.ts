import type { CapacitorConfig } from '@capacitor/cli';
import pkg from './package.json' with { type: 'json' };

const serverUrl = process.env.CAPACITOR_SERVER_URL ?? 'https://matimato.vercel.app';

const config: CapacitorConfig = {
  appId: 'app.vercel.matimato',
  appName: 'Matimato',
  webDir: 'public',
  server: {
    url: serverUrl,
    cleartext: false
  },
  ios: {
    backgroundColor: '#120811',
    contentInset: 'automatic',
    zoomEnabled: false
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      backgroundColor: '#120811',
      showSpinner: false
    }
  }
};

if (process.env.CAPACITOR_BUILD_NUMBER) {
  process.env.MATIMATO_IOS_BUILD_NUMBER = process.env.CAPACITOR_BUILD_NUMBER;
}

export const iosRelease = {
  version: pkg.version,
  buildNumber: process.env.MATIMATO_IOS_BUILD_NUMBER ?? 'local',
  serverUrl
};

export default config;
