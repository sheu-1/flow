import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { useThemeColors } from '../theme/ThemeProvider';
import { AdMobConfig } from '../services/AdMobService';

// Dynamically load AdMob for native only
let AdMobBanner: any = null;
let BannerAdSize: any = null;

if (Platform.OS !== 'web') {
    try {
        const mobileAds = require('react-native-google-mobile-ads');
        AdMobBanner = mobileAds.BannerAd;
        BannerAdSize = mobileAds.BannerAdSize;
    } catch (e) {
        // Safe to ignore on web or if module missing
    }
}

export const BannerAd: React.FC = () => {
    // Early exit for web or if AdMob missing
    if (Platform.OS === 'web' || !AdMobBanner) return null;

    const colors = useThemeColors();
    const [adLoaded, setAdLoaded] = useState(false);
    const [adFailed, setAdFailed] = useState(false);
    const [retryKey, setRetryKey] = useState(0);

    // Retry mechanism: if ad fails, force a re-mount after a delay to try again
    useEffect(() => {
        let timeout: NodeJS.Timeout;
        if (adFailed) {
            timeout = setTimeout(() => {
                // Increment key to force remount
                setRetryKey(k => k + 1);
                setAdFailed(false);
            }, 30000); // Retry after 30 seconds
        }
        return () => clearTimeout(timeout);
    }, [adFailed]);

    return (
        <View
            style={[
                styles.container,
                {
                    backgroundColor: colors.surface,
                    borderTopColor: colors.border,
                    height: adLoaded ? 'auto' : 0,
                    opacity: adLoaded ? 1 : 0,
                    overflow: 'hidden',
                }
            ]}
        >
            <View style={styles.adContainer}>
                <AdMobBanner
                    key={`banner-${retryKey}`}
                    unitId={AdMobConfig.bannerId}
                    size={BannerAdSize.BANNER}
                    requestOptions={{
                        requestNonPersonalizedAdsOnly: true,
                    }}
                    onAdLoaded={() => {
                        setAdLoaded(true);
                        setAdFailed(false);
                    }}
                    onAdFailedToLoad={(error: any) => {
                        console.warn('Banner Ad Failed to Load:', error);
                        setAdFailed(true);
                        setAdLoaded(false);
                    }}
                />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 4,
        marginTop: 16,
        marginBottom: 8,
        borderTopWidth: 1,
    },
    adContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
    },
});

