import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useThemeColors } from '../theme/ThemeProvider';
import { AggregatePeriod } from '../types';
import { spacing } from '../theme/colors';
import AIAccountantPanel from '../components/AIAccountantPanel';
import { useAuth } from '../hooks/useAuth';

export default function AIAccountantScreen() {
  const { user } = useAuth();
  const colors = useThemeColors();
  const [period] = useState<AggregatePeriod>('monthly');

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header harmonized with Dashboard */}
      <Animated.View style={[styles.header, { backgroundColor: colors.background }]} entering={FadeInUp.springify()}> 
        <View style={styles.headerContent}>
          <View style={[styles.iconContainer, { backgroundColor: colors.primary + '20' }]}>
            <Ionicons name="sparkles" size={24} color={colors.primary} />
          </View>
          <View style={styles.headerText}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>AI Assistant</Text>
            <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>Your personal financial advisor</Text>
          </View>
        </View>
      </Animated.View>

      {user?.id ? (
        <AIAccountantPanel userId={user.id} period={period} />
      ) : (
        <View style={styles.signInPrompt}>
          <Text style={[styles.signInText, { color: colors.textSecondary }]}>Sign in to use the AI accountant.</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 14,
    lineHeight: 18,
  },
  signInPrompt: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  signInText: {
    fontSize: 16,
    textAlign: 'center',
  },
});
