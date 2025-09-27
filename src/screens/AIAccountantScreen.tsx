import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
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
