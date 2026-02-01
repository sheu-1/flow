import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Animated, Platform } from 'react-native';
import { useThemeColors } from '../theme/ThemeProvider';
import { useSubscription } from '../contexts/SubscriptionContext';
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
    const { status } = useSubscription();
    const [visible, setVisible] = useState(false);
    const slideAnim = React.useRef(new Animated.Value(100)).current;

    useEffect(() => {
        // Only show if user is in 'rewarded' state
        const shouldShow = status?.isRewarded === true;

        if (shouldShow && !visible) {
            setVisible(true);
            Animated.spring(slideAnim, {
                toValue: 0,
                useNativeDriver: true,
                tension: 50,
                friction: 8,
            }).start();
        } else if (!shouldShow && visible) {
            Animated.timing(slideAnim, {
                toValue: 100,
                duration: 300,
                useNativeDriver: true,
            }).start(() => setVisible(false));
        }
    }, [status, visible]);

    if (!visible) return null;

    return (
        <Animated.View
            style={[
                styles.container,
                {
                    backgroundColor: colors.surface,
                    borderTopColor: colors.border,
                    transform: [{ translateY: slideAnim }],
                    // Adjust for bottom tabs + safe area to sit nicely
                    bottom: Platform.OS === 'ios' ? 70 : 60, // Sits above tab bar
                }
            ]}
        >
            <View style={styles.adContainer}>
                <AdMobBanner
                    unitId={AdMobConfig.bannerId}
                    size={BannerAdSize.BANNER}
                    requestOptions={{
                        requestNonPersonalizedAdsOnly: true,
                    }}
                />
            </View>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        left: 0,
        right: 0,
        // height: 60, // Auto height for banner
        borderTopWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 5,
        zIndex: 1000,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 4,
    },
    adContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
    },
});
