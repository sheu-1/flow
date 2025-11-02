import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { useThemeColors } from '../theme/ThemeProvider';
import { spacing, fontSize, borderRadius } from '../theme/colors';

export default function WelcomeScreen() {
  const colors = useThemeColors();
  const navigation = useNavigation();

  const handleGetStarted = () => {
    // Navigate to subscription screen
    navigation.navigate('Subscription' as never);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <View style={styles.content}>
        {/* Success Icon */}
        <Animated.View 
          entering={FadeInDown.delay(200).springify()}
          style={[styles.iconContainer, { backgroundColor: colors.success + '20' }]}
        >
          <Ionicons name="checkmark-circle" size={80} color={colors.success} />
        </Animated.View>

        {/* Thank You Message */}
        <Animated.View 
          entering={FadeInUp.delay(400).springify()}
          style={styles.textContainer}
        >
          <Text style={[styles.title, { color: colors.text }]}>
            Thank You for Signing Up! 🎉
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Welcome to Cashflow Tracker. We're excited to help you take control of your finances!
          </Text>
        </Animated.View>

        {/* Features List */}
        <Animated.View 
          entering={FadeInUp.delay(600).springify()}
          style={styles.featuresContainer}
        >
          <View style={styles.featureItem}>
            <Ionicons name="phone-portrait-outline" size={24} color={colors.primary} />
            <Text style={[styles.featureText, { color: colors.text }]}>
              Automatic SMS transaction tracking
            </Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="analytics-outline" size={24} color={colors.primary} />
            <Text style={[styles.featureText, { color: colors.text }]}>
              Smart insights and reports
            </Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="sparkles-outline" size={24} color={colors.primary} />
            <Text style={[styles.featureText, { color: colors.text }]}>
              AI-powered financial advice
            </Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="shield-checkmark-outline" size={24} color={colors.primary} />
            <Text style={[styles.featureText, { color: colors.text }]}>
              Secure and private
            </Text>
          </View>
        </Animated.View>

        {/* Trial Badge */}
        <Animated.View 
          entering={FadeInUp.delay(800).springify()}
          style={[styles.trialBadge, { backgroundColor: colors.primary + '15' }]}
        >
          <Ionicons name="gift-outline" size={20} color={colors.primary} />
          <Text style={[styles.trialText, { color: colors.primary }]}>
            Start with a 14-day free trial!
          </Text>
        </Animated.View>

        {/* Get Started Button */}
        <Animated.View 
          entering={FadeInUp.delay(1000).springify()}
          style={styles.buttonContainer}
        >
          <TouchableOpacity
            style={[styles.getStartedButton, { backgroundColor: colors.primary }]}
            onPress={handleGetStarted}
            activeOpacity={0.8}
          >
            <Text style={[styles.buttonText, { color: colors.background }]}>
              Let's Get Started
            </Text>
            <Ionicons name="arrow-forward" size={20} color={colors.background} />
          </TouchableOpacity>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  subtitle: {
    fontSize: fontSize.md,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: spacing.md,
  },
  featuresContainer: {
    width: '100%',
    marginBottom: spacing.xl,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
  },
  featureText: {
    fontSize: fontSize.md,
    marginLeft: spacing.md,
    flex: 1,
  },
  trialBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 999,
    marginBottom: spacing.xl,
  },
  trialText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    marginLeft: spacing.sm,
  },
  buttonContainer: {
    width: '100%',
  },
  getStartedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.lg,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  buttonText: {
    fontSize: fontSize.lg,
    fontWeight: 'bold',
    marginRight: spacing.sm,
  },
});
