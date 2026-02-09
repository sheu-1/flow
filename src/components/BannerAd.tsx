import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Animated, Platform } from 'react-native';
import { useThemeColors } from '../theme/ThemeProvider';
import { AdMobConfig } from '../services/AdMobService';
import { useNavigationState } from '@react-navigation/native';

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
    const slideAnim = React.useRef(new Animated.Value(0)).current;

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

    if (isAITab) return null;

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

