import { PermissionsAndroid, Platform } from 'react-native';

export async function requestSmsPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  try {
    // Request READ_SMS with rationale
    const readGranted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.READ_SMS,
      {
        title: 'SMS Access Required',
        message: 'Allow Cashflow Tracker to access SMS to automatically log your transactions',
        buttonNeutral: 'Ask Me Later',
        buttonNegative: 'Deny',
        buttonPositive: 'Allow',
      }
    );

    // Request RECEIVE_SMS with rationale
    const receiveGranted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.RECEIVE_SMS,
      {
        title: 'SMS Access Required',
        message: 'Allow Cashflow Tracker to access SMS to automatically log your transactions',
        buttonNeutral: 'Ask Me Later',
        buttonNegative: 'Deny',
        buttonPositive: 'Allow',
      }
    );

    const readOk = readGranted === PermissionsAndroid.RESULTS.GRANTED;
    const recvOk = receiveGranted === PermissionsAndroid.RESULTS.GRANTED;
    return !!(readOk && recvOk);
  } catch (e) {
    console.warn('[SMS] Permission request failed', e);
    return false;
  }
}
