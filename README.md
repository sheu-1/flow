# Cashflow Tracker

A React Native (Expo + TypeScript) finance tracking app with a modern dark theme.

## Features

- **Dashboard**: View balance, income, and expenses overview
- **Transactions**: Browse transaction history with dummy data
- **Reports**: Placeholder for future charts and analytics
- **Settings**: Toggle notifications and other preferences

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

## Current Status

This is an MVP with dummy data only. Future enhancements will include:
- Database integration
- SMS parsing for transactions
- AI-powered insights
- Real charts and analytics
