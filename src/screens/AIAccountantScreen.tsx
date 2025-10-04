import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../hooks/useAuth';
import { useThemeColors } from '../theme/ThemeProvider';
import { AggregatePeriod } from '../types';
import AIAccountantPanel from '../components/AIAccountantPanel';

export default function AIAccountantScreen() {
  const { user } = useAuth();
  const colors = useThemeColors();
  const [period] = useState<AggregatePeriod>('monthly');

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* AI Assistant Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={styles.headerContent}>
          <View style={[styles.iconContainer, { backgroundColor: colors.primary + '20' }]}>
            <Ionicons name="sparkles" size={24} color={colors.primary} />
          </View>
          <View style={styles.headerText}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>AI Assistant</Text>
            <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
              Your personal financial advisor powered by AI
            </Text>
          </View>
        </View>
      </View>

      {user?.id ? (
        <AIAccountantPanel userId={user.id} period={period} />
      ) : (
        <View style={styles.signInPrompt}>
          <Text style={[styles.signInText, { color: colors.textSecondary }]}>Sign in to use the AI accountant.</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
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
