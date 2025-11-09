import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, StatusBar } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

interface SplashScreenProps {
  onFinish: () => void;
}

export default function SplashScreen({ onFinish }: SplashScreenProps) {
  const fullText = 'Cash Flow Tracker';
  const [displayedText, setDisplayedText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    // Typing animation
    if (currentIndex < fullText.length) {
      const typingTimer = setTimeout(() => {
        setDisplayedText(fullText.substring(0, currentIndex + 1));
        setCurrentIndex(currentIndex + 1);
      }, 80); // 80ms per character for smooth typing

      return () => clearTimeout(typingTimer);
    } else {
      // After typing is complete, wait 500ms then transition
      const finishTimer = setTimeout(() => {
        onFinish();
      }, 500);

      return () => clearTimeout(finishTimer);
    }
  }, [currentIndex, onFinish]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0B0F13" />
      <Animated.View entering={FadeIn.duration(300)}>
        <Text style={styles.title}>
          {displayedText}
          {currentIndex < fullText.length && <Text style={styles.cursor}>|</Text>}
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0F13',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  cursor: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '300',
    opacity: 0.8,
  },
});
