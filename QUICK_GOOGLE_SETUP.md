# Quick Google OAuth Setup (5 Minutes)

You're getting the "OAuth flow was dismissed" error because you need to set up Google Cloud Console credentials. Here's the fastest way to get it working:

## Step 1: Create Google Cloud Project (2 minutes)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "New Project" → Enter "Cashflow Tracker" → Create
3. Wait for project creation

## Step 2: Enable APIs (1 minute)

1. In your new project, go to **APIs & Services** → **Library**
2. Search for "Google+ API" → Enable
3. Search for "People API" → Enable

## Step 3: Configure OAuth Consent Screen (1 minute)

1. Go to **APIs & Services** → **OAuth consent screen**
2. Choose **External** → Create
3. Fill only required fields:
   - **App name**: Cashflow Tracker
   - **User support email**: Your email
   - **Developer contact**: Your email
4. Click **Save and Continue** (skip scopes, test users, summary)

## Step 4: Create Web Client ID (1 minute)

1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth 2.0 Client ID**
3. Choose **Web application**
4. **Name**: Cashflow Tracker Web
5. **Authorized redirect URIs** - Add these exact URLs:
   ```
   https://auth.expo.io/@alexsheunda/cashflow-tracker
   exp://localhost:8081/--/redirect
   exp://192.168.2.97:8081/--/redirect
   ```
6. Click **Create**
7. **Copy the Client ID** (looks like: `123456789-abc123.apps.googleusercontent.com`)

## Step 5: Update Your Code

Replace the Web Client ID in `src/services/GoogleAuthService.ts`:

```typescript
const GOOGLE_CLIENT_ID_WEB = 'YOUR_ACTUAL_CLIENT_ID_HERE.apps.googleusercontent.com';
```

## Step 6: Test

1. Save the file
2. Restart your Expo development server
3. Try "Continue with Google" again

## Expected Flow

1. Tap "Continue with Google"
2. Browser opens with Google sign-in
3. Sign in with your Google account
4. Browser redirects back to your app
5. You should see success in console logs

## If Still Not Working

### Check the redirect URI in logs:
Your logs show: `"redirectUri": "exp://192.168.2.97:8081/--/redirect"`

Make sure this EXACT URL is in your Google Cloud Console redirect URIs list.

### Common Issues:
- **Wrong redirect URI**: Must match exactly what's in the logs
- **Client ID typo**: Double-check you copied it correctly
- **Project not ready**: Wait 5-10 minutes after creating the project

### Debug Steps:
1. Check console logs for the exact `redirectUri`
2. Add that exact URI to Google Cloud Console
3. Make sure your Client ID doesn't contain "YOUR_" anymore

## Quick Test Command

After setup, test with:
```bash
# This should open your app
npx uri-scheme open "exp://192.168.2.97:8081/--/redirect" --android
```

## Production Setup Later

For production builds, you'll need separate Android/iOS client IDs, but this web client ID will work for all development testing in Expo Go.

The key is making sure the redirect URI in your Google Cloud Console matches exactly what you see in the logs!
