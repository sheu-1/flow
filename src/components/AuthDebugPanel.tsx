import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../theme/ThemeProvider';

export const AuthDebugPanel: React.FC = () => {
  const { user, session, loading } = useAuth();
  const { colors } = useTheme();

  if (__DEV__) {
    return (
      <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.text }]}>🔍 Auth Debug Info</Text>
        <Text style={[styles.item, { color: colors.textSecondary }]}>
          Loading: {loading ? '✅ Yes' : '❌ No'}
        </Text>
        <Text style={[styles.item, { color: colors.textSecondary }]}>
          User: {user ? `✅ ${user.email}` : '❌ None'}
        </Text>
        <Text style={[styles.item, { color: colors.textSecondary }]}>
          Session: {session ? '✅ Active' : '❌ None'}
        </Text>
      </View>
    );
  }

  return null;
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    right: 10,
    padding: 8,
    borderRadius: 4,
    borderWidth: 1,
    minWidth: 150,
  },
  title: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  item: {
    fontSize: 10,
    marginBottom: 2,
  },
});
