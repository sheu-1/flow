# Sign-Out Debugging Guide

## Changes Made to Fix Sign-Out Issue

### 1. Fixed Recursive Call Bug
**File:** `src/services/AuthService.ts`

**Problem:** The `signOut` function in the AuthContext was calling itself instead of the API function.

**Fix:** 
- Renamed standalone function to `signOutApi()` for consistency
- Updated context's `signOut` to call `signOutApi()` instead of itself

### 2. Added Comprehensive Logging
Added detailed console logs at every step of the sign-out process:

**In AuthService.ts:**
```
[Auth] signOut called
[Auth] Calling Supabase signOut API...
[Auth] Supabase signOut successful
[Auth] Clearing session and user state...
[Auth] Sign out complete
```

**In SettingsScreen.tsx:**
```
[SettingsScreen] Sign out button pressed
[SettingsScreen] Sign out completed
```

**In ProfileScreen.tsx:**
```
[ProfileScreen] Sign out confirmed
[ProfileScreen] Sign out completed
```

**Auth State Listener:**
```
[Auth] onAuthStateChange: SIGNED_OUT
```

## How to Test

1. **Run the app:**
   ```bash
   npm start
   ```

2. **Sign in to the app** (with email/password or Google)

3. **Navigate to Settings or Profile screen**

4. **Click the "Sign Out" button**

5. **Watch the console logs** - you should see:
   ```
   [SettingsScreen] Sign out button pressed
   [Auth] signOut called
   [Auth] Calling Supabase signOut API...
   [Auth] Supabase signOut successful
   [Auth] Clearing session and user state...
   [Auth] Sign out complete
   [SettingsScreen] Sign out completed
   [Auth] onAuthStateChange: SIGNED_OUT
   ```

6. **Verify the app navigates back to the Auth screen**

## What to Check If It Still Doesn't Work

### 1. Check Console Logs
Look for which log messages appear and which don't:

- **If you see `[SettingsScreen] Sign out button pressed`** → Button is working
- **If you see `[Auth] signOut called`** → Context method is being called
- **If you see `[Auth] Calling Supabase signOut API...`** → API call is starting
- **If you see `[Auth] Supabase signOut successful`** → Supabase accepted the sign-out
- **If you see `[Auth] onAuthStateChange: SIGNED_OUT`** → Auth listener is working
- **If you DON'T see the Auth screen** → Navigation issue

### 2. Common Issues

**Issue: Button press not registered**
- Check if you see `[SettingsScreen] Sign out button pressed` in console
- If not, the TouchableOpacity might be blocked by another element

**Issue: API call fails**
- Look for error message: `[Auth] Sign out error:`
- Check network connection
- Verify Supabase is reachable

**Issue: Auth state not updating**
- Check if `[Auth] onAuthStateChange: SIGNED_OUT` appears
- Verify the auth listener is properly set up
- Check if session/user state is being cleared

**Issue: UI not updating**
- Verify `App.tsx` checks for `!user` to show AuthScreen
- Check if there's a loading state stuck at `true`
- Look at the `AppContainer` component logic

### 3. Manual Verification

Try signing out programmatically in the console:

```javascript
// In your browser console or React Native debugger
const { signOut } = require('./src/services/AuthService');
await signOut();
```

### 4. Check Supabase Dashboard

1. Go to your Supabase Dashboard
2. Navigate to **Authentication** → **Users**
3. Check if the user session is still active after sign-out
4. Look at **Logs** for any auth-related errors

## Expected Behavior

After clicking sign-out:
1. ✅ Loading state shows briefly
2. ✅ Supabase session is cleared
3. ✅ Local session/user state is cleared
4. ✅ Auth state change listener fires with `SIGNED_OUT` event
5. ✅ SMS listener stops
6. ✅ App navigates to AuthScreen
7. ✅ User can sign in again

## Code Changes Summary

### AuthService.ts
- Line 62: Renamed `signOut()` → `signOutApi()`
- Lines 410-427: Updated context `signOut` with logging and proper API call

### SettingsScreen.tsx
- Lines 180-194: Added async wrapper with error handling and logging

### ProfileScreen.tsx
- Lines 15-37: Added async wrapper in Alert confirmation with error handling

## Next Steps If Issue Persists

1. **Check for multiple AuthProviders** - Make sure there's only one `<AuthProvider>` in `App.tsx`

2. **Verify imports** - Ensure all screens import `useAuth` from the correct location

3. **Check for state persistence** - Look for any code that might be restoring the session from storage

4. **Test with fresh install** - Clear app data and reinstall to rule out cached state

5. **Check React Native debugger** - Enable remote debugging to see all console logs

6. **Verify Supabase client** - Ensure the Supabase client is properly initialized with the correct URL and key
