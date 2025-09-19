# Google OAuth Setup Guide

This guide walks you through setting up Google Sign-In for the Cashflow Tracker app.

## Prerequisites

- Google Cloud Console account
- Supabase project with authentication enabled
- Expo CLI installed

## Step 1: Google Cloud Console Configuration

### 1.1 Create OAuth Client IDs

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project or create a new one
3. Navigate to **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **OAuth 2.0 Client IDs**

### 1.2 Configure OAuth Consent Screen

If this is your first time, you'll need to configure the OAuth consent screen:

1. Choose **External** user type (unless you have a Google Workspace)
2. Fill in the required fields:
   - App name: "Cashflow Tracker"
   - User support email: Your email
   - Developer contact information: Your email
3. Add scopes (optional for basic auth):
   - `../auth/userinfo.email`
   - `../auth/userinfo.profile`
4. Add test users if in testing mode

### 1.3 Create Client IDs

Create **two** OAuth Client IDs:

#### Android Client ID:
- **Application type**: Android
- **Package name**: `com.alexsheunda.cashflowtracker`
- **SHA-1 certificate fingerprint**: 
  - For development: Get from `expo credentials:manager`
  - For production: Get from your release keystore

#### Web Client ID (for Expo):
- **Application type**: Web application
- **Name**: "Cashflow Tracker Web"
- **Authorized redirect URIs**:
  ```
  cashflowtracker://redirect
  https://auth.expo.io/@YOUR_EXPO_USERNAME/cashflow-tracker
  ```

## Step 2: Supabase Configuration

1. Go to your Supabase project dashboard
2. Navigate to **Authentication** → **Providers**
3. Find **Google** and click to configure
4. Enable the Google provider
5. Enter your **Web Client ID** and **Client Secret** from Google Cloud Console
6. Set **Redirect URL** to: `cashflowtracker://redirect`
7. Save the configuration
v 
## Step 3: App Configuration

The app is already configured with:

```json
// app.json
{
  "expo": {
    "scheme": "cashflowtracker",
    "android": {
      "package": "com.alexsheunda.cashflowtracker"
    }
  }
}
```

## Step 4: Testing

### Development with Expo Go:
```bash
npm install
npx expo start
```
- Scan QR code with Expo Go
- Google OAuth will redirect through Expo's servers

### Development with Dev Client:
```bash
npx eas build -p android --profile development
npx expo start --dev-client
```
- Install the dev client APK
- Direct deep linking to your app

## Step 5: Production Build

```bash
npx eas build -p android --profile production
```

Ensure your production build uses the same certificate fingerprint configured in Google Cloud Console.

## Troubleshooting

### Common Issues:

1. **"Invalid redirect URI"**
   - Verify redirect URIs in Google Cloud Console match exactly
   - Check for typos in the scheme name

2. **"Package name mismatch"**
   - Ensure package name in `app.json` matches Google Cloud Console
   - Verify Android Client ID configuration

3. **"Deep linking not working"**
   - Restart Expo development server after changing scheme
   - Clear Expo cache: `npx expo start --clear`

4. **"OAuth consent screen error"**
   - Ensure OAuth consent screen is properly configured
   - Add your email as a test user if in testing mode

### Debug Steps:

1. Check Expo logs for redirect URI being used:
   ```bash
   npx expo start --dev-client
   ```

2. Verify scheme registration:
   ```bash
   adb shell am start -W -a android.intent.action.VIEW -d "cashflowtracker://redirect" com.alexsheunda.cashflowtracker
   ```

3. Test redirect URI manually in browser:
   ```
   https://accounts.google.com/oauth/authorize?client_id=YOUR_CLIENT_ID&redirect_uri=cashflowtracker://redirect&response_type=code&scope=email%20profile
   ```

## Security Notes

- Never commit Google Client Secrets to version control
- Use environment variables for sensitive configuration
- Regularly rotate OAuth credentials
- Monitor OAuth usage in Google Cloud Console

## Support

If you encounter issues:
1. Check the [Expo Auth Session docs](https://docs.expo.dev/guides/authentication/#google)
2. Review [Supabase Auth docs](https://supabase.com/docs/guides/auth/social-login/auth-google)
3. Check Google Cloud Console audit logs for failed requests
