import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import Animated, { useAnimatedStyle, withTiming, useSharedValue } from 'react-native-reanimated';
import { useThemeColors } from '../theme/ThemeProvider';
import { AdMobConfig } from '../services/AdMobService';
import { useNavigationState } from '@react-navigation/native';
import { useTabScroll } from '../contexts/TabScrollContext';

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

    // Get scroll context - safeguard against missing context if used outside provider
    let tabBarTranslateY: any;
    try {
        const context = useTabScroll();
        tabBarTranslateY = context.tabBarTranslateY;
    } catch (e) {
        // Fallback if not inside provider
        tabBarTranslateY = useSharedValue(0);
    }

    // Get current tab name from navigation state
    const currentRouteName = useNavigationState((state) => {
        if (!state || !state.routes || state.routes.length === 0) return '';
        const route = state.routes[state.index];
        // Check if we're in a nested navigator (MainTabs)
        if (route.state && route.state.routes) {
            const nestedState = route.state as any;
            return nestedState.routes[nestedState.index]?.name || '';
        }
        return route.name || '';
    });

    // Hide banner on AI tab
    const isAITab = currentRouteName === 'AI';

    const animatedStyle = useAnimatedStyle(() => {
        return {
            transform: [
                {
                    translateY: tabBarTranslateY.value,
                },
            ],
        };
    });

    if (isAITab) return null;

    return (
        <Animated.View
            style={[
                styles.container,
                animatedStyle,
                {
                    backgroundColor: colors.surface,
                    borderTopColor: colors.border,
                    // If ad hasn't loaded yet, we might want to hide it or show placeholder
                    // For now keeping it visible but collapsed if adFailed is true (handled above)
                    height: adLoaded ? 'auto' : 0,
                    opacity: adLoaded ? 1 : 0,
                    overflow: 'hidden', // Ensure collapsed ad does not overlap
                    bottom: Platform.OS === 'ios' ? 80 : 70, // Sits above tab bar (approx 50-60px height + spacing)
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
                    onAdLoaded={() => {
                        // console.log('Banner Ad Loaded');
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
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        left: 0,
        right: 0,
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

