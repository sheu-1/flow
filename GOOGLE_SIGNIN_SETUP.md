# Google Sign-In Setup Guide

This guide will help you configure Google Sign-In for your Cashflow Tracker app using Supabase.

## ✅ What's Already Done

- ✅ Google OAuth implementation in `AuthService.ts`
- ✅ Google Sign-In button added to `AuthScreen.new.tsx`
- ✅ OAuth scheme configured in `app.json`
- ✅ Required dependencies installed (`expo-auth-session`, `expo-web-browser`)

## 🔧 Configuration Steps

### 1. Configure Supabase Authentication

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project: `mquwuf1dsbcbkdt4`
3. Navigate to **Authentication** → **Providers**
4. Enable **Google** provider
5. You'll need to provide:
   - **Client ID** (from Google Cloud Console)
   - **Client Secret** (from Google Cloud Console)

### 2. Set Up Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable **Google+ API** and **Google Identity Services**
4. Go to **APIs & Services** → **Credentials**
5. Click **Create Credentials** → **OAuth 2.0 Client ID**

#### Create OAuth Credentials for Each Platform:

**For Android:**
- Application type: **Android**
- Package name: `com.alexsheunda.cashflowtracker`
- SHA-1 certificate fingerprint: Get this by running:
  ```bash
  # For development (Expo Go)
  keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
  
  # For production
  keytool -list -v -keystore your-release-key.keystore -alias your-key-alias
  ```

**For iOS:**
- Application type: **iOS**
- Bundle ID: `com.alexsheunda.cashflowtracker`

**For Web (Development):**
- Application type: **Web application**
- Authorized redirect URIs: Add your Supabase callback URL (see step 3)

### 3. Configure Redirect URLs in Supabase

When you run the app, check the console logs. You'll see output like:

```
=== GOOGLE AUTH DEBUG ===
Environment: Expo Go
Redirect URI: exp://192.168.1.100:8081/--/auth-callback
========================
⚠️ IMPORTANT: Add this URL to Supabase Dashboard:
   Authentication > URL Configuration > Redirect URLs
   Add: exp://192.168.1.100:8081/--/auth-callback
========================
```

**Add these redirect URLs to Supabase:**

1. Go to **Authentication** → **URL Configuration** in Supabase Dashboard
2. Add the following to **Redirect URLs**:
   - For Expo Go development: `exp://[YOUR_IP]:8081/--/auth-callback`
   - For standalone builds: `cashflowtracker://auth-callback`
   - For production: Your production redirect URL

**Also add to Google Cloud Console:**
1. Go to your OAuth 2.0 Client ID in Google Cloud Console
2. Add the same redirect URLs to **Authorized redirect URIs**
3. Additionally add your Supabase callback URL:
   - `https://mquwuf1dsbcbkdt4.supabase.co/auth/v1/callback`

### 4. Update Supabase with Google Credentials

1. Go back to Supabase Dashboard → **Authentication** → **Providers** → **Google**
2. Enter your **Client ID** and **Client Secret** from Google Cloud Console
3. Click **Save**

### 5. Test the Implementation

1. Start your Expo development server:
   ```bash
   npm start
   ```

2. Open the app on your device or emulator

3. Navigate to the Auth screen

4. Click **Continue with Google**

5. Check the console for debug logs showing the OAuth flow

## 🔍 Troubleshooting

### Common Issues:

**1. "Unable to start Google sign-in"**
- Ensure Google provider is enabled in Supabase
- Check that Client ID and Secret are correctly configured

**2. "Failed to get authentication credentials from Google"**
- Verify redirect URLs match exactly in both Supabase and Google Cloud Console
- Check console logs for the actual redirect URI being used
- Ensure the redirect URI is added to both platforms

**3. "Google sign-in was cancelled"**
- This is normal if the user closes the browser
- No action needed

**4. Session not persisting**
- Check that you're using PKCE flow (authorization code)
- Verify `access_type: 'offline'` is set in the OAuth request
- Ensure refresh tokens are being returned

### Debug Logs

The implementation includes extensive logging. Check your console for:
- ✅ Successful session creation
- ⚠️ Warnings about missing refresh tokens
- ❌ Errors in the OAuth flow

## 📱 Platform-Specific Notes

### Expo Go (Development)
- Uses dynamic redirect URI based on your local IP
- Redirect URI changes if your IP changes
- Update Supabase redirect URLs accordingly

### Standalone Builds
- Uses fixed scheme: `cashflowtracker://auth-callback`
- More reliable for production
- Add this to Supabase redirect URLs before building

### iOS
- May require additional configuration in `Info.plist` for custom URL schemes
- Expo handles this automatically with the `scheme` in `app.json`

### Android
- May require SHA-1 fingerprint in Google Cloud Console
- Ensure package name matches exactly: `com.alexsheunda.cashflowtracker`

## 🔐 Security Best Practices

1. **Never commit credentials** - Keep Client ID and Secret in Supabase only
2. **Use PKCE flow** - Already implemented for better security
3. **Validate redirect URIs** - Only add trusted URIs to both platforms
4. **Monitor auth logs** - Check Supabase auth logs regularly

## 📚 Additional Resources

- [Supabase Auth with Google](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Expo Auth Session](https://docs.expo.dev/versions/latest/sdk/auth-session/)
- [Google OAuth 2.0](https://developers.google.com/identity/protocols/oauth2)

## ✨ Next Steps

After setup is complete:
1. Test sign-in on both iOS and Android
2. Test sign-out functionality
3. Verify user profile creation in Supabase
4. Test session persistence across app restarts
5. Build and test standalone app before production release
