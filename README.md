# Cashflow Tracker

A React Native (Expo + TypeScript) finance tracking app with a modern dark theme.

## Features

- **Dashboard**: View balance, income, and expenses overview
- **Transactions**: Browse transaction history with real or mock data
- **Reports**: Placeholder for future charts and analytics
- **Settings**: Toggle notifications and other preferences
- **Android SMS import**: Parse transaction alerts from device SMS and upload structured rows to Supabase (Android-only)

## Tech Stack

- React Native with Expo
- TypeScript
- React Navigation v6 (Bottom Tabs)
- Ionicons for tab icons

## UI Theme

- Dark background: `#121212`
- Card background: `#1e1e1e`
- Text: `#ffffff`
- Primary accent: `#4CAF50`

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npx expo start
   ```

3. Use the Expo Go app on your device or run on an emulator

## Project Structure

```
/src
  /components
    TransactionCard.tsx
  /screens
    DashboardScreen.tsx
    TransactionsScreen.tsx
    ReportsScreen.tsx
    SettingsScreen.tsx
App.tsx
```

## Android SMS Ingestion (Expo)

This project includes Android-only SMS ingestion using native modules to read and listen for SMS and upload parsed transactions to Supabase for the signed-in user.

Quick setup:
1. Install native packages:
   ```bash
   npm install react-native-get-sms-android react-native-android-sms-listener
   ```
2. Ensure Android permissions are present in `app.json` under `expo.android.permissions`:
   - `READ_SMS`
   - `RECEIVE_SMS`
3. Build a Dev Client and run:
   ```bash
   npx eas build -p android --profile development
   npx expo start --dev-client
   ```
4. In the app, go to `Settings` and enable "SMS Import (Android only)".

Detailed instructions: see [`docs/SMS_SETUP.md`](docs/SMS_SETUP.md).

## Google Sign-In Setup

This app supports Google OAuth authentication through Supabase. Follow these steps to configure it properly:

### 1. App Configuration

The app is configured with the scheme `cashflowtracker` in `app.json`:

```json
{
  "expo": {
    "scheme": "cashflowtracker",
    "android": {
      "package": "com.alexsheunda.cashflowtracker"
    }
  }
}
```

### 2. Google Cloud Console Setup

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client IDs"
5. Configure the OAuth consent screen if prompted
6. Create OAuth Client IDs for both platforms:

#### For Android:
- **Application type**: Android
- **Package name**: `com.alexsheunda.cashflowtracker`
- **SHA-1 certificate fingerprint**: Get this from your keystore

#### For Web (required for Expo):
- **Application type**: Web application
- **Authorized redirect URIs**:
  - `cashflowtracker://redirect`
  - `https://auth.expo.io/@your-username/cashflow-tracker` (replace with your Expo username)

### 3. Supabase Configuration

1. In your Supabase project dashboard, go to Authentication → Providers
2. Enable Google provider
3. Add your Google OAuth Client ID and Client Secret
4. Set the redirect URL to: `cashflowtracker://redirect`

### 4. Testing

#### With Expo Go:
- Use the web redirect URI: `https://auth.expo.io/@your-username/cashflow-tracker`
- Google OAuth will redirect through Expo's servers

#### With Dev Client:
- Use the custom scheme: `cashflowtracker://redirect`
- Direct deep linking to your app

### 5. Building for Production

When building for production, ensure:
1. Your Android app is signed with the same certificate used for the SHA-1 fingerprint
2. The package name matches exactly: `com.alexsheunda.cashflowtracker`
3. The redirect URI `cashflowtracker://redirect` is properly configured in Google Cloud Console

### Troubleshooting

- **"Invalid redirect URI"**: Ensure the redirect URI in Google Cloud Console exactly matches `cashflowtracker://redirect`
- **"Package name mismatch"**: Verify the package name in `app.json` matches the one in Google Cloud Console
- **Deep linking not working**: Restart the Expo development server after changing the scheme in `app.json`
