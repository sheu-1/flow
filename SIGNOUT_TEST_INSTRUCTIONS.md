# Sign-Out Button Test Instructions

## Current Status

I've added extensive logging to the ProfileScreen sign-out button. If you're seeing NO logs at all, it means the button press isn't being registered.

## Changes Made

### ProfileScreen.tsx
Added multiple log points:
1. `[ProfileScreen] Button touch detected` - Fires on touch (onPressIn)
2. `[ProfileScreen] ===== SIGN OUT BUTTON PRESSED =====` - Fires when handleSignOut is called
3. `[ProfileScreen] Sign out confirmed in Alert` - Fires when you click "Sign Out" in the Alert
4. `[ProfileScreen] About to call signOut()...` - Right before calling the signOut function
5. `[ProfileScreen] Sign out completed successfully` - After successful sign-out

## How to Test

### Step 1: Restart the App
**IMPORTANT:** You MUST restart the app to pick up the code changes.

```bash
# Stop the current Metro bundler (Ctrl+C)
# Then restart
npm start
```

Or press `r` in the Metro bundler to reload.

### Step 2: Navigate to Profile
1. Open the app
2. Sign in if needed
3. Click the profile icon (person-circle icon) in the top right
4. You should see the Profile screen

### Step 3: Click Sign Out
1. Scroll down to the red "Sign Out" button at the bottom
2. Click it
3. Watch the console

### Expected Logs

If the button is working, you should see:

```
[ProfileScreen] Button touch detected
[ProfileScreen] ===== SIGN OUT BUTTON PRESSED =====
[ProfileScreen] User: your@email.com
[ProfileScreen] signOut function: function
```

Then an Alert dialog should appear asking "Are you sure you want to sign out?"

If you click "Sign Out" in the Alert:
```
[ProfileScreen] Sign out confirmed in Alert
[ProfileScreen] About to call signOut()...
[Auth] signOut called
[Auth] Calling Supabase signOut API...
[Auth] Supabase signOut successful
[Auth] Clearing session and user state...
[Auth] Sign out complete
[ProfileScreen] Sign out completed successfully
[Auth] onAuthStateChange: SIGNED_OUT
```

## Troubleshooting

### Issue 1: NO logs at all

**Possible causes:**
1. **App not restarted** - Code changes won't apply until you restart
2. **Wrong screen** - Make sure you're on the ProfileScreen (not ProfileDrawer or Settings)
3. **Button blocked** - Another element might be covering the button
4. **Console not visible** - Make sure you're looking at the right console

**Solutions:**
- Press `r` in Metro bundler to reload
- Or completely stop and restart: `npm start`
- Check you're on the correct screen (should say "Profile" at the top)
- Try clicking other buttons on the page to verify touch is working

### Issue 2: First log appears but not the others

If you see `[ProfileScreen] Button touch detected` but nothing else:
- The button is working but `handleSignOut` isn't being called
- This would be very unusual - check for JavaScript errors in console

### Issue 3: Alert doesn't appear

If you see the logs but no Alert dialog:
- Check if Alerts are blocked on your device/emulator
- Try testing on a different device

### Issue 4: Alert appears but "Sign Out" doesn't work

If the Alert shows but clicking "Sign Out" does nothing:
- Check for the log `[ProfileScreen] Sign out confirmed in Alert`
- If missing, the Alert button isn't working (very unusual)

### Issue 5: signOut function is undefined

If you see `signOut function: undefined`:
- The useAuth hook isn't returning signOut properly
- Check that AuthProvider is wrapping the app in App.tsx
- Verify the import path in ProfileScreen.tsx

## Alternative: Test from Settings Screen

The SettingsScreen also has a sign-out button with logging. Try that instead:

1. Navigate to Settings (if you have a settings screen)
2. Click the "Sign out" button
3. Check for `[SettingsScreen] Sign out button pressed` in console

## Manual Test

If nothing works, try calling signOut directly in the console:

```javascript
// Open React Native debugger console
// Type this:
const { useAuth } = require('./src/services/AuthService');
// This won't work in console, but you can add a test button
```

## Check Your Console

Make sure you're looking at the right console:
- **Expo Go**: Check the terminal where you ran `npm start`
- **iOS Simulator**: Check Xcode console or Metro bundler terminal
- **Android Emulator**: Check `adb logcat` or Metro bundler terminal
- **React Native Debugger**: Open the debugger and check the console tab

## Still Not Working?

If you've tried all of the above and still see NO logs:

1. **Verify the file was saved** - Check the file modification time
2. **Clear cache and restart**:
   ```bash
   npm start -- --reset-cache
   ```
3. **Check for build errors** - Look for red error screens
4. **Try a different button** - Test if ANY button on the Profile screen works
5. **Check device logs** - There might be a crash or error not showing in Metro

## Next Steps

Once you see the logs, we can determine exactly where the sign-out process is failing and fix it accordingly.
