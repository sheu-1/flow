import React, { useState } from 'react';
import { SafeAreaView, ScrollView, View, Text, StyleSheet } from 'react-native';
import { useThemeColors } from '../theme/ThemeProvider';
import { useAuth } from '../hooks/useAuth';
import { AggregatePeriod } from '../types';
import AIAccountantPanel from '../components/AIAccountantPanel';
import { spacing } from '../theme/colors';

export default function AIAccountantScreen() {
  const colors = useThemeColors();
  const { user } = useAuth();
  const [period] = useState<AggregatePeriod>('monthly');

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}> 
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.lg }} showsVerticalScrollIndicator={false}>
        <View style={{ paddingHorizontal: spacing.md, paddingTop: spacing.xl }}>
          <Text style={[styles.title, { color: colors.text }]}>AI Accountant</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Ask about your spending, savings and budgets. The AI uses your entire app data only.</Text>
        </View>
        {user?.id ? (
          <AIAccountantPanel userId={user.id} period={period} />
        ) : (
          <View style={{ paddingHorizontal: spacing.md }}>
            <Text style={{ color: colors.textSecondary }}>Sign in to use the AI accountant.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: { fontSize: 24, fontWeight: '700' },
  subtitle: { marginTop: 4 },
});
