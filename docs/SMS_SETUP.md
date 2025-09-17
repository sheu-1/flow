# Android SMS Ingestion Setup (Expo + TypeScript)

This guide explains how to enable Android SMS reading and live listening in the Cashflow Tracker app.

Important: This feature is Android-only. iOS does not allow third-party apps to access SMS.

## Overview
- We use native modules:
  - `react-native-get-sms-android` to read existing inbox messages.
  - `react-native-android-sms-listener` to listen to new incoming SMS in real time.
- Managed workflow requires an Expo Dev Client or EAS Build because Expo Go cannot load custom native modules.
- Permissions are added in `app.json` and requested at runtime.

## Prerequisites
- Node 18 or 20
- Expo CLI
- Android SDK / emulator or a physical Android device
- Supabase project configured (EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY set)

## Install native packages

```
npm install react-native-get-sms-android react-native-android-sms-listener
```

These are native modules—Expo Go will not work. You need a Dev Client or a full build.

## Configure Android permissions
We already added the required permissions in `app.json`:

```
{
  "expo": {
    ...,
    "android": {
      ...,
      "permissions": [
        "READ_SMS",
        "RECEIVE_SMS"
      ]
    }
  }
}
```

Expo will place these in `AndroidManifest.xml` during prebuild.

## Build a development client (recommended)
A Dev Client lets you run your app with custom native modules during development.

1) If you haven't configured EAS yet:
```
npx eas login
npx eas build:configure
```

2) Build a dev client for Android:
```
npx eas build -p android --profile development
```

3) Install the resulting .apk/.aab on your device or emulator.

4) Start the Metro server and open the app with the dev client:
```
npx expo start --dev-client
```

Alternative (local prebuild):
```
npx expo prebuild
npx expo run:android
```
This generates the Android project locally and runs it. Note that you now manage native projects.

## Runtime permission and consent
- At runtime, we ask the user for explicit consent via an in-app prompt.
- We then request `READ_SMS` and `RECEIVE_SMS` using `PermissionsAndroid`.
- If denied, the feature stays off.

## How it works
- Toggle is in `src/screens/SettingsScreen.tsx`:
  - "Enable SMS transaction import (Android only)"
  - Stored in `AsyncStorage` under `settings:sms_ingest_enabled`.
  - When enabled:
    - Reads last 50 messages using `readRecentSms()`.
    - Starts a real-time listener using `startSmsListener()`.
- Parsing is in `src/utils/SMSParser.ts` with robust regex patterns and heuristics.
- Uploads structured transactions to Supabase via `src/services/SupabaseService.ts`:
  - Upserts by reference or by (amount + date within 5 minutes) to avoid duplicates.
  - Attaches `user_id` from Supabase session.

## Testing
- Parser: run the ad-hoc test runner in `src/utils/smsParser.test.ts` by importing and invoking `runSmsParserTests()` anywhere (e.g., in a temporary script) or via ts-node.
- App end-to-end:
  1) Ensure you are logged in (Supabase session present).
  2) Enable the SMS toggle in Settings and grant permission.
  3) The app parses the last 50 SMS and listens for new ones.
  4) Check your Supabase `transactions` table—rows must include your `user_id`.

## Production notes
- Keep parsing on-device. Only structured fields are sent to Supabase.
- Consider adding UI for reviewing messages before import if required.
- Background/headless import is not implemented in MVP; listener runs when app is foregrounded.

## If you prefer to stay fully Managed without Dev Client
Automated SMS import cannot work in Expo Go. As a temporary alternative, you can build a manual import UI that lets users paste SMS text into the app to parse and upload. The current implementation prioritizes the native module approach for best UX.
