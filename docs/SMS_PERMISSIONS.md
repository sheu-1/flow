# SMS Permissions and Import Setup

This document explains how SMS permissions work in the Cashflow Tracker app and how to set up SMS import functionality.

## Overview

The Cashflow Tracker app can automatically import transaction data from SMS messages sent by banks and mobile money services like M-Pesa. This feature is **Android-only** due to platform restrictions.

## How SMS Import Works

### First-Time Setup
1. **Automatic Permission Request**: When you log in for the first time, the app will automatically check if SMS permissions are needed
2. **User Consent**: If you haven't granted SMS permission before, you'll see a system dialog asking for permission
3. **Permission Dialog**: The dialog will show:
   ```
   SMS Access Permission
   
   Cashflow Tracker needs access to your SMS messages to automatically 
   track M-Pesa and bank transactions.
   
   [Ask Me Later] [Cancel] [OK]
   ```

### Settings Control
- Navigate to **Settings** → **SMS Import (Android only)**
- Toggle **"Enable SMS transaction import"** on/off
- The app remembers your preference and permission status

### Permission States
- **Never Asked**: First time - app will show permission dialog
- **Granted**: SMS import works automatically
- **Denied**: App won't auto-prompt again, but you can retry from settings

## Privacy and Security

### What We Access
- **SMS Messages**: Only to detect transaction alerts from banks/M-Pesa
- **Local Processing**: All SMS parsing happens on your device
- **No Raw Data**: Raw SMS text is never sent off your device

### What We Store
- **Structured Data Only**: Amount, date, category, description
- **Cloud Storage**: Only processed transaction data is stored in Supabase
- **User Control**: You can clear all imported transactions anytime

## Platform Support

### Android ✅
- Full SMS import functionality
- Automatic transaction detection
- Real-time SMS monitoring
- Permission management

### iOS ❌
- SMS import not available
- Platform restriction by Apple
- Manual transaction entry only

## Troubleshooting

### Permission Denied
If you denied SMS permission and want to enable it:

1. **From Settings**: Toggle "Enable SMS Import" → "Try Again"
2. **System Settings**: Go to Android Settings → Apps → Cashflow Tracker → Permissions → SMS → Allow

### Not Working
If SMS import isn't working:

1. **Check Permission**: Settings → SMS Import → ensure toggle is ON
2. **Android Settings**: Verify SMS permission is granted in system settings
3. **Restart App**: Close and reopen the app
4. **Clear & Re-enable**: Turn off SMS import, then turn it back on

### Supported SMS Formats
The app currently recognizes transaction messages from:
- M-Pesa (Safaricom)
- Major Kenyan banks
- Standard transaction alert formats

## Technical Implementation

### Files Involved
- `src/services/PermissionService.ts` - Permission management
- `src/screens/SettingsScreen.tsx` - UI controls
- `src/services/SmsService.ts` - SMS processing
- `src/services/AuthService.ts` - First-time initialization

### Permission Flow
1. **Check Status**: `PermissionService.checkSmsPermission()`
2. **Request Permission**: `PermissionService.ensureSmsPermission()`
3. **Store Result**: AsyncStorage persistence
4. **Initialize on Login**: Automatic setup for new users

### Storage Keys
- `sms_permission_status`: 'granted' | 'denied' | 'never_asked'
- `sms_import_enabled`: 'true' | 'false'

## Developer Notes

### Testing
- Test on physical Android device (SMS not available in emulator)
- Use different permission states to test all flows
- Verify permission persistence across app restarts

### Adding New SMS Formats
1. Update `src/utils/SMSParser.ts` with new patterns
2. Test with real SMS messages
3. Ensure privacy compliance (no raw SMS storage)

## Support

If you encounter issues with SMS import:
1. Check this documentation
2. Verify your Android version supports SMS permissions
3. Ensure the app has the latest updates
4. Contact support with specific error messages
