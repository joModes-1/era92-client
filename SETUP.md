# Mobile app setup

Expo / React Native client for the car wash loyalty platform. One codebase
serves every role — customer, worker, manager, org admin, platform admin —
and the drawer you get is decided by what the backend says you are.

---

## What you need first

| | Version | Notes |
|---|---|---|
| Node.js | 20 or newer | Developed against 24.x |
| npm | comes with Node | |
| A running backend | | See `../server/SETUP.md` |

For testing on a real phone, either:
- **Expo Go** from the App Store / Play Store — fastest, but no push notifications and no QR scanning
- **A built APK** — the full app, camera and notifications included

---

## 1. Install

```bash
cd mobile
npm install
```

---

## 2. Point it at a backend

The app works out where the API lives on its own:

- **Web** — same hostname the page came from, port 3456
- **Phone in development** — the machine running Metro, port 3456
- **A real build** — whatever `EXPO_PUBLIC_API_URL` was set to when it was built

To override, set `EXPO_PUBLIC_API_URL`:

```bash
# macOS / Linux
EXPO_PUBLIC_API_URL=https://your-api.example.com/api/v1 npx expo start

# Windows (cmd)
set EXPO_PUBLIC_API_URL=https://your-api.example.com/api/v1 && npx expo start
```

The resolved address is printed to the console at startup as
`[api] base URL: ...` — worth checking first whenever requests fail.

---

## 3. Run it

```bash
npm run web       # browser — quickest for UI work
npm start         # dev server, then scan the QR with Expo Go
npm run android   # Android emulator
npm run ios       # iOS simulator (macOS only)
```

**On web**, the camera cannot scan QR codes. Every scanner screen offers a
manual code entry field instead, so the flows are still testable.

---

## Builds and updates

Builds run in the cloud through [EAS](https://docs.expo.dev/build/introduction/) —
no Android Studio or Xcode needed locally.

```bash
npx eas-cli@latest login
npx eas-cli@latest build --platform android --profile preview
```

That produces an installable `.apk`. The `preview` profile is for internal
testing; `production` builds an `.aab` for the Play Store.

### Shipping changes without rebuilding

The app carries `expo-updates`, so JavaScript-only changes reach installed
apps over the air in about a minute:

```bash
npm run publish:preview "what changed"
```

Users get it on next app restart — a prompt appears once the new bundle has
downloaded, and it applies on the following launch either way.

**A full rebuild is only needed for native changes**: adding a native
library, changing permissions, or changing the app icon or splash screen.
Everything else goes over the air.

`runtimeVersion` is tied to the app version, so an update can only reach a
build with matching native code. Bumping `version` in `app.json` deliberately
cuts older builds off rather than sending them a bundle they cannot run.

### Environment variables for builds

`EXPO_PUBLIC_API_URL` is baked in at build time, so it must be available to
EAS — not just in your shell. It lives in two places:

- `eas.json`, under each profile's `env` block
- EAS's own environment store (`npx eas-cli@latest env:list --environment preview`)

Both `eas build` and `eas update` read these. Publishing an update without
the variable set produces a bundle that falls back to `localhost` and cannot
reach anything from a phone.

---

## Commands

| Command | What it does |
|---|---|
| `npm start` | Dev server with QR code |
| `npm run web` | Open in a browser |
| `npm run android` / `npm run ios` | Emulator / simulator |
| `npm run publish:preview "msg"` | Push an OTA update to the preview channel |
| `npx tsc --noEmit` | Typecheck |

---

## How it fits together

```
App.tsx                     role-based navigation, OTA and push wiring
src/api/
  index.ts                  API client, token refresh, error handling
  AuthContext.tsx           who is signed in; drives which drawer shows
src/screens/
  worker/ manager/          one folder per role
  orgadmin/ sysadmin/
  client/ shared/
src/components/             shared UI, including the design system in ui/
src/theme/                  colours, spacing, type scale
src/hooks/                  OTA updates, push registration
```

**Roles are not chosen at login.** One form tries each account type in turn
and adopts whichever the backend recognises, so the person signing in never
picks a role and cannot pick the wrong one.

---

## When something breaks

**"No internet connection." on a real device**
Check the `[api] base URL` line in the console. If it says `localhost`, the
app is looking at the phone itself. Set `EXPO_PUBLIC_API_URL`, or use the LAN
address the backend prints at startup.

**Requests work on web but not on the phone**
Almost always the same thing — `localhost` means something different on each.

**An OTA update never arrives**
`runtimeVersion` must match between the build and the update. Confirm with
`npx eas-cli@latest update:list --branch preview`. Also make sure the app was
fully closed and reopened, not just backgrounded.

**Camera does nothing on web**
Expected. Barcode scanning is not supported there; use the manual entry field.

**Metro serving stale code**
```bash
npx expo start --clear
```
