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
