import { Platform, PermissionsAndroid, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SMS_PERMISSION_KEY = 'sms_permission_status';
const SMS_IMPORT_ENABLED_KEY = 'sms_import_enabled';

export type PermissionStatus = 'granted' | 'denied' | 'never_asked';

export class PermissionService {
  /**
   * Check if SMS permission has been granted
   */
  static async checkSmsPermission(): Promise<PermissionStatus> {
    if (Platform.OS !== 'android') {
      return 'denied'; // iOS doesn't support SMS reading
    }

    try {
      // Check current Android permission status
      const hasPermission = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.READ_SMS
      );

      if (hasPermission) {
        // Update our stored status if Android says we have permission
        await AsyncStorage.setItem(SMS_PERMISSION_KEY, 'granted');
        return 'granted';
      }

      // Check our stored status
      const storedStatus = await AsyncStorage.getItem(SMS_PERMISSION_KEY);
      return (storedStatus as PermissionStatus) || 'never_asked';
    } catch (error) {
      console.error('Error checking SMS permission:', error);
      return 'denied';
    }
  }

  /**
   * Request SMS permission with custom rationale
   */
  static async requestSmsPermission(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      // Show iOS alert
      Alert.alert(
        'SMS Import Not Available',
        'SMS import is only available on Android devices.',
        [{ text: 'OK' }]
      );
      return false;
    }

    try {
      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.READ_SMS,
        {
          title: 'SMS Access Permission',
          message: 'Cashflow Tracker needs access to your SMS messages to automatically track M-Pesa and bank transactions.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        }
      );

      const granted = result === PermissionsAndroid.RESULTS.GRANTED;
      const status: PermissionStatus = granted ? 'granted' : 'denied';
      
      // Store the result
      await AsyncStorage.setItem(SMS_PERMISSION_KEY, status);
      
      return granted;
    } catch (error) {
      console.error('Error requesting SMS permission:', error);
      await AsyncStorage.setItem(SMS_PERMISSION_KEY, 'denied');
      return false;
    }
  }

  /**
   * Ensure SMS permission is granted, request if needed
   */
  static async ensureSmsPermission(): Promise<boolean> {
    const currentStatus = await this.checkSmsPermission();
    
    if (currentStatus === 'granted') {
      return true;
    }

    if (currentStatus === 'denied') {
      // Permission was previously denied, offer a retry and await user's choice
      const retried = await new Promise<boolean>((resolve) => {
        Alert.alert(
          'SMS Permission Required',
          'SMS permission is required to import transactions. You can enable this in your Android system settings under Apps > Cashflow Tracker > Permissions.',
          [
            { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
            { 
              text: 'Try Again', 
              onPress: async () => {
                const ok = await this.requestSmsPermission();
                resolve(ok);
              }
            }
          ]
        );
      });
      return retried;
    }

    // Never asked before, request permission
    return await this.requestSmsPermission();
  }

  /**
   * Check if SMS import is enabled in settings
   */
  static async isSmsImportEnabled(): Promise<boolean> {
    try {
      const enabled = await AsyncStorage.getItem(SMS_IMPORT_ENABLED_KEY);
      return enabled === 'true';
    } catch (error) {
      console.error('Error checking SMS import setting:', error);
      return false;
    }
  }

  /**
   * Set SMS import enabled/disabled in settings
   */
  static async setSmsImportEnabled(enabled: boolean): Promise<void> {
    try {
      await AsyncStorage.setItem(SMS_IMPORT_ENABLED_KEY, enabled.toString());
    } catch (error) {
      console.error('Error setting SMS import setting:', error);
    }
  }

  /**
   * Initialize SMS permissions on first login
   */
  static async initializeSmsPermissions(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      return false;
    }

    const currentStatus = await this.checkSmsPermission();
    
    // Only auto-request on first time (never_asked)
    if (currentStatus === 'never_asked') {
      const granted = await this.requestSmsPermission();
      if (granted) {
        // Auto-enable SMS import if permission granted
        await this.setSmsImportEnabled(true);
      }
      return granted;
    }

    // If previously granted, ensure SMS import is enabled
    if (currentStatus === 'granted') {
      const importEnabled = await this.isSmsImportEnabled();
      if (!importEnabled) {
        await this.setSmsImportEnabled(true);
      }
      return true;
    }

    return false;
  }

  /**
   * Handle SMS import toggle from settings
   */
  static async handleSmsImportToggle(enable: boolean): Promise<boolean> {
    if (!enable) {
      // User is disabling SMS import
      await this.setSmsImportEnabled(false);
      return true;
    }

    // User is enabling SMS import
    const hasPermission = await this.ensureSmsPermission();
    
    if (hasPermission) {
      await this.setSmsImportEnabled(true);
      return true;
    } else {
      // Permission denied, don't enable the setting
      await this.setSmsImportEnabled(false);
      return false;
    }
  }

  /**
   * Get current permission and setting status for UI
   */
  static async getSmsStatus(): Promise<{
    permissionStatus: PermissionStatus;
    importEnabled: boolean;
    canImport: boolean;
  }> {
    const permissionStatus = await this.checkSmsPermission();
    const importEnabled = await this.isSmsImportEnabled();
    const canImport = Platform.OS === 'android' && permissionStatus === 'granted' && importEnabled;

    return {
      permissionStatus,
      importEnabled,
      canImport,
    };
  }
}
