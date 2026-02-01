import { Platform } from 'react-native';

// Handle Platform-specific imports
let TestIds: any = { BANNER: 'TestId', REWARDED: 'TestId', INTERSTITIAL: 'TestId' };

if (Platform.OS !== 'web') {
    try {
        const mobileAds = require('react-native-google-mobile-ads');
        TestIds = mobileAds.TestIds;
    } catch (e) {
        console.warn('Google Mobile Ads not available:', e);
    }
}

export const AdMobConfig = {
    // Test IDs provided by Google
    bannerId: __DEV__ ? TestIds.BANNER : (Platform.OS === 'ios' ? 'ca-app-pub-xxxxxxxxxxxxx/yyyyyyyyyy' : 'ca-app-pub-4169518296228923/9015226990'),
    rewardedId: __DEV__ ? TestIds.REWARDED : (Platform.OS === 'ios' ? 'ca-app-pub-xxxxxxxxxxxxx/aaaaaaaaaa' : 'ca-app-pub-4169518296228923/1323507021'),
    interstitialId: __DEV__ ? TestIds.INTERSTITIAL : (Platform.OS === 'ios' ? 'ca-app-pub-xxxxxxxxxxxxx/cccccccccc' : 'ca-app-pub-xxxxxxxxxxxxx/dddddddddd'),

    // Use TestIds.REWARDED for testing rewarded ads
    // Use TestIds.BANNER for testing banner ads
};

// When you have real IDs, replace the 'ca-app-pub-...' strings above.
// __DEV__ ensures you use Test Ads during development to avoid policy violations.

/**
 * ADMOB SETUP INSTRUCTIONS:
 * 1. Go to https://apps.admob.com/ and sign in.
 * 2. Click "Apps" -> "Add App" to create a new app for Android and iOS separately.
 * 3. Once created, go to "App Settings" to find your App ID (starts with ca-app-pub-...).
 *    - Update the `androidAppId` and `iosAppId` in your `app.json` file with these real IDs.
 * 4. Go to "Ad Units" in the sidebar to create new ad units:
 *    - Create a 'Banner' ad unit and copy its ID for `bannerId` below.
 *    - Create a 'Rewarded' ad unit for `rewardedId`.
 *    - Create an 'Interstitial' ad unit for `interstitialId`.
 * 5. Replace the placeholder strings above with your real Ad Unit IDs.
 * 
 * NOTE: Real ads may take a few hours to start appearing after you create the IDs.
 * ALWAYS keep test IDs enabled for development (__DEV__) to avoid getting your account banned.
 */
