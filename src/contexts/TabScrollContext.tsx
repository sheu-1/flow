import React, { createContext, useContext, useRef } from 'react';
import { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { useSharedValue, SharedValue, withTiming, useAnimatedScrollHandler } from 'react-native-reanimated';

interface TabScrollContextType {
    tabBarTranslateY: SharedValue<number>;
    onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
}

const TabScrollContext = createContext<TabScrollContextType | undefined>(undefined);

export const TAB_BAR_HEIGHT = 60; // Approximate height of tab bar + safe area bottom

export const TabScrollProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const tabBarTranslateY = useSharedValue(0);
    const lastContentOffset = useSharedValue(0);
    const isScrolling = useSharedValue(false);

    const scrollHandler = useAnimatedScrollHandler({
        onScroll: (event) => {
            const currentOffset = event.contentOffset.y;
            const diff = currentOffset - lastContentOffset.value;

            // Only animate if scrolling significantly and content is tall enough
            if (Math.abs(diff) > 2 && event.contentSize.height > event.layoutMeasurement.height) {
                if (diff > 0 && currentOffset > 10) {
                    // Scrolling down -> Hide tab bar (move it down)
                    tabBarTranslateY.value = withTiming(TAB_BAR_HEIGHT, { duration: 300 });
                } else if (diff < 0) {
                    // Scrolling up -> Show tab bar (move it up/reset)
                    tabBarTranslateY.value = withTiming(0, { duration: 300 });
                }
            }
            lastContentOffset.value = currentOffset;
        },
        onBeginDrag: () => {
            isScrolling.value = true;
        },
        onEndDrag: () => {
            isScrolling.value = false;
        },
    });

    return (
        <TabScrollContext.Provider value={{ tabBarTranslateY, onScroll: scrollHandler }}>
            {children}
        </TabScrollContext.Provider>
    );
};

export const useTabScroll = () => {
    const context = useContext(TabScrollContext);
    if (!context) {
        throw new Error('useTabScroll must be used within a TabScrollProvider');
    }
    return context;
};
