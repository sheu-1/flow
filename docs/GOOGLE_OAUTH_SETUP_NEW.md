# Google OAuth Setup Guide with Deep Linking

This guide explains how to set up Google OAuth with PKCE flow and deep linking for your Cashflow Tracker app.

## Overview

The implementation uses:
- **expo-auth-session** with PKCE (Proof Key for Code Exchange) for security
- **expo-web-browser** for OAuth flow
- **Custom deep linking** (`myapp://`) for standalone builds
- **Expo Go compatibility** for development

## Step 1: Google Cloud Console Setup

### 1.1 Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Google+ API** and **Google OAuth2 API**

### 1.2 Configure OAuth Consent Screen

1. Navigate to **APIs & Services** > **OAuth consent screen**
2. Choose **External** user type
3. Fill in the required information:
   - **App name**: Cashflow Tracker
   - **User support email**: Your email
   - **Developer contact information**: Your email
4. Add scopes: `openid`, `profile`, `email`
5. Save and continue

### 1.3 Create OAuth 2.0 Client IDs

You need to create **three separate client IDs** for Android, iOS, and Web:

#### Android Client ID

1. Go to **APIs & Services** > **Credentials**
2. Click **Create Credentials** > **OAuth 2.0 Client ID**
3. Select **Android** as application type
4. **Package name**: `com.alexsheunda.cashflowtracker`
5. **SHA-1 certificate fingerprint**: 
   - For development: Get from `expo credentials:manager`
   - For production: Get from your keystore
6. Save the Client ID

#### iOS Client ID

1. Create another **OAuth 2.0 Client ID**
2. Select **iOS** as application type
3. **Bundle ID**: `com.alexsheunda.cashflowtracker`
4. Save the Client ID

#### Web Client ID

1. Create another **OAuth 2.0 Client ID**
2. Select **Web application** as application type
3. **Authorized redirect URIs**:
   ```
   https://auth.expo.io/@alexsheunda/cashflow-tracker
   http://localhost:19006
   myapp://redirect
   ```
4. Save the Client ID

## Step 2: Update Your Code

### 2.1 Add Client IDs to GoogleAuthService

Edit `src/services/GoogleAuthService.ts` and replace the placeholder client IDs:

```typescript
// Replace these with your actual client IDs from Google Cloud Console
const GOOGLE_CLIENT_ID_ANDROID = 'your-android-client-id.apps.googleusercontent.com';
const GOOGLE_CLIENT_ID_IOS = 'your-ios-client-id.apps.googleusercontent.com';
const GOOGLE_CLIENT_ID_WEB = 'your-web-client-id.apps.googleusercontent.com';
```

### 2.2 Verify app.json Configuration

Ensure your `app.json` has the correct configuration:

```json
{
  "expo": {
    "scheme": "myapp",
    "ios": {
      "bundleIdentifier": "com.alexsheunda.cashflowtracker"
    },
    "android": {
      "package": "com.alexsheunda.cashflowtracker"
    }
  }
}
```

## Step 3: Testing Deep Links

### 3.1 Install URI Scheme Testing Tool

```bash
npm install -g uri-scheme
```

### 3.2 Test Deep Links

#### For iOS Simulator:
```bash
npx uri-scheme open myapp://redirect --ios
```

#### For Android Emulator:
```bash
npx uri-scheme open myapp://redirect --android
```

#### For Physical Devices:
```bash
# iOS
npx uri-scheme open myapp://redirect --ios

# Android
adb shell am start -W -a android.intent.action.VIEW -d "myapp://redirect" com.alexsheunda.cashflowtracker
```

### 3.3 Test OAuth Flow

1. **Development (Expo Go)**:
   - Run `expo start`
   - Open in Expo Go
   - Tap "Continue with Google"
   - Should redirect to browser and back to Expo Go

2. **Production (Standalone Build)**:
   - Build with `eas build`
   - Install on device
   - Tap "Continue with Google"
   - Should redirect to browser and back to your app

## Step 4: Debugging

### 4.1 Enable Debug Logging

The GoogleAuthService includes debug logging. Check your console for:

```
Google OAuth Config: {
  clientId: "your-client-id...",
  redirectUri: "myapp://redirect",
  isDev: false,
  platform: "ios"
}
```

### 4.2 Common Issues

#### "Configuration error" message:
- Check that your redirect URIs in Google Cloud Console match exactly
- Verify client IDs are correct for each platform

#### "OAuth flow was cancelled":
- User cancelled the flow (normal behavior)
- Check if deep linking is working properly

#### "Failed to obtain access token":
- Client ID mismatch
- Redirect URI not authorized in Google Cloud Console

#### Deep link not working:
- Verify `scheme` in app.json matches your deep link
- Test with `uri-scheme` tool
- Check that app is installed and can handle the scheme

### 4.3 Debug Helper

You can use the debug helper in your app:

```typescript
import { googleAuthService } from '../services/GoogleAuthService';

// Log current configuration
console.log('Debug info:', googleAuthService.getDebugInfo());
```

## Step 5: Production Deployment

### 5.1 Update Redirect URIs

When deploying to production, add your production redirect URIs to Google Cloud Console:

```
# For standalone builds
myapp://redirect

# For Expo Go (development)
https://auth.expo.io/@your-username/your-app-slug

# For web builds
https://your-domain.com
```

### 5.2 Security Considerations

- Never commit client secrets to your repository
- Use different client IDs for development and production
- Regularly rotate your OAuth credentials
- Monitor OAuth usage in Google Cloud Console

## Step 6: Supabase Integration

The implementation automatically signs users into Supabase after Google OAuth success. Ensure your Supabase project has:

1. **Google OAuth provider enabled**
2. **Correct redirect URLs configured**
3. **Row Level Security (RLS) policies** for user data

## Troubleshooting Checklist

- [ ] Google Cloud Console project created
- [ ] OAuth consent screen configured
- [ ] Three client IDs created (Android, iOS, Web)
- [ ] Client IDs added to GoogleAuthService.ts
- [ ] Redirect URIs match in Google Cloud Console
- [ ] app.json has correct scheme and bundle identifiers
- [ ] Deep linking tested with uri-scheme tool
- [ ] Supabase Google OAuth provider configured

## Support

If you encounter issues:

1. Check the console logs for detailed error messages
2. Verify all client IDs and redirect URIs
3. Test deep linking separately from OAuth
4. Ensure Google Cloud Console APIs are enabled
5. Check Supabase OAuth configuration

The implementation supports both development (Expo Go) and production (standalone builds) without code changes.
