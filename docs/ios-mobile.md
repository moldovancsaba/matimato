# Matimato iOS Mobile Runbook

## Scope

Matimato ships the existing Next.js, Phaser, and GDS web runtime as an installable iOS PWA and as a Capacitor iOS wrapper using WKWebView. This is intentionally not a SwiftUI rewrite. All visible UI remains the GDS web app; Capacitor only owns app identity, WKWebView hosting, icon/splash assets, and native build packaging.

Canonical external references:

- Capacitor iOS uses Xcode and WKWebView: https://capacitorjs.com/docs/ios
- Capacitor config surface: https://capacitorjs.com/docs/config
- Capacitor App Store deployment path: https://capacitorjs.com/docs/ios/deploying-to-app-store
- Apple App Review Guidelines: https://developer.apple.com/app-store/review/guidelines/
- Apple app privacy details: https://developer.apple.com/app-store/app-privacy-details/

## Architecture Decision

```text
iOS Safari / installed PWA / Capacitor WKWebView
  -> Matimato Next.js app shell
  -> GDS React screens and accessibility primitives
  -> Phaser active match renderer
  -> existing Vercel APIs and MongoDB
```

The native shell points to `CAPACITOR_SERVER_URL`, defaulting to `https://matimato.vercel.app`. This keeps server-rendered routes, API routes, MongoDB persistence, and Vercel rollback behavior authoritative. The `webDir` remains `public` so Capacitor has a deterministic asset bundle for icons/config while the runtime URL serves the app.

## Runtime Contracts

```ts
type IOSBuildConfig = {
  appId: 'app.vercel.matimato';
  appName: 'Matimato';
  version: string;
  buildNumber: string;
  serverUrl: string;
};

type NetworkState = 'online' | 'offline' | 'reconnecting' | 'degraded';
```

No native plugin permissions are required in the current release. The generated Capacitor project uses the default App target and Swift Package Manager package file under `ios/App/CapApp-SPM`.

## PWA Install Shell

- `app/manifest.ts` declares standalone display, portrait orientation, app scope, game category, SVG fallback icon, 192px/512px PNG icons, and maskable PNG.
- `app/layout.tsx` sets Apple web app capability, black translucent status bar, apple touch icon, `viewport-fit=cover`, and zoom disabled.
- `scripts/generate-ios-assets.mjs` regenerates the PNG icon set from deterministic source pixels.

## Offline Recovery

The service worker at `public/sw.js` caches only the app shell and static icon/manifest assets. It does not cache mutation responses or claim stale game/progression data as authoritative.

Runtime behavior:

- Safe GET reads use `RETRY_POLICY = { maxAttempts: 3, baseDelayMs: 500, timeoutMs: 5000 }`.
- Unsafe writes such as start match, join battle, ready lobby, purchase board, and select board are blocked when `NetworkState !== 'online'`.
- The shell shows a GDS Button-based recovery state with `role="status"` and an explicit Retry control.
- Retry probes `/api/health` with a 5 second timeout and moves through `reconnecting`, `online`, `degraded`, or `offline`.

Rollback:

- Set `NEXT_PUBLIC_MATIMATO_SERVICE_WORKER=false` to stop registering new service workers.
- Redeploy the previous Vercel build if a bad service worker was already shipped.
- Users with an old worker receive the next cache version on activation; cache names are versioned.

## Observability

Telemetry events added for iOS app modes:

- `ios_runtime_detected`
- `ios_offline_state_changed`
- `ios_offline_retry`
- `ios_offline_recovered`
- `ios_wrapper_error`

Safe properties include `runtimeMode`, `appVersion`, `buildNumber`, `networkState`, and `serviceWorker`. Runtime detection emits once per browser session and never blocks app startup.

## Mobile QA Matrix

Run against a production build or deployed URL:

```bash
npm run build
npm run start
MATIMATO_SMOKE_URL=http://127.0.0.1:3000 npm run mobile:smoke
MATIMATO_SMOKE_URL=https://matimato.vercel.app npm run mobile:smoke
```

The smoke suite covers 320x568, 390x844, and 430x932 viewports; Home, Journey, Ranks, History, and Profile; document scroll; nav overlap; text/control overflow; and long-list scroll reachability.

Manual iOS checklist:

- Safari first load, installed PWA launch, and Capacitor simulator/device launch.
- VoiceOver can reach header, nav icons, retry button, form inputs, board chips, and match controls.
- Dynamic Island/notch safe areas do not cover header or controls.
- Safari browser toolbar does not cover the app nav.
- History/Ranks/Profile internal scroll regions can reach the last item.
- Offline launch after one online load shows the recovery state instead of a blank screen.

## Native Build

Setup:

```bash
npm install
npm run assets:ios
npm run ios:sync
open ios/App/App.xcodeproj
```

Unsigned simulator check:

```bash
npm run ios:build
```

Current local blocker:

```text
xcode-select: error: tool 'xcodebuild' requires Xcode, but active developer directory '/Library/Developer/CommandLineTools' is a command line tools instance
```

Recovery on a Mac with full Xcode installed:

```bash
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
xcodebuild -version
npm run ios:build
```

Signing and TestFlight remain external until an Apple Developer team, bundle identifier ownership, signing certificate/profile, and App Store Connect app record are available. Do not commit certificates, provisioning profiles, API keys, or team-private Apple metadata.

## App Store Connect Package

Draft metadata:

- Name: Matimato
- Bundle ID: `app.vercel.matimato`
- Category: Games
- Subtitle: Tactical number chase
- Description: A tactical row-and-column number chase where players claim tiles, manage positive and negative scores, and unlock larger boards with XP.
- Support URL: `https://matimato.vercel.app`
- Privacy URL: `https://matimato.vercel.app`
- Review notes: Matimato is an online tactical board game. Use solo mode or the guided tutorial from Profile. No account, payment, IAP, push notification, Game Center, camera, contacts, location, or tracking permission is required.

Privacy label draft:

- Data collected: gameplay/profile data generated by the player tag, local player id, match history, progression, leaderboard entries, and privacy-safe telemetry event hashes.
- Linked to user: not linked to an Apple identity by this app.
- Tracking: no third-party tracking SDK and no cross-app tracking.
- Diagnostics: Vercel/platform logs and bounded telemetry for app health, offline recovery, and gameplay errors.

Screenshot checklist:

- First-run Learn/Play choice.
- Home with active board.
- Guided tutorial coach modal.
- Live match.
- Journey board unlock ladder.
- Match recap.
- Ranks and History long-list states.
- Profile with sign out.

## Release Gate

Before closing an iOS release:

```bash
npm run lint
npm run verify
npm audit --omit=dev
npm run mobile:smoke
npx cap sync ios
npm run ios:build
```

Production verification:

- Vercel deployment is Ready.
- `https://matimato.vercel.app/api/health` returns `ok: true`.
- deployment-window Vercel error logs are empty.
- service worker version matches this release.
- issue comments include any Apple/Xcode/TestFlight blockers.

Rollback decision tree:

- Web/PWA regression: rollback Vercel to the previous known-good deployment.
- Service worker regression: disable registration, bump cache version, redeploy, and ask users to relaunch after activation.
- Native wrapper regression before TestFlight: stop distribution and rebuild with previous `capacitor.config.ts`.
- Native wrapper regression after TestFlight: expire the TestFlight build in App Store Connect and keep the web/PWA alias live.
